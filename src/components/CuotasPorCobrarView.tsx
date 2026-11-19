import React from 'react';
import type { CuotaPorCobrar } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';

export interface CuotasPorCobrarViewProps {
  cuotas: CuotaPorCobrar[];
  onCobrar: (cuota: CuotaPorCobrar) => void;
  onVolver: () => void;
}

// "2027-01-15" -> "15/01/2027" (sin pasar por Date)
const formatoFecha = (iso: string): string => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  vencida: 'Vencida',
  cobrada: 'Cobrada',
};

/** Cuántas cuotas están vencidas: lo que muestra el botón de la pantalla principal */
export const contarVencidas = (cuotas: CuotaPorCobrar[]): number =>
  cuotas.filter((c) => c.estado === 'vencida').length;

export const CuotasPorCobrarView: React.FC<CuotasPorCobrarViewProps> = ({ cuotas, onCobrar, onVolver }) => {
  // Vencidas primero; dentro de cada grupo, por vencimiento
  const ordenadas = [...cuotas].sort((a, b) => {
    const va = a.estado === 'vencida' ? 0 : 1;
    const vb = b.estado === 'vencida' ? 0 : 1;
    if (va !== vb) return va - vb;
    return a.vencimiento.localeCompare(b.vencimiento);
  });

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Cuotas por cobrar</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      {ordenadas.length === 0 ? (
        <p className="text-sm text-gray-600 bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
          No hay cuotas por cobrar
        </p>
      ) : (
        <div className="space-y-3">
          {ordenadas.map((c) => {
            const vencida = c.estado === 'vencida';
            return (
              <article
                key={c.cuotaId}
                className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${vencida ? 'border-red-400' : 'border-gray-200'}`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold ${vencida ? 'text-red-700' : 'text-gray-900'}`}>
                    {formatoFecha(c.vencimiento)}
                  </span>
                  <span className="text-xs text-gray-500">{`Cuota ${c.numero} de ${c.totalCuotas}`}</span>
                </div>
                <p className="text-sm text-gray-900 mt-1">{c.comprador ?? 'Sin comprador'}</p>
                {c.compradorTelefono && (
                  <a href={`tel:${c.compradorTelefono}`} className="text-sm text-blue-700 underline">
                    {c.compradorTelefono}
                  </a>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  <span>{c.vehiculoCodigo}</span>
                </p>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-sm text-gray-800">{formatMoney(c.monto)}</span>
                  <span className={`text-sm font-medium ${vencida ? 'text-red-700' : 'text-amber-800'}`}>
                    {`Falta ${formatMoney(c.saldo)}`}
                  </span>
                </div>
                {c.cobrado > 0 && (
                  <p className="text-xs text-gray-600 mt-1">{`Cobrado ${formatMoney(c.cobrado)} de ${formatMoney(c.monto)}`}</p>
                )}
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs font-semibold text-gray-600">{ETIQUETA_ESTADO[c.estado] ?? c.estado}</span>
                  <button
                    type="button"
                    onClick={() => onCobrar(c)}
                    className="py-1.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg"
                  >
                    Cobrar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
