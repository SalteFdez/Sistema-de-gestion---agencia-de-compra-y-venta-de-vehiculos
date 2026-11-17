import React, { useState } from 'react';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import {
  cuentasQueQuedaranNegativas,
  type ContactoProveedor,
  type CrearContactoResult,
  type VehiculoItem,
  type RegistrarGastoParams,
  type RegistrarGastoResult,
  type RegistrarIngresoParams,
  type RegistrarIngresoResult,
  type GastoRepartidoParams,
  type GastoRepartidoResult,
} from '../lib/vehiculos/vehiculos-service';
import { FilasVehiculoMonto, type FilaVehiculo } from './FilasVehiculoMonto';

// Saldo negativo con el signo menos típico: "$ −150.000"
const formatoNegativo = (n: number): string => `$ −${formatMoney(Math.abs(n)).replace('$ ', '')}`;
import { formatMoney, parseMoneyInput } from '../lib/format/money';

export interface CategoriaGasto {
  id: string;
  nombre: string;
}

export interface RegistrarGastoViewProps {
  categorias: CategoriaGasto[];
  cuentas: CuentaItem[];
  vehiculos?: VehiculoItem[];
  /** Si viene desde el detalle de un vehículo, ya arranca en "Un vehículo" con ese vehículo elegido */
  vehiculoPreseleccionado?: string;
  /** "ingreso": misma pantalla para registrar un ingreso (sin vehículo ni aviso de negativo) */
  modo?: 'gasto' | 'ingreso';
  onVolver: () => void;
  onIrACuentas?: () => void;
  onRegistrar?: (params: RegistrarGastoParams) => Promise<RegistrarGastoResult>;
  onRegistrarIngreso?: (params: RegistrarIngresoParams) => Promise<RegistrarIngresoResult>;
  /** Gasto repartido entre varios vehículos (puede quedar parte o todo sin asignar) */
  onRegistrarRepartido?: (params: GastoRepartidoParams) => Promise<GastoRepartidoResult>;
  /** Proveedor opcional: buscar por nombre y crear uno nuevo (nombre y teléfono) */
  onBuscarProveedores?: (texto: string) => Promise<ContactoProveedor[]>;
  onCrearProveedor?: (params: { nombre: string; telefono?: string }) => Promise<CrearContactoResult>;
}

