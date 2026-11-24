import React, { useState, useEffect, useCallback } from 'react';
import type { DeviceAuthService, LinkedUser } from '../lib/auth/device-auth';
import type { PinLockout, LockoutStatus } from '../lib/auth/pin-lockout';
import type { SessionInactivityTracker } from '../lib/auth/session-inactivity';
import { PinKeypad } from './PinKeypad';
import { ChangePinFlow } from './ChangePinFlow';
import { BalancesView } from './BalancesView';
import { CuentasView } from './CuentasView';
import { VehiculosView, type FiltroEstado } from './VehiculosView';
import { CompraVehiculoView } from './CompraVehiculoView';
import { VenderVehiculoView } from './VenderVehiculoView';
import { RegistrarGastoView, type CategoriaGasto } from './RegistrarGastoView';
import { MovimientosView } from './MovimientosView';
import { MoverPlataView } from './MoverPlataView';
import { PasarPlataView } from './PasarPlataView';
import { PendientesAsignarView } from './PendientesAsignarView';
import { AsignarGastoView } from './AsignarGastoView';
import { GananciaMensualView } from './GananciaMensualView';
import { GananciaDetalleMesView } from './GananciaDetalleMesView';
import { comprimirFotoEnNavegador } from '../lib/vehiculos/comprimir-foto';
import { CuotasPorCobrarView, contarVencidas } from './CuotasPorCobrarView';
import { CobrarCuotaView } from './CobrarCuotaView';
import { formatMoney } from '../lib/format/money';
import { MovimientoSocioView } from './MovimientoSocioView';
import type { VehiculosService, VehiculoItem, DetalleVehiculo, MovimientoItem, VistaPreviaAnulacion, PendientesResult, PendienteAsignar, CuotaPorCobrar, MesGanancia, DetalleMesGanancia } from '../lib/vehiculos/vehiculos-service';
import { TAMANO_PAGINA_MOVIMIENTOS } from '../lib/vehiculos/vehiculos-service';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import { CargarStockView } from './CargarStockView';
import { Cargando } from './ui/Cargando';
import { ErrorReintentar } from './ui/ErrorReintentar';
import { Dialogo } from './ui/Dialogo';
import { Boton } from './ui/Boton';
import { BarraNavegacion } from './ui/BarraNavegacion';
import { MasView } from './MasView';
import { InicioView } from './InicioView';
import { useNavegacion, type Vista, type Pestana } from '../lib/navegacion/useNavegacion';
import type { CuentasService, CuentaItem } from '../lib/cuentas/cuentas-service';

export interface AuthFlowProps {
  authService: DeviceAuthService;
  lockout: PinLockout;
  inactivity: SessionInactivityTracker;
  cuentasService?: CuentasService;
  vehiculosService?: VehiculosService;
  comprimirFoto?: (foto: Blob) => Promise<Blob>;
}

