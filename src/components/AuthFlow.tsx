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
import type { VehiculosService, VehiculoItem, DetalleVehiculo } from '../lib/vehiculos/vehiculos-service';
import { VehiculoDetalleView } from './VehiculoDetalleView';
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
  const [currentView, setCurrentView] = useState<
    'home' | 'balances' | 'cuentas' | 'change_pin' | 'vehiculos' | 'comprar' | 'vehiculo_detalle' | 'vender' | 'gasto'
  >('home');
  const [detalleVehiculo, setDetalleVehiculo] = useState<DetalleVehiculo | null>(null);
  const [fotoDetalle, setFotoDetalle] = useState<string | null>(null);

  const [idDetalle, setIdDetalle] = useState<string | null>(null);
  const [detalleError, setDetalleError] = useState<boolean>(false);

  const abrirDetalle = async (id: string) => {
    if (!vehiculosService) return;
    const item = vehiculos.find((v) => v.id === id);
    setIdDetalle(id);
    setDetalleVehiculo(null);
    setDetalleError(false);
    setFotoDetalle(item?.fotoUrl ?? null);
    setCurrentView('vehiculo_detalle');
    try {
      const res = await vehiculosService.obtenerDetalle(id);
      if (res.success && res.detalle) {
        setDetalleVehiculo(res.detalle);
      } else {
        setDetalleError(true);
      }
    } catch {
      setDetalleError(true);
    }
  };
  const [cuentas, setCuentas] = useState<CuentaItem[]>([]);
  const [totalDisponible, setTotalDisponible] = useState<number>(0);
  const [vehiculos, setVehiculos] = useState<VehiculoItem[]>([]);
  const [inventario, setInventario] = useState<{ total: number; cantidad: number }>({ total: 0, cantidad: 0 });
  const [inventarioError, setInventarioError] = useState<boolean>(false);

  const [vehiculosError, setVehiculosError] = useState<boolean>(false);
  const [categoriasGasto, setCategoriasGasto] = useState<CategoriaGasto[]>([]);
  // Vehículo ya elegido cuando el gasto se abre desde su detalle ("Agregar gasto")
  const [gastoPreseleccionado, setGastoPreseleccionado] = useState<string | null>(null);

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

  const loadVehiculosData = useCallback(async () => {
    if (!vehiculosService) return;
    try {
      const lista = await vehiculosService.listarVehiculos();
      setVehiculos(lista);
      setVehiculosError(false);
    } catch {
      setVehiculosError(true);
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
    try {
      const [list, total] = await Promise.all([
        cuentasService.obtenerCuentasConSaldo(),
        cuentasService.obtenerDineroDisponible(),
      ]);
      setCuentas(list);
      setTotalDisponible(total);

      if (vehiculosService) {
        try {
          setInventario(await vehiculosService.obtenerInventario());
          setInventarioError(false);
        } catch {
          setInventarioError(true);
        }
      }
    } catch {
      // Ignorar errores transitorios
    }
  }, [cuentasService, vehiculosService, isUnlocked]);

  useEffect(() => {
    if (isUnlocked) {
      loadCuentasData();
    }
  }, [isUnlocked, loadCuentasData]);

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
              onDone={() => setCurrentView('home')}
              onCancel={() => setCurrentView('home')}
            />
          </div>
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
            onVolver={() => setCurrentView('home')}
            onIrACuentas={() => setCurrentView('cuentas')}
            onRegistrar={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.registrarGasto(params);
                    if (res.success) {
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
            onVolver={() => setCurrentView('home')}
            onRegistrar={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.registrarVenta(params);
                    if (res.success) {
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
            onVolver={() => setCurrentView('home')}
            onIrACuentas={() => setCurrentView('cuentas')}
            onRegistrar={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.registrarCompra(params);
                    if (res.success) {
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
            onVolver={() => setCurrentView('vehiculos')}
            onAgregarGasto={() => {
              setGastoPreseleccionado(detalleVehiculo.id);
              loadCuentasData();
              void loadCategoriasGasto();
              loadVehiculosData();
              setCurrentView('gasto');
            }}
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
                onClick={() => setCurrentView('vehiculos')}
                className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
              >
                Volver
              </button>
            </header>
            {detalleError ? (
              <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-sm text-red-700 mb-3">No se pudo cargar el detalle del vehículo.</p>
                <button
                  type="button"
                  onClick={() => idDetalle && void abrirDetalle(idDetalle)}
                  className="py-2 px-4 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-lg"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Cargando el detalle…</p>
            )}
          </div>
        </main>
      );
    }

    if (currentView === 'vehiculos') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <VehiculosView
            vehiculos={vehiculos}
            errorCarga={vehiculosError}
            filtro={filtroVehiculos}
            onCambiarFiltro={setFiltroVehiculos}
            onAbrirDetalle={(id) => void abrirDetalle(id)}
            onReintentar={loadVehiculosData}
            onVolver={() => setCurrentView('home')}
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
            onCargarStock={
              vehiculosService
                ? async (params) => {
                    const res = await vehiculosService.cargarStock(params);
                    if (res.success) await loadVehiculosData();
                    return res;
                  }
                : undefined
            }
          />
        </main>
      );
    }

    if (currentView === 'balances') {
      return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
          <BalancesView
            totalDisponible={totalDisponible}
            cuentas={cuentas}
            inventario={inventario}
            errorInventario={inventarioError}
            onVolver={() => setCurrentView('home')}
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
              setCurrentView('home');
            }}
            onCuentaCreada={loadCuentasData}
          />
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-between p-6">
        <header className="w-full max-w-md flex justify-between items-center py-4">
          <span className="font-bold text-gray-800">Machoman Automotores</span>
          <button
            type="button"
            onClick={handleManualLock}
            className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded px-2 py-1"
          >
            Bloquear
          </button>
        </header>

        <section className="text-center my-auto w-full max-w-sm">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Hola, {linkedUser.nombre}
          </h1>
          <p className="text-gray-600 mb-6">Dispositivo vinculado correctamente.</p>

          {/* Botón grande Balances */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                loadCuentasData();
                setCurrentView('balances');
              }}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>Balances</span>
            </button>
          </div>

          {/* Botón grande Vehículos */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                loadVehiculosData();
                setCurrentView('vehiculos');
              }}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>Vehículos</span>
            </button>
          </div>

          {/* Botón grande Comprar vehículo */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                loadCuentasData();
                setCurrentView('comprar');
              }}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>Comprar vehículo</span>
            </button>
          </div>

          {/* Botón grande Vender vehículo */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                loadVehiculosData();
                setCurrentView('vender');
              }}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>Vender vehículo</span>
            </button>
          </div>

          {/* Botón grande Registrar gasto */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                setGastoPreseleccionado(null);
                loadCuentasData();
                void loadCategoriasGasto();
                loadVehiculosData();
                setCurrentView('gasto');
              }}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>Registrar gasto</span>
            </button>
          </div>

          {/* Configuración provisoria */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Configuración
            </h2>
            <div className="flex flex-col gap-2">
              {cuentasService && (
                <button
                  type="button"
                  onClick={() => setCurrentView('cuentas')}
                  className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-sm transition-colors text-center"
                >
                  Cuentas
                </button>
              )}
              <button
                type="button"
                onClick={() => setCurrentView('change_pin')}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-sm transition-colors text-center"
              >
                Cambiar PIN
              </button>
            </div>
          </div>
        </section>

        <footer className="w-full max-w-md text-center py-4">
          <button
            type="button"
            onClick={handleForgotPin}
            className="text-xs text-red-500 hover:underline"
          >
            Desvincular dispositivo
          </button>
        </footer>
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
          onForgotPin={handleForgotPin}
        />
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