export const RegistrarGastoView: React.FC<RegistrarGastoViewProps> = ({
  categorias,
  cuentas,
  vehiculos = [],
  vehiculoPreseleccionado,
  modo = 'gasto',
  onVolver,
  onIrACuentas,
  onRegistrar,
  onRegistrarIngreso,
  onRegistrarRepartido,
  onBuscarProveedores,
  onCrearProveedor,
}) => {
  const titulo = modo === 'ingreso' ? 'Registrar ingreso' : 'Registrar gasto';
  const [monto, setMonto] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [alcance, setAlcance] = useState<'general' | 'vehiculo' | 'varios' | null>(
    vehiculoPreseleccionado ? 'vehiculo' : null
  );
  const [vehiculoId, setVehiculoId] = useState<string | null>(vehiculoPreseleccionado ?? null);
  const [filasVarios, setFilasVarios] = useState<FilaVehiculo[]>([]);
  // Proveedor opcional (solo para gastos de vehículo)
  const [proveedor, setProveedor] = useState<ContactoProveedor | null>(null);
  const [textoProveedor, setTextoProveedor] = useState<string>('');
  const [resultadosProveedor, setResultadosProveedor] = useState<ContactoProveedor[]>([]);
  const [telefonoNuevo, setTelefonoNuevo] = useState<string>('');
  const [errorProveedor, setErrorProveedor] = useState<string | null>(null);

  const buscarProveedor = async (texto: string) => {
    setTextoProveedor(texto);
    setErrorProveedor(null);
    if (!onBuscarProveedores || texto.trim() === '') {
      setResultadosProveedor([]);
      return;
    }
    setResultadosProveedor(await onBuscarProveedores(texto));
  };

  const crearProveedor = async () => {
    if (!onCrearProveedor) return;
    const res = await onCrearProveedor({ nombre: textoProveedor, telefono: telefonoNuevo.trim() || undefined });
    if (res.success && res.contacto) {
      setProveedor(res.contacto);
      setTextoProveedor('');
      setResultadosProveedor([]);
      setTelefonoNuevo('');
    } else {
      setErrorProveedor(res.error ?? 'No se pudo crear el proveedor. No se creó nada.');
    }
  };
  const [descripcion, setDescripcion] = useState<string>('');
  const [avisoNegativo, setAvisoNegativo] = useState<Array<{ nombre: string; saldoResultante: number }> | null>(null);
  const [resumen, setResumen] = useState<string | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const enviarIngreso = async () => {
    if (!puedeConfirmar || !onRegistrarIngreso || categoriaId === null || cuentaId === null) return;
    const res = await onRegistrarIngreso({
      monto: montoNumero,
      categoriaId,
      cuentaId,
      descripcion: descripcion.trim() || undefined,
    });
    if (res.success) {
      setErrorGuardado(null);
      const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? '';
      const cuentaNombre = cuentas.find((c) => c.id === cuentaId)?.nombre ?? '';
      const concepto = descripcion.trim() || catNombre;
      setResumen(`Ingreso de ${formatMoney(montoNumero)} · ${concepto} · entró en ${cuentaNombre}`);
    } else {
      // Nada quedó guardado: los datos siguen en pantalla para reintentar
      setErrorGuardado(res.error ?? 'No se pudo registrar el ingreso. No se guardó nada.');
    }
  };

  const enviarRepartido = async () => {
    if (!puedeConfirmar || !onRegistrarRepartido || categoriaId === null || cuentaId === null) return;
    const res = await onRegistrarRepartido({
      monto: montoNumero,
      categoriaId,
      cuentaId,
      descripcion: descripcion.trim() || undefined,
      asignaciones: filasVarios.map((f) => ({ vehiculoId: f.vehiculoId, monto: f.monto })),
      proveedorId: proveedor?.id ?? null,
    });
    if (res.success) {
      setErrorGuardado(null);
      const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? '';
      const cuentaNombre = cuentas.find((c) => c.id === cuentaId)?.nombre ?? '';
      const codigo = (id: string) => vehiculos.find((v) => v.id === id)?.codigo ?? '';
      const detalle =
        filasVarios.length > 0
          ? filasVarios.map((f) => `${formatMoney(f.monto)} a ${codigo(f.vehiculoId)}`).join(', ')
          : 'sin asignar';
      const concepto = descripcion.trim() || catNombre;
      const quedan = montoNumero - sumaFilas;
      const sobrante = quedan > 0 ? ` · Quedan ${formatMoney(quedan)} sin asignar` : '';
      setResumen(`Gasto de ${formatMoney(montoNumero)} · ${concepto} · ${detalle} · salió de ${cuentaNombre}${sobrante}`);
    } else {
      // Nada quedó guardado: los datos siguen en pantalla para reintentar
      setErrorGuardado(res.error ?? 'No se pudo registrar el gasto. No se guardó nada.');
    }
  };

  const enviar = async () => {
    if (alcance === 'varios') {
      await enviarRepartido();
      return;
    }
    if (!puedeConfirmar || !onRegistrar || categoriaId === null || cuentaId === null) return;
    const res = await onRegistrar({
      monto: montoNumero,
      categoriaId,
      cuentaId,
      descripcion: descripcion.trim() || undefined,
      vehiculoId: alcance === 'vehiculo' ? vehiculoId : null,
      proveedorId: alcance === 'vehiculo' ? (proveedor?.id ?? null) : null,
    });
    if (res.success) {
      setErrorGuardado(null);
      const catNombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? '';
      const cuentaNombre = cuentas.find((c) => c.id === cuentaId)?.nombre ?? '';
      const destino = alcance === 'vehiculo' ? (res.vehiculoCodigo ?? '') : 'General del negocio';
      const concepto = descripcion.trim() || catNombre;
      setResumen(`Gasto de ${formatMoney(montoNumero)} · ${concepto} · ${destino} · salió de ${cuentaNombre}`);
    } else {
      // Nada quedó guardado: los datos siguen en pantalla para reintentar
      setErrorGuardado(res.error ?? 'No se pudo registrar el gasto. No se guardó nada.');
    }
  };

  const intentarConfirmar = () => {
    if (cuentaId === null) return;
    if (modo === 'ingreso') {
      // Un ingreso solo suma: no hay aviso de saldo negativo
      void enviarIngreso();
      return;
    }
    const negativas = cuentasQueQuedaranNegativas(
      [{ cuentaId, monto: montoNumero }],
      cuentas.map((c) => ({ cuentaId: c.id, nombre: c.nombre, saldo: c.saldo }))
    );
    if (negativas.length > 0) {
      setAvisoNegativo(negativas);
    } else {
      enviar();
    }
  };

  const montoNumero = parseMoneyInput(monto);
  // Ingreso: solo monto, categoría y cuenta (siempre general). Gasto: también el alcance.
  // Reparto: cada monto > 0, sin vehículos repetidos, y lo asignado no supera el total
  const sumaFilas = filasVarios.reduce((acc, f) => acc + (f.monto || 0), 0);
  const repartoValido =
    filasVarios.every((f) => f.monto > 0) &&
    new Set(filasVarios.map((f) => f.vehiculoId)).size === filasVarios.length &&
    sumaFilas <= montoNumero;

  const puedeConfirmar =
    montoNumero > 0 &&
    categoriaId !== null &&
    cuentaId !== null &&
    (modo === 'ingreso' ||
      (alcance !== null &&
        (alcance === 'general' ||
          (alcance === 'vehiculo' && vehiculoId !== null) ||
          (alcance === 'varios' && repartoValido))));

  // En stock primero, después los vendidos (marcados)
  const vehiculosOrdenados = [...vehiculos].sort((a, b) => {
    const aVendido = a.estado === 'vendido' ? 1 : 0;
    const bVendido = b.estado === 'vendido' ? 1 : 0;
    return aVendido - bVendido;
  });

  if (resumen) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center mt-6">
          <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
            {modo === 'ingreso' ? 'Ingreso registrado' : 'Gasto registrado'}
          </span>
          <p className="text-base text-gray-800 mt-4">{resumen}</p>
          <button
            type="button"
            onClick={onVolver}
            className="w-full mt-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-sm rounded-xl"
          >
            Volver al inicio
          </button>
        </section>
      </div>
    );
  }

  if (cuentas.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
        <header className="flex justify-between items-center py-3 mb-4">
          <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
          <button
            type="button"
            onClick={onVolver}
            className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
          >
            Volver
          </button>
        </header>
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-600 mb-4">
            No hay cuentas cargadas todavía. Cargá una cuenta para poder registrar un gasto.
          </p>
          <button
            type="button"
            onClick={onIrACuentas}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm"
          >
            Cargar la primera cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <label htmlFor="gasto-monto" className="block text-xs font-semibold text-gray-700 mb-1">
            Monto ($)
          </label>
          <input
            id="gasto-monto"
            type="text"
            inputMode="numeric"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="gasto-descripcion" className="block text-xs font-semibold text-gray-700 mb-1">
            Descripción (opcional)
          </label>
          <input
            id="gasto-descripcion"
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Categoría</h2>
          <div className="grid grid-cols-2 gap-2">
            {categorias.map((c) => {
              const activa = categoriaId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setCategoriaId(c.id)}
                  className={`py-2.5 px-2 text-sm font-medium rounded-xl border ${
                    activa ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {c.nombre}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">¿De dónde salió la plata?</h2>
          <div className="grid grid-cols-2 gap-2">
            {cuentas.map((c) => {
              const activa = cuentaId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setCuentaId(c.id)}
                  className={`py-2 px-2 text-left text-sm rounded-xl border ${
                    activa ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  <span className="block font-medium">{c.nombre}</span>
                  <span className="block text-xs opacity-80">{formatMoney(c.saldo)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {modo === 'gasto' && (
        <div>
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">¿A qué corresponde?</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['general', 'vehiculo', 'varios'] as const).map((a) => {
              const activa = alcance === a;
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setAlcance(a)}
                  className={`py-2.5 px-2 text-sm font-medium rounded-xl border ${
                    activa ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {a === 'general' ? 'General del negocio' : a === 'vehiculo' ? 'Un vehículo' : 'Varios vehículos'}
                </button>
              );
            })}
          </div>
        </div>
        )}
        {modo === 'gasto' && (alcance === 'vehiculo' || alcance === 'varios') && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Proveedor (opcional)</h2>
            {proveedor ? (
              <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span>{proveedor.nombre}</span>
                <button type="button" onClick={() => setProveedor(null)} className="text-xs text-gray-600 border border-gray-300 rounded px-2 py-1">
                  Quitar
                </button>
              </div>
            ) : (
              <>
                <label htmlFor="gasto-proveedor" className="sr-only">
                  Proveedor
                </label>
                <input
                  id="gasto-proveedor"
                  type="text"
                  value={textoProveedor}
                  onChange={(e) => void buscarProveedor(e.target.value)}
                  placeholder="Buscar por nombre"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                {resultadosProveedor.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setProveedor(c)}
                    className="w-full text-left border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {c.nombre}
                  </button>
                ))}
                {textoProveedor.trim() !== '' && (
                  <div className="space-y-2 border border-dashed border-gray-300 rounded-lg p-3">
                    <label htmlFor="gasto-proveedor-telefono" className="block text-xs text-gray-700">
                      Teléfono (opcional)
                    </label>
                    <input
                      id="gasto-proveedor-telefono"
                      type="text"
                      value={telefonoNuevo}
                      onChange={(e) => setTelefonoNuevo(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void crearProveedor()}
                      className="w-full py-2 bg-white border border-gray-300 text-gray-800 text-sm rounded-lg"
                    >
                      Crear nuevo: {textoProveedor.trim()}
                    </button>
                  </div>
                )}
                {errorProveedor && (
                  <p role="alert" className="text-sm text-red-700">
                    {errorProveedor}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {errorGuardado && (
          <p role="alert" className="text-sm text-red-700">
            {errorGuardado}
          </p>
        )}

        <button
          type="button"
          disabled={!puedeConfirmar}
          onClick={intentarConfirmar}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl shadow-sm"
        >
          Confirmar
        </button>

        {avisoNegativo && (
          <div role="dialog" aria-modal="true" className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
            {avisoNegativo.map((c) => (
              <p key={c.nombre} className="text-sm text-amber-900">
                La cuenta {c.nombre} va a quedar en {formatoNegativo(c.saldoResultante)}
              </p>
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAvisoNegativo(null)}
                className="flex-1 py-2 bg-white border border-gray-300 text-gray-800 text-sm rounded-lg"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvisoNegativo(null);
                  enviar();
                }}
                className="flex-1 py-2 bg-amber-600 text-white text-sm rounded-lg"
              >
                Confirmar igual
              </button>
            </div>
          </div>
        )}

        {alcance === 'varios' && (
          <FilasVehiculoMonto
            total={montoNumero}
            vehiculos={vehiculos}
            filas={filasVarios}
            onChange={setFilasVarios}
          />
        )}

        {alcance === 'vehiculo' && (
          <div>
            <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Elegí el vehículo</h2>
            <div className="space-y-2">
              {vehiculosOrdenados.map((v) => {
                const activo = vehiculoId === v.id;
                return (
                  <article
                    key={v.id}
                    onClick={() => setVehiculoId(v.id)}
                    className={`flex gap-3 items-center rounded-xl border p-2 cursor-pointer ${
                      activo ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {v.fotoUrl ? (
                      <img src={v.fotoUrl} alt={`${v.marca} ${v.modelo}`} className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 text-[10px] text-gray-500 flex items-center justify-center">
                        Sin foto
                      </div>
                    )}
                    <div className="flex-1">
                      <span className="text-xs font-bold text-blue-700">{v.codigo}</span>
                      <p className="text-sm text-gray-900">
                        {v.marca} {v.modelo} · {v.anio}
                      </p>
                    </div>
                    {v.estado === 'vendido' && (
                      <span className="text-[11px] font-medium text-gray-600 bg-gray-100 rounded px-2 py-0.5">Vendido</span>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
