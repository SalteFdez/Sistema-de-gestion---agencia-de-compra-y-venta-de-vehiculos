import React, { useState } from 'react';
import type {
  VehiculoItem,
  RegistrarVentaConPermutasParams,
  RegistrarVentaConPermutasResult,
} from '../lib/vehiculos/vehiculos-service';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';
import { RepartoCuentas, type FilaReparto } from './RepartoCuentas';

export interface VenderVehiculoViewProps {
  vehiculos: VehiculoItem[];
  cuentas: CuentaItem[];
  onVolver: () => void;
  onRegistrar?: (params: RegistrarVentaConPermutasParams) => Promise<RegistrarVentaConPermutasResult>;
}

interface Confirmacion {
  codigo: string;
  precio: number;
  ganancia: number;
  partes: string[];
  /** Lo cobrado hoy (sin contar las permutas) */
  cobrado: number;
  /** Autos recibidos en parte de pago, en el orden en que se cargaron */
  permutasCodigos: string[];
  permutasTotal: number;
}

/** Un auto recibido en parte de pago, tal como se carga en pantalla */
interface PermutaForm {
  key: number;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  patente: string;
  valor: string;
  foto: Blob | null;
}

const permutaVacia = (key: number): PermutaForm => ({
  key,
  marca: '',
  modelo: '',
  anio: '',
  color: '',
  patente: '',
  valor: '',
  foto: null,
});

