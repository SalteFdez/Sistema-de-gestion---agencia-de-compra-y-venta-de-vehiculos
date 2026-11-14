import React, { useState } from 'react';
import type { VehiculoItem, RegistrarVentaParams, RegistrarVentaResult } from '../lib/vehiculos/vehiculos-service';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import { formatMoney, parseMoneyInput } from '../lib/format/money';
import { RepartoCuentas, type FilaReparto } from './RepartoCuentas';

export interface VenderVehiculoViewProps {
  vehiculos: VehiculoItem[];
  cuentas: CuentaItem[];
  onVolver: () => void;
  onRegistrar?: (params: RegistrarVentaParams) => Promise<RegistrarVentaResult>;
}

interface Confirmacion {
  codigo: string;
  precio: number;
  ganancia: number;
  partes: string[];
}

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

  // Solo se pueden vender los vehículos en stock
  const enStock = vehiculos.filter((v) => v.estado === 'en_stock');

  const precioNumero = parseMoneyInput(precio);
  const suma = cobros.reduce((acc, c) => acc + parseMoneyInput(c.monto), 0);
  const cobrosValidos =
    cobros.length > 0 &&
    cobros.every((c) => parseMoneyInput(c.monto) > 0) &&
    new Set(cobros.map((c) => c.cuentaId)).size === cobros.length;
  const puedeConfirmar = elegido !== null && precioNumero > 0 && cobrosValidos && suma === precioNumero;

  const confirmar = async () => {
    if (!elegido || !onRegistrar) return;
    const res = await onRegistrar({
      vehiculoId: elegido.id,
      precio: precioNumero,
      comprador,
      cobros: cobros.map((c) => ({ cuentaId: c.cuentaId, monto: parseMoneyInput(c.monto) })),
    });
    if (res.success && res.codigo) {
      setErrorVenta(null);
      const partes = cobros.map((c) => {
        const nombre = cuentas.find((k) => k.id === c.cuentaId)?.nombre ?? '';
        return `${formatMoney(parseMoneyInput(c.monto))} en ${nombre}`;
      });
      setConfirmacion({ codigo: res.codigo, precio: precioNumero, ganancia: res.ganancia ?? 0, partes });
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
            Vendiste {confirmacion.codigo} en {formatMoney(confirmacion.precio)} · Entraron{' '}
            {confirmacion.partes.join(' y ')}
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

          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">¿En qué cuentas entró la plata?</h3>
          <RepartoCuentas cuentas={cuentas} precio={precioNumero} onChange={setCobros} />

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
