import React from 'react';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import { formatMoney } from '../lib/format/money';
import type { CuotaPorCobrar } from '../lib/vehiculos/vehiculos-service';

export interface BalancesViewProps {
  totalDisponible: number;
  cuentas: CuentaItem[];
  inventario?: { total: number; cantidad: number };
  errorInventario?: boolean;
  /** Lo que queda por cobrar de las ventas financiadas (no es disponible) */
  porCobrar?: number;
  errorPorCobrar?: boolean;
  /** Cuotas con saldo: se muestran las próximas 3 */
  proximasCuotas?: CuotaPorCobrar[];
  onVolver: () => void;
  onIrACuentas: () => void;
}

export const BalancesView: React.FC<BalancesViewProps> = ({
  totalDisponible,
  cuentas,
  inventario = { total: 0, cantidad: 0 },
  errorInventario = false,
  porCobrar = 0,
  errorPorCobrar = false,
  proximasCuotas = [],
  onVolver,
  onIrACuentas,
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      {/* Header con botón volver */}
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Balances</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      {/* Card principal: Dinero disponible */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center mb-6">
        <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
          Dinero disponible
        </span>
        <div
          data-testid="total-disponible"
          className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2 mb-1"
        >
          {formatMoney(totalDisponible)}
        </div>
        <p className="text-xs text-gray-500">Total en efectivo, bancos y billeteras</p>
      </section>

      {/* Card Inventario: costo de los vehículos en stock (no toca el dinero disponible) */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
        <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
          Inventario
        </span>
        {errorInventario ? (
          <p role="alert" className="text-sm text-red-600 mt-1">No se pudo cargar el inventario.</p>
        ) : (
          <div className="text-lg font-bold text-gray-900 mt-1">
            {`${formatMoney(inventario.total)} · ${inventario.cantidad} ${inventario.cantidad === 1 ? 'vehículo' : 'vehículos'}`}
          </div>
        )}
      </section>

      {/* Card Por cobrar: dinero de ventas financiadas que todavía no entró (no toca el disponible) */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
        <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
          Por cobrar
        </span>
        {errorPorCobrar ? (
          <p role="alert" className="text-sm text-red-600 mt-1">No se pudo cargar lo que queda por cobrar.</p>
        ) : (
          <div className="text-lg font-bold text-gray-900 mt-1">{formatMoney(porCobrar)}</div>
        )}
      </section>

      {/* Próximas 3 cuotas por cobrar: las vencidas van primero y en rojo */}
      {proximasCuotas.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Próximas cuotas</h2>
          <ul className="space-y-1.5">
            {[...proximasCuotas]
              .sort((a, b) => {
                const va = a.estado === 'vencida' ? 0 : 1;
                const vb = b.estado === 'vencida' ? 0 : 1;
                if (va !== vb) return va - vb;
                return a.vencimiento.localeCompare(b.vencimiento);
              })
              .slice(0, 3)
              .map((c) => {
                const [anio, mes, dia] = c.vencimiento.split('-');
                return (
                  <li key={c.cuotaId} className={`text-sm flex justify-between ${c.estado === 'vencida' ? 'text-red-700' : 'text-gray-800'}`}>
                    <span>{`${dia}/${mes}/${anio} · ${c.comprador ?? 'Sin comprador'}`}</span>
                    <span className="font-medium">{formatMoney(c.saldo)}</span>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {/* Detalle por cuenta */}
      <section className="flex-1">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Por cuenta</h2>
          <button
            type="button"
            onClick={onIrACuentas}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            Administrar cuentas
          </button>
        </div>

        {cuentas.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600 mb-4">
              No hay cuentas cargadas todavía.
            </p>
            <button
              type="button"
              onClick={onIrACuentas}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
            >
              Cargar primera cuenta
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cuentas.map((cuenta) => (
              <div
                key={cuenta.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center shadow-sm"
              >
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {cuenta.nombre}
                  </div>
                  <span className="text-[11px] text-gray-500 capitalize">
                    {cuenta.tipo}
                  </span>
                </div>
                <div className="text-base font-bold text-gray-900">
                  {formatMoney(cuenta.saldo)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
