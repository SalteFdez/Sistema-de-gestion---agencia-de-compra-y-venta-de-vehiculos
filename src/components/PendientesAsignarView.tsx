import React from 'react';
import type { PendienteAsignar, PendientesResult } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';

export interface PendientesAsignarViewProps {
  pendientes: PendientesResult;
  onAsignar: (gasto: PendienteAsignar) => void;
  onVolver: () => void;
}

// "2026-11-14" -> "14/11/2026" (sin pasar por Date, para no desfasar la fecha)
const formatoFecha = (iso: string): string => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

export const PendientesAsignarView: React.FC<PendientesAsignarViewProps> = ({ pendientes, onAsignar, onVolver }) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Pendientes de asignar</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      {pendientes.grupos.length === 0 ? (
        <p className="text-sm text-gray-600 bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
          No hay gastos pendientes de asignar
        </p>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-800 mb-3">{formatMoney(pendientes.total)} sin asignar</p>
          <div className="space-y-4">
            {pendientes.grupos.map((g) => (
              <section key={g.proveedorId ?? 'sin-proveedor'} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-baseline mb-2">
                  <h2 className="text-sm font-semibold text-gray-900">{g.proveedorNombre}</h2>
                  <span className="text-sm font-medium text-gray-800">{formatMoney(g.subtotal)}</span>
                </div>
                <div className="space-y-2">
                  {g.gastos.map((gasto) => (
                    <button
                      key={gasto.gastoId}
                      type="button"
                      onClick={() => onAsignar(gasto)}
                      className="w-full text-left border border-gray-200 rounded-xl p-3 bg-white hover:bg-gray-50"
                    >
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatoFecha(gasto.fecha)}</span>
                        <span>{gasto.categoria}</span>
                      </div>
                      {gasto.descripcion && <p className="text-sm text-gray-900 mt-1">{gasto.descripcion}</p>}
                      <div className="flex justify-between mt-1 text-sm">
                        <span className="text-gray-700">{formatMoney(gasto.montoTotal)}</span>
                        <span className="font-medium text-amber-800">Falta asignar {formatMoney(gasto.pendiente)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
