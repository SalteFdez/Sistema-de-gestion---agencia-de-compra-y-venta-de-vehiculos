import React from 'react';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';
import { formatMoney } from '../lib/format/money';

export interface BalancesViewProps {
  totalDisponible: number;
  cuentas: CuentaItem[];
  onVolver: () => void;
  onIrACuentas: () => void;
}

export const BalancesView: React.FC<BalancesViewProps> = ({
  totalDisponible,
  cuentas,
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
