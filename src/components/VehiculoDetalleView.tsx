import React from 'react';
import type { DetalleVehiculo } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';

export interface VehiculoDetalleViewProps {
  detalle: DetalleVehiculo;
  fotoUrl: string | null;
  onVolver: () => void;
  onAgregarGasto?: () => void;
}

const ETIQUETA_ESTADO: Record<DetalleVehiculo['estado'], string> = {
  en_stock: 'En stock',
  reservado: 'Reservado',
  vendido: 'Vendido',
};

const ETIQUETA_ORIGEN: Record<DetalleVehiculo['origen'], string> = {
  compra: 'Compra',
  permuta: 'Permuta',
  inventario_inicial: 'Stock existente',
};

// Pérdida con el signo menos típico: "$ −200.000"
const formatoNegativo = (n: number): string => `$ −${formatMoney(Math.abs(n)).replace('$ ', '')}`;

// "2026-11-14" -> "14/11/2026" (sin pasar por Date, para no desfasar la fecha por zona horaria)
const formatoFecha = (iso: string): string => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

export const VehiculoDetalleView: React.FC<VehiculoDetalleViewProps> = ({
  detalle,
  fotoUrl,
  onVolver,
  onAgregarGasto,
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Detalle del vehículo</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {fotoUrl ? (
          <img src={fotoUrl} alt={`${detalle.marca} ${detalle.modelo}`} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-gray-100 text-sm text-gray-500">
            Sin foto
          </div>
        )}

        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-blue-700">{detalle.codigo}</span>
            <span className="text-xs font-medium text-green-700 bg-green-50 rounded px-2 py-0.5">
              {ETIQUETA_ESTADO[detalle.estado]}
            </span>
          </div>
          <h2 className="text-base font-semibold text-gray-900">
            {detalle.marca} {detalle.modelo}
          </h2>
          <p className="text-sm text-gray-600">
            {detalle.anio}
            {detalle.color ? ` · ${detalle.color}` : ''}
            {detalle.patente ? ` · ${detalle.patente}` : ''}
          </p>

          <dl className="text-sm text-gray-700 space-y-1 pt-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha de ingreso</dt>
              <dd>{formatoFecha(detalle.fechaIngreso)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Origen</dt>
              <dd>{ETIQUETA_ORIGEN[detalle.origen]}</dd>
            </div>
            {detalle.vendedor && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Vendedor</dt>
                <dd>{detalle.vendedor}</dd>
              </div>
            )}
          </dl>
        </div>
      </article>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mt-4">
        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Cómo se pagó</h2>
        {detalle.pagos.length === 0 ? (
          <p className="text-sm text-gray-600">Cargado como stock existente, sin pagos registrados</p>
        ) : (
          <ul className="space-y-1 text-sm text-gray-800">
            {detalle.pagos.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span>{p.cuentaNombre}</span>
                <span className="font-medium">{formatMoney(p.monto)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mt-4">
        <dl className="text-sm text-gray-700 space-y-2">
          <div className="flex justify-between">
            <dt className="text-gray-500">Valor de ingreso</dt>
            <dd>{formatMoney(detalle.valorIngreso)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Gastos asignados</dt>
            <dd>{formatMoney(detalle.gastosAsignados)}</dd>
          </div>
        </dl>
        {(detalle.gastos ?? []).length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-gray-800">
            {(detalle.gastos ?? []).map((g, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span>
                  <span className="text-gray-500">{formatoFecha(g.fecha)}</span> · {g.categoria}
                  {g.descripcion ? ` · ${g.descripcion}` : ''}
                </span>
                <span className="font-medium">{formatMoney(g.monto)}</span>
              </li>
            ))}
          </ul>
        ) : (
          detalle.gastosAsignados === 0 && (
            <p className="text-xs text-gray-500 mt-1">Todavía no hay gastos cargados</p>
          )
        )}
        {onAgregarGasto && (
          <button
            type="button"
            onClick={onAgregarGasto}
            className="w-full mt-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-sm font-medium rounded-lg"
          >
            Agregar gasto
          </button>
        )}

        <div className="mt-4 pt-3 border-t border-gray-200">
          <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Costo real</span>
          <div data-testid="costo-real" className="text-3xl font-extrabold text-gray-900 mt-1">
            {formatMoney(detalle.costoReal)}
          </div>
          {detalle.valorIngreso === 0 && <p className="text-xs text-amber-700 mt-1">Costo desconocido</p>}
        </div>
      </section>

      {detalle.venta && (
        <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mt-4">
          <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Venta</h2>
          <dl className="text-sm text-gray-700 space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha de venta</dt>
              <dd>{formatoFecha(detalle.venta.fecha)}</dd>
            </div>
            {detalle.venta.comprador && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Comprador</dt>
                <dd>{detalle.venta.comprador}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Precio de venta</dt>
              <dd>{formatMoney(detalle.venta.precioVenta)}</dd>
            </div>
          </dl>

          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mt-3 mb-1">Cómo se cobró</h3>
          <ul className="space-y-1 text-sm text-gray-800">
            {detalle.venta.cobros.map((c, i) => (
              <li key={i} className="flex justify-between">
                <span>{c.cuentaNombre}</span>
                <span className="font-medium">{formatMoney(c.monto)}</span>
              </li>
            ))}
          </ul>

          {detalle.venta.ganancia < 0 ? (
            <p className="text-lg font-bold text-red-600 mt-3">Pérdida {formatoNegativo(detalle.venta.ganancia)}</p>
          ) : (
            <p className="text-lg font-bold text-green-700 mt-3">Ganancia {formatMoney(detalle.venta.ganancia)}</p>
          )}
        </section>
      )}
    </div>
  );
};