export const AuthFlow: React.FC<AuthFlowProps> = ({
  authService,
  lockout,
  inactivity,
  cuentasService,
  vehiculosService,
  comprimirFoto,
}) => {
  const [isLinked, setIsLinked] = useState<boolean>(() => authService.isDeviceLinked());
  const [linkedUser, setLinkedUser] = useState<LinkedUser | null>(() => authService.getLinkedUser());
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => inactivity.isUnlocked());
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus>(() => lockout.getStatus());
  const [pinError, setPinError] = useState<boolean>(false);
  const [mostrarConfirmarOlvidePin, setMostrarConfirmarOlvidePin] = useState<boolean>(false);
  const { vista: currentView, ir, volver, reemplazar, irAPestana } = useNavegacion({
    isUnlocked,
    // Al abrir la app se entra a Vehículos: es la pantalla de todos los días
    vistaInicial: 'vehiculos',
  });
  const setCurrentView = (v: Vista) => ir(v);
  const [detalleVehiculo, setDetalleVehiculo] = useState<DetalleVehiculo | null>(null);
  const [fotoDetalle, setFotoDetalle] = useState<string | null>(null);

  const [idDetalle, setIdDetalle] = useState<string | null>(null);
  const [detalleError, setDetalleError] = useState<boolean>(false);
  // Lo que se anula con la compra, para el aviso "¿Seguro?" del detalle
  const [vistaPreviaDetalle, setVistaPreviaDetalle] = useState<VistaPreviaAnulacion | undefined>(undefined);
  // Autos recibidos en la venta del detalle, para el aviso de anular la venta
  // Ganancia por mes: la lista y el detalle de un mes
  const [meses, setMeses] = useState<MesGanancia[]>([]);
  const [mesDetalle, setMesDetalle] = useState<string | null>(null);
  const [detalleMes, setDetalleMes] = useState<DetalleMesGanancia | null>(null);
  // Cargando / error de cada listado: la pantalla muestra "Cargando…" o "No se pudo cargar · Reintentar"
  const [cargandoMeses, setCargandoMeses] = useState<boolean>(false);
  const [errorMeses, setErrorMeses] = useState<boolean>(false);
  const loadGananciaMensual = useCallback(async () => {
    if (!vehiculosService) return;
    setCargandoMeses(true);
    try {
      setMeses(await vehiculosService.listarGananciaMensual());
      setErrorMeses(false);
    } catch {
      setMeses([]);
      setErrorMeses(true);
    } finally {
      setCargandoMeses(false);
    }
  }, [vehiculosService]);
  const [errorDetalleMes, setErrorDetalleMes] = useState<boolean>(false);
  const loadDetalleMes = useCallback(async (mes: string) => {
    if (!vehiculosService) return;
    setMesDetalle(mes);
    setDetalleMes(null);
    setErrorDetalleMes(false);
    try {
      setDetalleMes(await vehiculosService.detalleMesGanancia(mes));
    } catch {
      setDetalleMes(null);
      setErrorDetalleMes(true);
    }
  }, [vehiculosService]);

  // Progreso de la subida de fotos desde el detalle
  const [progresoFotosDetalle, setProgresoFotosDetalle] = useState<{ hecho: number; total: number } | undefined>(undefined);
  // Error de la última acción sobre fotos, mostrado en la galería (no en una ventana del navegador)
  const [errorFotosDetalle, setErrorFotosDetalle] = useState<string | null>(null);
  // Cobros de cuotas ya hechos de la venta del detalle (salen de las cuentas si se anula)
  const [cobrosCuotasVenta, setCobrosCuotasVenta] = useState<{ cantidad: number; total: number } | undefined>(undefined);
  const [vistaPreviaVenta, setVistaPreviaVenta] = useState<Array<{ id: string; codigo: string; gastosQueSeAnulan?: { cantidad: number; total: number } }> | undefined>(undefined);

  const abrirDetalle = async (id: string) => {
    if (!vehiculosService) return;
    const item = vehiculos.find((v) => v.id === id);
    setIdDetalle(id);
    setDetalleVehiculo(null);
    setDetalleError(false);
    setVistaPreviaDetalle(undefined);
    setVistaPreviaVenta(undefined);
    setCobrosCuotasVenta(undefined);
    setFotoDetalle(item?.fotoUrl ?? null);
    // Recargar el mismo detalle (tras anular o tocar fotos) no agrega una entrada al historial
    if (currentView === 'vehiculo_detalle' && idDetalle === id) {
      reemplazar('vehiculo_detalle');
    } else {
      setCurrentView('vehiculo_detalle');
    }
    try {
      const res = await vehiculosService.obtenerDetalle(id);
      if (res.success && res.detalle) {
        setDetalleVehiculo(res.detalle);
        if (res.detalle.estado === 'vendido' && res.detalle.venta) {
          try {
            setVistaPreviaVenta(await vehiculosService.vistaPreviaAnularVenta(res.detalle.venta.ventaId));
          } catch {
            // Sin la vista previa, el aviso de anular la venta no lista los autos recibidos
          }
        }
        if (res.detalle.estado === 'vendido' && res.detalle.venta) {
          try {
            setCobrosCuotasVenta(await vehiculosService.vistaPreviaCobrosCuotas(res.detalle.venta.ventaId));
          } catch {
            // Sin el dato, el aviso de anular la venta no lista los cobros de cuotas
          }
        }
        if (res.detalle.estado !== 'vendido' && !res.detalle.anulado) {
          try {
            setVistaPreviaDetalle(await vehiculosService.vistaPreviaAnulacionVehiculo(id));
          } catch {
            // Sin vista previa, el aviso de anulación no lista los pagos ni los gastos
          }
        }
      } else {
        setDetalleError(true);
      }
    } catch {
      setDetalleError(true);
    }
  };
  const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
  const [cargandoCuentas, setCargandoCuentas] = useState<boolean>(false);
  const [errorCuentas, setErrorCuentas] = useState<boolean>(false);
  const [totalDisponible, setTotalDisponible] = useState<number>(0);
  const [vehiculos, setVehiculos] = useState<VehiculoItem[]>([]);
  const [inventario, setInventario] = useState<{ total: number; cantidad: number }>({ total: 0, cantidad: 0 });
  const [inventarioError, setInventarioError] = useState<boolean>(false);

  const [vehiculosError, setVehiculosError] = useState<boolean>(false);
  const [categoriasGasto, setCategoriasGasto] = useState<CategoriaGasto[]>([]);
  // Vehículo ya elegido cuando el gasto se abre desde su detalle ("Agregar gasto")
  const [gastoPreseleccionado, setGastoPreseleccionado] = useState<string | null>(null);
  const [categoriasIngreso, setCategoriasIngreso] = useState<CategoriaGasto[]>([]);

  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([]);
  const [hayMasMovimientos, setHayMasMovimientos] = useState<boolean>(false);

  const [cargandoMovimientos, setCargandoMovimientos] = useState<boolean>(false);
  const [errorMovimientos, setErrorMovimientos] = useState<boolean>(false);
  const loadMovimientos = useCallback(async (desde: number) => {
    if (!vehiculosService) return;
    setCargandoMovimientos(true);
    try {
      const lista = await vehiculosService.listarMovimientos(desde);
      setMovimientos(desde === 0 ? lista : (prev) => [...prev, ...lista]);
      // Una página llena (50) indica que puede haber más
      setHayMasMovimientos(lista.length === TAMANO_PAGINA_MOVIMIENTOS);
      setErrorMovimientos(false);
    } catch {
      setErrorMovimientos(true);
    } finally {
      setCargandoMovimientos(false);
    }
  }, [vehiculosService]);

  const loadCategoriasIngreso = useCallback(async () => {
    if (!vehiculosService) return;
    try {
      setCategoriasIngreso(await vehiculosService.listarCategorias('ingreso'));
    } catch {
      // Sin categorías, la grilla queda vacía
    }
  }, [vehiculosService]);

  const loadCategoriasGasto = useCallback(async () => {
    if (!vehiculosService) return;
    try {
      setCategoriasGasto(await vehiculosService.listarCategorias('gasto'));
    } catch {
      // Sin categorías, la pantalla de gasto muestra la grilla vacía
    }
  }, [vehiculosService]);
  // Filtro de Vehículos: vive acá para sobrevivir a abrir el detalle y volver
  const [filtroVehiculos, setFiltroVehiculos] = useState<FiltroEstado>('stock');
  // Búsqueda del listado: vive acá para sobrevivir a abrir el detalle y volver
  const [busquedaVehiculos, setBusquedaVehiculos] = useState<string>('');

  const [cargandoVehiculos, setCargandoVehiculos] = useState<boolean>(false);
  const loadVehiculosData = useCallback(async () => {
    if (!vehiculosService) return;
    setCargandoVehiculos(true);
    try {
      const lista = await vehiculosService.listarVehiculos();
      setVehiculos(lista);
      setVehiculosError(false);
    } catch {
      setVehiculosError(true);
    } finally {
      setCargandoVehiculos(false);
    }
  }, [vehiculosService]);

  // Cuotas con saldo (lista "Cuotas por cobrar", próximas en Balances y contador de vencidas)
  const [cuotas, setCuotas] = useState<CuotaPorCobrar[]>([]);
  const [cuotaCobrar, setCuotaCobrar] = useState<CuotaPorCobrar | null>(null);
  const [cargandoCuotas, setCargandoCuotas] = useState<boolean>(false);
  const [errorCuotas, setErrorCuotas] = useState<boolean>(false);
  const loadCuotas = useCallback(async () => {
    if (!vehiculosService) return;
    setCargandoCuotas(true);
    try {
      setCuotas(await vehiculosService.listarCuotasPorCobrar());
      setErrorCuotas(false);
    } catch {
      // Sin la lista, el botón no muestra contador
      setErrorCuotas(true);
    } finally {
      setCargandoCuotas(false);
    }
  }, [vehiculosService]);

  // Lo que queda por cobrar de las ventas financiadas (Balances)
  const [porCobrar, setPorCobrar] = useState<number>(0);
  const [errorPorCobrar, setErrorPorCobrar] = useState<boolean>(false);
  const loadPorCobrar = useCallback(async () => {
    if (!vehiculosService) return;
    try {
      setPorCobrar(await vehiculosService.obtenerPorCobrar());
      setErrorPorCobrar(false);
    } catch {
      setErrorPorCobrar(true);
    }
  }, [vehiculosService]);

  // Gastos pendientes de asignar: el botón de la pantalla principal muestra su total
  const [pendientes, setPendientes] = useState<PendientesResult>({ grupos: [], total: 0 });
  const [gastoAsignar, setGastoAsignar] = useState<PendienteAsignar | null>(null);
  const [cargandoPendientes, setCargandoPendientes] = useState<boolean>(false);
  const [errorPendientes, setErrorPendientes] = useState<boolean>(false);
  const loadPendientes = useCallback(async () => {
    if (!vehiculosService) return;
    setCargandoPendientes(true);
    try {
      setPendientes(await vehiculosService.listarPendientes());
      setErrorPendientes(false);
    } catch {
      // Sin pendientes cargados, el botón no aparece
      setErrorPendientes(true);
    } finally {
      setCargandoPendientes(false);
    }
  }, [vehiculosService]);

  // Socios para aporte y retiro (se cargan al abrir esos formularios)
  const [socios, setSocios] = useState<Array<{ id: string; nombre: string }>>([]);
  const loadSocios = useCallback(async () => {
    if (!vehiculosService) return;
    try {
      setSocios(await vehiculosService.listarSocios());
    } catch {
      // Sin socios, el formulario muestra solo el socio que carga
    }
  }, [vehiculosService]);

  // Formulario de vinculación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [linkingPin, setLinkingPin] = useState('');
  const [linkingStep, setLinkingStep] = useState<'creds' | 'choose_pin' | 'confirm_pin'>('creds');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);

  // Temporizador para refrescar el estado de bloqueo si está bloqueado
  useEffect(() => {
    if (!lockoutStatus?.isLocked) return;

    const timer = setInterval(() => {
      const current = lockout.getStatus();
      setLockoutStatus(current);
      if (!current?.isLocked) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutStatus?.isLocked, lockout]);

  // Cargar cuentas y saldo disponible si está desbloqueado
  const loadCuentasData = useCallback(async () => {
    if (!cuentasService || !isUnlocked) return;
    setCargandoCuentas(true);
    try {
      const [list, total] = await Promise.all([
        cuentasService.obtenerCuentasConSaldo(),
        cuentasService.obtenerDineroDisponible(),
      ]);
      setCuentas(list);
      setTotalDisponible(total);
      setErrorCuentas(false);

      if (vehiculosService) {
        try {
          setInventario(await vehiculosService.obtenerInventario());
          setInventarioError(false);
        } catch {
          setInventarioError(true);
        }
      }
    } catch {
      setErrorCuentas(true);
    } finally {
      setCargandoCuentas(false);
    }
  }, [cuentasService, vehiculosService, isUnlocked]);

  useEffect(() => {
    if (isUnlocked) {
      loadCuentasData();
      // La app puede abrir directo en Vehículos: su listado se carga al desbloquear
      void loadVehiculosData();
      void loadPendientes();
      void loadPorCobrar();
      void loadCuotas();
    }
  }, [isUnlocked, loadCuentasData, loadVehiculosData, loadPendientes, loadPorCobrar, loadCuotas]);

  const handleSeleccionarPestana = useCallback((p: Pestana) => {
    if (p === 'vehiculos') {
      void loadVehiculosData();
    } else if (p === 'movimientos') {
      void loadMovimientos(0);
    } else if (p === 'home') {
      void loadCuentasData();
      void loadCuotas();
      void loadPendientes();
    }
    irAPestana(p);
  }, [irAPestana, loadVehiculosData, loadMovimientos, loadCuentasData, loadCuotas, loadPendientes]);

  // Manejador de inactividad: escuchar interacción y visibilidad
  const handleUserActivity = useCallback(() => {
    if (isUnlocked) {
      inactivity.recordActivity();
    }
  }, [isUnlocked, inactivity]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const stillUnlocked = inactivity.isUnlocked();
        setIsUnlocked(stillUnlocked);
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [inactivity, isUnlocked, handleUserActivity]);

  // Manejo de ingreso de PIN para desbloqueo diario
  const handlePinComplete = async (pin: string) => {
    if (lockoutStatus.isLocked) return;

    const isValid = await authService.validatePin(pin);
    if (isValid) {
      lockout.recordSuccess();
      inactivity.markUnlocked();
      setPinError(false);
      setIsUnlocked(true);
    } else {
      const newStatus = lockout.recordFailedAttempt();
      setLockoutStatus(newStatus);
      setPinError(true);
      setTimeout(() => setPinError(false), 500);
    }
  };

  // Manejo de "Me olvidé el PIN"
  const handleForgotPin = async () => {
    await authService.unlinkDevice();
    lockout.reset();
    inactivity.lock();
    setIsLinked(false);
    setLinkedUser(null);
    setIsUnlocked(false);
    setLinkingStep('creds');
    setEmail('');
    setPassword('');
    setLinkingPin('');
    setLinkError(null);
  };

  // Bloquear manualmente
  const handleManualLock = () => {
    inactivity.lock();
    setIsUnlocked(false);
  };

  // Flujo de vinculación: paso a elegir PIN
  const [validatedUser, setValidatedUser] = useState<LinkedUser | null>(null);

  const handleCredsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setLinkError('Ingresá el email y la contraseña');
      return;
    }
    setLinkError(null);
    setIsLinkingLoading(true);

    const res = await authService.validateCredentials(cleanEmail, password);
    setIsLinkingLoading(false);

    if (res.success && res.user) {
      setValidatedUser(res.user);
      setLinkingStep('choose_pin');
    } else {
      setLinkError(res.error || 'Email o contraseña incorrectos');
    }
  };

  // Flujo de vinculación: confirmación de PIN
  const handleFirstPin = (pin: string) => {
    setLinkingPin(pin);
    setLinkingStep('confirm_pin');
  };

  const handleSecondPin = async (confirmPin: string) => {
    if (!validatedUser) {
      setLinkError('Error en la sesión. Volvé a ingresar tus datos.');
      setLinkingStep('creds');
      return;
    }

    if (confirmPin !== linkingPin) {
      setLinkError('Los dos PIN no coinciden. Probá de nuevo.');
      setLinkingStep('choose_pin');
      setLinkingPin('');
      return;
    }

    setIsLinkingLoading(true);
    setLinkError(null);

    const result = await authService.linkDeviceWithUser(validatedUser, linkingPin, confirmPin);

    setIsLinkingLoading(false);

    if (result.success && result.user) {
      lockout.recordSuccess();
      inactivity.markUnlocked();
      setIsLinked(true);
      setLinkedUser(result.user);
      setIsUnlocked(true);
    } else {
      setLinkError(result.error || 'No se pudo vincular el dispositivo');
      setLinkingStep('choose_pin');
      setLinkingPin('');
    }
  };

  // PANTALLA 1: Desbloqueado -> Pantalla Principal (o vistas internas)
  if (isLinked && isUnlocked && linkedUser) {
    if (currentView === 'change_pin') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <ChangePinFlow
              authService={authService}
              lockout={lockout}
              onDone={volver}
              onCancel={volver}
            />
          </div>
        </main>
      );
    }

    if (currentView === 'ganancia_mensual') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <GananciaMensualView
            meses={meses}
            cargando={cargandoMeses}
            errorCarga={errorMeses}
            onReintentar={() => void loadGananciaMensual()}
            onVerMes={(mes) => {
              void loadDetalleMes(mes);
              setCurrentView('ganancia_mes');
            }}
            onVolver={volver}
          />
        </main>
      );
    }

    if (currentView === 'ganancia_mes' && mesDetalle) {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          {detalleMes ? (
            <GananciaDetalleMesView
              mes={mesDetalle}
              detalle={detalleMes}
              onVerVenta={(vehiculoId) => void abrirDetalle(vehiculoId)}
              onIrPendientes={() => {
                void loadPendientes();
                setCurrentView('pendientes');
              }}
              onVolver={volver}
            />
          ) : (
            errorDetalleMes ? (
              <ErrorReintentar onReintentar={() => { if (mesDetalle) void loadDetalleMes(mesDetalle); }} />
            ) : (
              <Cargando />
            )
          )}
        </main>
      );
    }

    if (currentView === 'cuotas_por_cobrar') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <CuotasPorCobrarView
            cuotas={cuotas}
            cargando={cargandoCuotas}
            errorCarga={errorCuotas}
            onReintentar={() => void loadCuotas()}
            onCobrar={(cuota) => {
              setCuotaCobrar(cuota);
              setCurrentView('cobrar_cuota');
            }}
            onVolver={volver}
          />
        </main>
      );
    }

    if (currentView === 'cobrar_cuota' && cuotaCobrar) {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <CobrarCuotaView
            cuota={cuotaCobrar}
            cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, saldo: c.saldo }))}
            onCobrar={async (params) => {
              if (!vehiculosService) return { success: false, error: 'No hay conexión con el servicio de cuotas' };
              const res = await vehiculosService.cobrarCuota(params);
              if (res.success) {
                await Promise.all([loadCuotas(), loadCuentasData(), loadPorCobrar(), loadMovimientos(0)]);
              }
              return res;
            }}
            onVolver={() => {
              void loadCuotas();
              volver();
            }}
          />
        </main>
      );
    }

    if (currentView === 'pendientes') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <PendientesAsignarView
            pendientes={pendientes}
            cargando={cargandoPendientes}
            errorCarga={errorPendientes}
            onReintentar={() => void loadPendientes()}
            onAsignar={(gasto) => {
              setGastoAsignar(gasto);
              setCurrentView('asignar_gasto');
            }}
            onVolver={volver}
          />
        </main>
      );
    }

    if (currentView === 'asignar_gasto' && gastoAsignar) {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <AsignarGastoView
            gasto={gastoAsignar}
            vehiculos={vehiculos}
            onAsignar={async (params) => {
              if (!vehiculosService) return { success: false, error: 'No hay conexión con el servicio de gastos' };
              const res = await vehiculosService.asignarGasto(params);
              if (res.success) {
                await Promise.all([loadPendientes(), loadVehiculosData(), loadCuentasData()]);
              }
              return res;
            }}
            onVolver={() => {
              void loadPendientes();
              volver();
            }}
          />
        </main>
      );
    }

    if (currentView === 'mover_plata') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <MoverPlataView
            onPasar={() => setCurrentView('pasar_plata')}
            onAporte={() => {
              void loadSocios();
              setCurrentView('aporte_socio');
            }}
            onRetiro={() => {
              void loadSocios();
              setCurrentView('retiro_socio');
            }}
            onVolver={volver}
          />
        </main>
      );
    }

    if (currentView === 'pasar_plata') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <PasarPlataView
            cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, saldo: c.saldo }))}
            onRegistrar={async (params) => {
              if (!vehiculosService) return { success: false, error: 'No hay conexión con el servicio de movimientos' };
              const res = await vehiculosService.transferir(params);
              if (res.success) {
                await Promise.all([loadCuentasData(), loadMovimientos(0)]);
              }
              return res;
            }}
            onVolver={volver}
          />
        </main>
      );
    }

    if (currentView === 'aporte_socio' || currentView === 'retiro_socio') {
      const modo = currentView === 'aporte_socio' ? 'aporte' : 'retiro';
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <MovimientoSocioView
            modo={modo}
            socios={socios}
            socioActualId={linkedUser?.id ?? ''}
            cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, saldo: c.saldo }))}
            onRegistrar={async (params) => {
              if (!vehiculosService) return { success: false, error: 'No hay conexión con el servicio de movimientos' };
              const res =
                modo === 'aporte'
                  ? await vehiculosService.registrarAporte(params)
                  : await vehiculosService.registrarRetiro(params);
              if (res.success) {
                await Promise.all([loadCuentasData(), loadMovimientos(0)]);
              }
              return res;
            }}
            onVolver={volver}
          />
        </main>
      );
    }

    if (currentView === 'movimientos') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20">
          <MovimientosView
            movimientos={movimientos}
            hayMas={hayMasMovimientos}
            cargando={cargandoMovimientos}
            errorCarga={errorMovimientos}
            onReintentar={() => void loadMovimientos(0)}
            onVerMas={() => void loadMovimientos(movimientos.length)}
            onAnular={
              vehiculosService
                ? async (m, motivo) => {
                    // Anular una pata de pase anula el pase completo, por su RPC propia
                    const esPase = m.tipo === 'transferencia_salida' || m.tipo === 'transferencia_entrada';
                    const res = esPase
                      ? await vehiculosService.anularTransferencia({ movimientoId: m.id, motivo })
                      : await vehiculosService.anularMovimiento({
                          movimientoId: m.id,
                          gastoId: m.gastoId,
                          motivo,
                          tipo: m.tipo,
                          anulado: m.anulado,
                        });
                    if (res.success) {
                      // Anular un cobro de cuota baja la cuenta, vuelve el saldo de la cuota y sube Por cobrar
                      await Promise.all([
                        loadMovimientos(0),
                        loadCuentasData(),
                        loadVehiculosData(),
                        loadPorCobrar(),
                        loadCuotas(),
                      ]);
                    }
                    return res;
                  }
                : undefined
            }
            onVerVehiculo={(vehiculoId) => void abrirDetalle(vehiculoId)}
            vistaPreviaGasto={vehiculosService ? (gastoId) => vehiculosService.vistaPreviaAnularGasto(gastoId) : undefined}
          />
          <BarraNavegacion pestanaActiva="movimientos" onSeleccionar={handleSeleccionarPestana} />
        </main>
      );
    }

    if (currentView === 'ingreso') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <RegistrarGastoView
            modo="ingreso"
            categorias={categoriasIngreso}
            cuentas={cuentas}
            onVolver={volver}
            onIrACuentas={() => setCurrentView('cuentas')}
            onRegistrarIngreso={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.registrarIngreso(params);
                    if (res.success) {
                      reemplazar('ingreso');
                      await Promise.all([loadCuentasData(), loadVehiculosData()]);
                    }
                    return res;
                  }
                : undefined
            }
          />
        </main>
      );
    }

    if (currentView === 'gasto') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <RegistrarGastoView
            categorias={categoriasGasto}
            cuentas={cuentas}
            vehiculos={vehiculos}
            vehiculoPreseleccionado={gastoPreseleccionado ?? undefined}
            onBuscarProveedores={vehiculosService ? (texto) => vehiculosService.buscarProveedores(texto) : undefined}
            onCrearProveedor={vehiculosService ? (params) => vehiculosService.crearContacto(params) : undefined}
            onRegistrarRepartido={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.registrarGastoRepartido(params);
                    if (res.success) {
                      reemplazar('gasto');
                      await Promise.all([loadCuentasData(), loadVehiculosData()]);
                    }
                    return res;
                  }
                : undefined
            }
            onVolver={volver}
            onIrACuentas={() => setCurrentView('cuentas')}
            onRegistrar={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.registrarGasto(params);
                    if (res.success) {
                      reemplazar('gasto');
                      await Promise.all([loadCuentasData(), loadVehiculosData()]);
                    }
                    return res;
                  }
                : undefined
            }
          />
        </main>
      );
    }

    if (currentView === 'vender') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <VenderVehiculoView
            vehiculos={vehiculos}
            cuentas={cuentas}
            onVolver={volver}
            onRegistrar={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.registrarVentaConPermutas(params);
                    if (res.success) {
                      reemplazar('vender');
                      await Promise.all([loadCuentasData(), loadVehiculosData()]);
                    }
                    return res;
                  }
                : undefined
            }
          />
        </main>
      );
    }

    if (currentView === 'comprar') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <CompraVehiculoView
            cuentas={cuentas}
            onVolver={volver}
            onIrACuentas={() => setCurrentView('cuentas')}
            onVerVehiculos={() => {
              void loadVehiculosData();
              // La compra ya se registró: atrás desde Vehículos no vuelve al formulario enviado
              reemplazar('vehiculos');
            }}
            onRegistrar={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.registrarCompra(params);
                    if (res.success) {
                      reemplazar('comprar');
                      await Promise.all([loadCuentasData(), loadVehiculosData()]);
                    }
                    return res;
                  }
                : undefined
            }
          />
        </main>
      );
    }

    if (currentView === 'vehiculo_detalle' && detalleVehiculo) {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <VehiculoDetalleView
            detalle={detalleVehiculo}
            fotoUrl={fotoDetalle}
            onVolver={volver}
            onAgregarGasto={() => {
              setGastoPreseleccionado(detalleVehiculo.id);
              loadCuentasData();
              void loadCategoriasGasto();
              loadVehiculosData();
              setCurrentView('gasto');
            }}
            vistaPrevia={vistaPreviaDetalle}
            vistaPreviaVenta={vistaPreviaVenta}
            progresoFotos={progresoFotosDetalle}
            errorFotos={errorFotosDetalle}
            onAgregarFotos={async (archivos) => {
              if (!vehiculosService || !detalleVehiculo) return;
              setErrorFotosDetalle(null);
              const vigentes = (detalleVehiculo.fotos ?? []).length;
              const comprimidas: Blob[] = [];
              for (const archivo of archivos) {
                comprimidas.push(await comprimirFotoEnNavegador(archivo));
              }
              const res = await vehiculosService.agregarFotos(detalleVehiculo.id, comprimidas, vigentes, (hecho, total) =>
                setProgresoFotosDetalle({ hecho, total })
              );
              setProgresoFotosDetalle(undefined);
              if (!res.success) {
                setErrorFotosDetalle(
                  res.error ?? res.fallidas.map((f) => `La foto ${f.numero} no se subió: ${f.error}`).join(' · ')
                );
              }
              await Promise.all([abrirDetalle(detalleVehiculo.id), loadVehiculosData()]);
            }}
            onUsarComoPrincipal={async (fotoId) => {
              if (!vehiculosService || !detalleVehiculo) return;
              setErrorFotosDetalle(null);
              const res = await vehiculosService.usarComoPrincipal(fotoId);
              if (!res.success) setErrorFotosDetalle(res.error ?? 'No se cambió nada.');
              await Promise.all([abrirDetalle(detalleVehiculo.id), loadVehiculosData()]);
            }}
            onQuitarFoto={async (fotoId) => {
              if (!vehiculosService || !detalleVehiculo) return;
              setErrorFotosDetalle(null);
              const res = await vehiculosService.quitarFoto(fotoId);
              if (!res.success) setErrorFotosDetalle(res.error ?? 'No se quitó nada.');
              await Promise.all([abrirDetalle(detalleVehiculo.id), loadVehiculosData()]);
            }}
            cobrosCuotas={cobrosCuotasVenta}
            onVerRecibido={(vehiculoId) => void abrirDetalle(vehiculoId)}
            onAnularVehiculo={
              vehiculosService
                ? async (motivo) => {
                    const res = await vehiculosService.anularVehiculo({
                      vehiculoId: detalleVehiculo.id,
                      estado: detalleVehiculo.estado,
                      motivo,
                    });
                    if (res.success) {
                      // El vehículo sale del listado: volvemos a Vehículos con los saldos al día
                      await Promise.all([loadCuentasData(), loadVehiculosData(), loadMovimientos(0)]);
                      setCurrentView('vehiculos');
                    }
                    return res;
                  }
                : undefined
            }
            onAnularVenta={
              vehiculosService && detalleVehiculo.venta
                ? async (motivo) => {
                    const res = await vehiculosService.anularVenta({
                      ventaId: detalleVehiculo.venta!.ventaId,
                      motivo,
                    });
                    if (res.success) {
                      // El vehículo vuelve a En stock: recargamos el detalle para que lo muestre
                      await Promise.all([loadCuentasData(), loadVehiculosData(), loadMovimientos(0)]);
                      await abrirDetalle(detalleVehiculo.id);
                    }
                    return res;
                  }
                : undefined
            }
          />
        </main>
      );
    }

    if (currentView === 'vehiculo_detalle') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <div className="w-full max-w-md mx-auto p-4">
            <header className="flex justify-between items-center py-3 mb-4">
              <h1 className="text-xl font-bold text-gray-900">Detalle del vehículo</h1>
              <button
                type="button"
                onClick={volver}
                className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
              >
                Volver
              </button>
            </header>
            {detalleError ? (
              <ErrorReintentar
                onReintentar={() => {
                  if (idDetalle) void abrirDetalle(idDetalle);
                }}
              />
            ) : (
              <Cargando />
            )}
          </div>
        </main>
      );
    }

    if (currentView === 'vehiculos') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20">
          <VehiculosView
            vehiculos={vehiculos}
            errorCarga={vehiculosError}
            cargando={cargandoVehiculos}
            onPedirFotos={vehiculosService ? (id) => vehiculosService.fotosParaCompartir(id) : undefined}
            filtro={filtroVehiculos}
            busqueda={busquedaVehiculos}
            onCambiarBusqueda={setBusquedaVehiculos}
            onCambiarFiltro={setFiltroVehiculos}
            onAbrirDetalle={(id) => void abrirDetalle(id)}
            onReintentar={loadVehiculosData}
            onAgregarFoto={
              vehiculosService
                ? async (id, foto) => {
                    const res = await vehiculosService.agregarFoto(id, foto);
                    if (res.success && res.fotoUrl) {
                      const url = res.fotoUrl;
                      // La foto queda en el listado de la pantalla, así sobrevive a abrir el detalle
                      setVehiculos((prev) => prev.map((v) => (v.id === id ? { ...v, fotoUrl: url } : v)));
                    }
                    return res;
                  }
                : undefined
            }
            comprimirFoto={comprimirFoto}
          />
          <BarraNavegacion pestanaActiva="vehiculos" onSeleccionar={handleSeleccionarPestana} />
        </main>
      );
    }

    if (currentView === 'cargar_stock') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20">
          <CargarStockView
            onVolver={volver}
            onGuardar={
              vehiculosService
                ? (params) => vehiculosService.cargarStock(params)
                : undefined
            }
            onVolverAlListado={() => {
              // Al terminar, el listado de Vehículos se ve actualizado
              void loadVehiculosData();
              reemplazar('vehiculos');
            }}
            comprimirFoto={comprimirFoto}
          />
          <BarraNavegacion pestanaActiva="mas" onSeleccionar={handleSeleccionarPestana} />
        </main>
      );
    }

    if (currentView === 'balances') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <BalancesView
            porCobrar={porCobrar}
            cargandoCuentas={cargandoCuentas && cuentas.length === 0}
            errorCuentas={errorCuentas}
            onReintentar={() => void loadCuentasData()}
            errorPorCobrar={errorPorCobrar}
            proximasCuotas={cuotas}
            onVerGananciaMensual={() => {
              void loadGananciaMensual();
              setCurrentView('ganancia_mensual');
            }}
            totalDisponible={totalDisponible}
            cuentas={cuentas}
            inventario={inventario}
            errorInventario={inventarioError}
            onVolver={volver}
            onIrACuentas={() => setCurrentView('cuentas')}
          />
        </main>
      );
    }

    if (currentView === 'cuentas' && cuentasService) {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <CuentasView
            cuentasIniciales={cuentas}
            cuentasService={cuentasService}
            onVolver={() => {
              loadCuentasData();
              volver();
            }}
            onCuentaCreada={loadCuentasData}
          />
        </main>
      );
    }

    if (currentView === 'mas') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20">
          <MasView
            onBalances={() => {
              loadCuentasData();
              ir('balances');
            }}
            onMoverPlata={() => ir('mover_plata')}
            onCuotas={() => {
              void loadCuotas();
              ir('cuotas_por_cobrar');
            }}
            onPendientes={() => {
              void loadPendientes();
              ir('pendientes');
            }}
            onGanancia={() => {
              void loadGananciaMensual();
              ir('ganancia_mensual');
            }}
            onCuentas={
              cuentasService
                ? () => {
                    loadCuentasData();
                    ir('cuentas');
                  }
                : undefined
            }
            onCargarStock={() => ir('cargar_stock')}
            onChangePin={() => ir('change_pin')}
            onBloquear={handleManualLock}
            onDesvincular={handleForgotPin}
          />
          <BarraNavegacion pestanaActiva="mas" onSeleccionar={handleSeleccionarPestana} />
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pb-20">
        <InicioView
          nombreSocio={linkedUser.nombre}
          totalDisponible={totalDisponible}
          cargandoPlata={cargandoCuentas}
          errorPlata={errorCuentas}
          onReintentarPlata={loadCuentasData}
          cuotasVencidas={cuotas.length > 0 ? contarVencidas(cuotas) : 0}
          pendientesTotal={pendientes.total}
          onIrABalances={() => {
            loadCuentasData();
            ir('balances');
          }}
          onIrACuotas={() => {
            void loadCuotas();
            ir('cuotas_por_cobrar');
          }}
          onIrAPendientes={() => {
            void loadPendientes();
            ir('pendientes');
          }}
          onComprar={() => {
            loadCuentasData();
            ir('comprar');
          }}
          onVender={() => {
            loadVehiculosData();
            ir('vender');
          }}
          onGasto={() => {
            setGastoPreseleccionado(null);
            loadCuentasData();
            void loadCategoriasGasto();
            loadVehiculosData();
            ir('gasto');
          }}
          onIngreso={() => {
            loadCuentasData();
            void loadCategoriasIngreso();
            ir('ingreso');
          }}
        />
        <BarraNavegacion pestanaActiva="home" onSeleccionar={handleSeleccionarPestana} />
      </main>
    );
  }

  // PANTALLA 2: Vinculado pero Bloqueado -> Ingresar PIN
  if (isLinked) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs text-center mb-2">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Ingresá tu PIN</h1>
          {linkedUser && (
            <p className="text-sm text-gray-600">Socio: {linkedUser.nombre}</p>
          )}
        </div>

        <PinKeypad
          onComplete={handlePinComplete}
          isLocked={lockoutStatus.isLocked}
          remainingSeconds={lockoutStatus.remainingSeconds}
          error={pinError}
          onForgotPin={() => setMostrarConfirmarOlvidePin(true)}
        />

        {mostrarConfirmarOlvidePin && (
          <Dialogo
            titulo="¿Desvincular dispositivo?"
            onCerrar={() => setMostrarConfirmarOlvidePin(false)}
          >
            <p className="text-sm text-gray-600">
              Vas a tener que volver a vincular el dispositivo con el email y la contraseña.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Boton
                variante="peligro"
                anchoCompleto
                onClick={async () => {
                  setMostrarConfirmarOlvidePin(false);
                  await handleForgotPin();
                }}
              >
                Desvincular
              </Boton>
              <Boton
                variante="secundario"
                anchoCompleto
                onClick={() => setMostrarConfirmarOlvidePin(false)}
              >
                Volver
              </Boton>
            </div>
          </Dialogo>
        )}
      </main>
    );
  }

  // PANTALLA 3: No vinculado -> Vincular dispositivo
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          Vincular dispositivo
        </h1>
        <p className="text-xs text-center text-gray-500 mb-6">
          Ingresá con tu credencial de socio una sola vez.
        </p>

        {linkError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {linkError}
          </div>
        )}

        {linkingStep === 'creds' && (
          <form onSubmit={handleCredsSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Email del socio
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agustin@machoman.local"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLinkingLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors shadow-sm"
            >
              {isLinkingLoading ? 'Verificando credenciales...' : 'Continuar a elegir PIN'}
            </button>
          </form>
        )}

        {linkingStep === 'choose_pin' && (
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 mb-2">Elegí tu PIN de 4 dígitos</p>
            <PinKeypad onComplete={handleFirstPin} />
          </div>
        )}

        {linkingStep === 'confirm_pin' && (
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 mb-2">Confirmá tu PIN de 4 dígitos</p>
            {isLinkingLoading ? (
              <p className="text-sm text-gray-500 my-8">Vinculando dispositivo...</p>
            ) : (
              <PinKeypad onComplete={handleSecondPin} />
            )}
          </div>
        )}
      </div>
    </main>
  );
};