export const VenderVehiculoView: React.FC<VenderVehiculoViewProps> = ({
  vehiculos,
  cuentas,
  onVolver,
  onRegistrar,
}) => {
  const [elegido, setElegido] = useState<VehiculoItem | null>(null);
  const [precio, setPrecio] = useState<string>('');
  const [comprador, setComprador] = useState<string>('');
  const [cobros, setCobros] = useState<FilaReparto[]>([]);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  // "¿Recibís un vehículo en parte de pago?": No por defecto
  const [recibe, setRecibe] = useState<boolean>(false);
  const [permutas, setPermutas] = useState<PermutaForm[]>([]);
  const [siguienteKey, setSiguienteKey] = useState<number>(1);

  // Solo se pueden vender los vehículos en stock
  const enStock = vehiculos.filter((v) => v.estado === 'en_stock');

  const precioNumero = parseMoneyInput(precio);
  const permutasActivas = recibe ? permutas : [];
  const sumaPermutas = permutasActivas.reduce((acc, p) => acc + parseMoneyInput(p.valor), 0);
  // Lo que falta en plata: precio − Σ permutas
  const objetivoCobros = precioNumero - sumaPermutas;

  const suma = cobros.reduce((acc, c) => acc + parseMoneyInput(c.monto), 0);
  const cobrosValidos =
    cobros.length > 0 &&
    cobros.every((c) => parseMoneyInput(c.monto) > 0) &&
    new Set(cobros.map((c) => c.cuentaId)).size === cobros.length;
  const permutasValidas = permutasActivas.every(
    (p) =>
      p.marca.trim() !== '' &&
      p.modelo.trim() !== '' &&
      parseMoneyInput(p.anio) > 0 &&
      parseMoneyInput(p.valor) > 0
  );
  // Sin cobros cuando las permutas cubren todo el precio
  const cobrosOk = objetivoCobros === 0 ? true : cobrosValidos && suma === objetivoCobros;
  const puedeConfirmar =
    elegido !== null &&
    precioNumero > 0 &&
    permutasValidas &&
    sumaPermutas <= precioNumero &&
    cobrosOk;

  const agregarPermuta = () => {
    setPermutas((prev) => [...prev, permutaVacia(siguienteKey)]);
    setSiguienteKey((k) => k + 1);
  };

  const actualizarPermuta = (key: number, cambio: Partial<PermutaForm>) => {
    setPermutas((prev) => prev.map((p) => (p.key === key ? { ...p, ...cambio } : p)));
  };

  const elegirRecibe = (si: boolean) => {
    setRecibe(si);
    if (si && permutas.length === 0) {
      agregarPermuta();
    }
    if (!si) {
      setPermutas([]);
    }
  };

  const confirmar = async () => {
    if (!elegido || !onRegistrar) return;
    const res = await onRegistrar({
      vehiculoId: elegido.id,
      precio: precioNumero,
      comprador,
      cobros: objetivoCobros === 0 ? [] : cobros.map((c) => ({ cuentaId: c.cuentaId, monto: parseMoneyInput(c.monto) })),
      permutas: permutasActivas.map((p) => ({
        marca: p.marca,
        modelo: p.modelo,
        anio: parseMoneyInput(p.anio),
        color: p.color || undefined,
        patente: p.patente || undefined,
        valorPactado: parseMoneyInput(p.valor),
        foto: p.foto ?? undefined,
      })),
    });
    if (res.success && res.codigo) {
      setErrorVenta(null);
      const partes = cobros.map((c) => {
        const nombre = cuentas.find((k) => k.id === c.cuentaId)?.nombre ?? '';
        return `${formatMoney(parseMoneyInput(c.monto))} en ${nombre}`;
      });
      setConfirmacion({
        codigo: res.codigo,
        precio: precioNumero,
        ganancia: res.ganancia ?? 0,
        partes,
        cobrado: suma,
        permutasCodigos: (res.permutas ?? []).map((p) => p.codigo),
        permutasTotal: sumaPermutas,
      });
    } else {
      // Nada quedó guardado: los datos siguen en pantalla para reintentar
      setErrorVenta(res.error ?? 'No se pudo registrar la venta. No se guardó nada.');
    }
  };

  if (confirmacion) {
    return (
      <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center mt-6">
          <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Venta registrada</span>
          <div data-testid="codigo-venta" className="text-4xl font-extrabold text-blue-700 mt-2">
            {confirmacion.codigo}
          </div>
          <p className="text-sm text-gray-700 mt-4">
            {confirmacion.permutasCodigos.length > 0 ? (
              <>
                Vendiste {confirmacion.codigo} en {formatMoney(confirmacion.precio)} · Entran{' '}
                {formatMoney(confirmacion.cobrado)} hoy · Entran {confirmacion.permutasCodigos.join(' y ')} al stock por{' '}
                {formatMoney(confirmacion.permutasTotal)}
              </>
            ) : (
              <>
                Vendiste {confirmacion.codigo} en {formatMoney(confirmacion.precio)} · Entraron{' '}
                {confirmacion.partes.join(' y ')}
              </>
            )}
          </p>
          <p
            className={`text-lg font-bold mt-2 ${confirmacion.ganancia < 0 ? 'text-red-600' : 'text-green-700'}`}
          >
            {confirmacion.ganancia < 0 ? 'Pérdida' : 'Ganancia'} {formatMoney(confirmacion.ganancia)}
          </p>
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

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Vender vehículo</h1>
        <button
          type="button"
          onClick={elegido ? () => setElegido(null) : onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      {elegido && cuentas.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-600">
            No hay cuentas cargadas todavía. Cargá una cuenta para poder registrar una venta.
          </p>
        </div>
      ) : elegido ? (
        <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-gray-900">
            Datos de la venta · {elegido.codigo}
          </h2>

          <div>
            <label htmlFor="venta-precio" className="block text-xs font-semibold text-gray-700 mb-1">
              Precio de venta ($)
            </label>
            <input
              id="venta-precio"
              type="text"
              inputMode="numeric"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="venta-comprador" className="block text-xs font-semibold text-gray-700 mb-1">
              Comprador (opcional)
            </label>
            <input
              id="venta-comprador"
              type="text"
              value={comprador}
              onChange={(e) => setComprador(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            ¿Recibís un vehículo en parte de pago?
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { si: false, etiqueta: 'No' },
              { si: true, etiqueta: 'Sí' },
            ].map((op) => (
              <button
                key={op.etiqueta}
                type="button"
                aria-pressed={recibe === op.si}
                onClick={() => elegirRecibe(op.si)}
                className={`py-2.5 text-sm font-medium rounded-xl border ${
                  recibe === op.si ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>

          {recibe && (
            <div className="space-y-3">
              {permutas.map((p, i) => (
                <div key={p.key} className="border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-700">Vehículo recibido {i + 1}</span>
                    <button
                      type="button"
                      aria-label={`Quitar vehículo recibido ${i + 1}`}
                      onClick={() => setPermutas((prev) => prev.filter((x) => x.key !== p.key))}
                      className="text-xs text-gray-500 hover:text-red-600 px-2"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`perm-marca-${p.key}`} className="block text-xs text-gray-700 mb-1">Marca</label>
                      <input id={`perm-marca-${p.key}`} aria-label="Marca" type="text" value={p.marca}
                        onChange={(e) => actualizarPermuta(p.key, { marca: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label htmlFor={`perm-modelo-${p.key}`} className="block text-xs text-gray-700 mb-1">Modelo</label>
                      <input id={`perm-modelo-${p.key}`} aria-label="Modelo" type="text" value={p.modelo}
                        onChange={(e) => actualizarPermuta(p.key, { modelo: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label htmlFor={`perm-anio-${p.key}`} className="block text-xs text-gray-700 mb-1">Año</label>
                      <input id={`perm-anio-${p.key}`} aria-label="Año" type="text" inputMode="numeric" value={p.anio}
                        onChange={(e) => actualizarPermuta(p.key, { anio: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label htmlFor={`perm-valor-${p.key}`} className="block text-xs text-gray-700 mb-1">Valor pactado ($)</label>
                      <input id={`perm-valor-${p.key}`} aria-label="Valor pactado ($)" type="text" inputMode="numeric" value={p.valor}
                        onChange={(e) => actualizarPermuta(p.key, { valor: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label htmlFor={`perm-color-${p.key}`} className="block text-xs text-gray-700 mb-1">Color (opcional)</label>
                      <input id={`perm-color-${p.key}`} aria-label="Color (opcional)" type="text" value={p.color}
                        onChange={(e) => actualizarPermuta(p.key, { color: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label htmlFor={`perm-patente-${p.key}`} className="block text-xs text-gray-700 mb-1">Patente (opcional)</label>
                      <input id={`perm-patente-${p.key}`} aria-label="Patente (opcional)" type="text" value={p.patente}
                        onChange={(e) => actualizarPermuta(p.key, { patente: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`perm-foto-${p.key}`} className="block text-xs text-gray-700 mb-1">Foto (opcional)</label>
                    <input id={`perm-foto-${p.key}`} aria-label="Foto (opcional)" type="file" accept="image/*"
                      onChange={(e) => actualizarPermuta(p.key, { foto: e.target.files?.[0] ?? null })}
                      className="w-full text-xs" />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarPermuta}
                className="w-full py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg"
              >
                + Agregar otro vehículo recibido
              </button>
              <p className="text-sm font-semibold text-gray-800">Permutas {formatMoney(sumaPermutas)}</p>
            </div>
          )}

          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {recibe ? 'Lo que falta, ¿en qué cuentas entró?' : '¿En qué cuentas entró la plata?'}
          </h3>
          <RepartoCuentas cuentas={cuentas} precio={objetivoCobros} onChange={setCobros} />

          {recibe && precioNumero > 0 && (
            <p className="text-sm text-gray-800">
              Precio {formatMoney(precioNumero)} = permutas {formatMoney(sumaPermutas)} + cobrado {formatMoney(suma)}
              {precioNumero - sumaPermutas - suma !== 0 &&
                ` · ${precioNumero - sumaPermutas - suma > 0 ? 'Faltan' : 'Sobran'} ${formatMoney(Math.abs(precioNumero - sumaPermutas - suma))}`}
            </p>
          )}

          {errorVenta && (
            <p role="alert" className="text-sm text-red-700">
              {errorVenta}
            </p>
          )}

          <button
            type="button"
            disabled={!puedeConfirmar}
            onClick={() => void confirmar()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl shadow-sm"
          >
            Confirmar
          </button>
        </section>
      ) : (
        <>
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Elegí el vehículo</h2>
          {enStock.length === 0 && (
            <p className="text-sm text-gray-600 bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
              No hay vehículos en stock para vender.
            </p>
          )}
          <div className="space-y-3">
            {enStock.map((v) => (
              <article
                key={v.id}
                onClick={() => setElegido(v)}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm cursor-pointer"
              >
                {v.fotoUrl ? (
                  <img src={v.fotoUrl} alt={`${v.marca} ${v.modelo}`} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center bg-gray-100 text-sm text-gray-500">
                    Sin foto
                  </div>
                )}
                <div className="p-4">
                  <span className="text-xs font-bold text-blue-700">{v.codigo}</span>
                  <h3 className="text-base font-semibold text-gray-900">
                    {v.marca} {v.modelo}
                  </h3>
                  <p className="text-sm text-gray-600">{v.anio}</p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
