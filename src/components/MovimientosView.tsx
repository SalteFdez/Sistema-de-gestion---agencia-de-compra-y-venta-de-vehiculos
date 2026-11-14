import React, { useState } from 'react';
import type { MovimientoItem } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';

export interface MovimientosViewProps {
  movimientos: MovimientoItem[];
  /** Puede haber más movimientos para traer (se muestra "Ver más") */
  hayMas?: boolean;
  onVerMas?: () => void;
  /** Anular un movimiento que se puede anular (saldo inicial, ingreso o gasto), con su motivo */
  onAnular?: (
    movimiento: MovimientoItem,
    motivo: string
  ) => void | Promise<void | { success: boolean; error?: string }>;
  onVolver: () => void;
}

const ETIQUETA_TIPO: Record<string, string> = {
  saldo_inicial: 'Saldo inicial',
  compra: 'Compra',
  venta_cobro: 'Cobro de venta',
  gasto: 'Gasto',
  ingreso_otro: 'Ingreso',
};

// Resumen de lo que se va a anular: "el ingreso de $ 80.000 · Comisión · Banco"
const textoAnulacion = (m: MovimientoItem): string => {
  const etiqueta = (ETIQUETA_TIPO[m.tipo] ?? m.tipo).toLowerCase();
  const concepto = [m.descripcion ?? m.categoriaNombre, m.vehiculoCodigo].filter(Boolean).join(' · ');
  return `el ${etiqueta} de ${formatMoney(Math.abs(m.monto))}${concepto ? ` · ${concepto}` : ''}, de ${m.cuentaNombre}`;
};

// Día y mes de un timestamp en hora de Buenos Aires: "14/11"
const diaMesBA = (iso: string): string => {
  const partes = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(new Date(iso));
  const dia = partes.find((p) => p.type === 'day')?.value ?? '';
  const mes = partes.find((p) => p.type === 'month')?.value ?? '';
  return `${dia}/${mes}`;
};

// Lo que entra a una cuenta suma (verde); lo que sale resta (rojo)
const TIPOS_QUE_ENTRAN = new Set(['saldo_inicial', 'venta_cobro', 'ingreso_otro']);

const formatoFecha = (iso: string): string => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

export const MovimientosView: React.FC<MovimientosViewProps> = ({
  movimientos,
  hayMas = false,
  onVerMas,
  onAnular,
  onVolver,
}) => {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [aAnular, setAAnular] = useState<MovimientoItem | null>(null);
  const [motivo, setMotivo] = useState<string>('');
  const [errorAnular, setErrorAnular] = useState<string | null>(null);

  const confirmarAnulacion = async () => {
    if (!aAnular || !onAnular) return;
    const res = (await onAnular(aAnular, motivo.trim())) as { success: boolean; error?: string } | void;
    if (res && !res.success) {
      // Nada quedó anulado: el diálogo sigue abierto con el motivo para reintentar
      setErrorAnular(res.error ?? 'No se pudo anular. No se anuló nada.');
      return;
    }
    setErrorAnular(null);
    setAAnular(null);
  };
  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Movimientos</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <ul className="space-y-2">
        {movimientos.map((m) => {
          const entra = TIPOS_QUE_ENTRAN.has(m.tipo);
          const signo = entra ? '+' : '-';
          // El color del monto sigue al sentido (entra/sale) también en los anulados; el tachado los marca
          const colorMonto = entra ? 'text-green-700' : 'text-red-600';
          const concepto = [m.vehiculoCodigo, m.categoriaNombre].filter(Boolean).join(' · ');
          return (
            <li
              key={m.id}
              onClick={() => setSeleccionadoId(seleccionadoId === m.id ? null : m.id)}
              className={`bg-white border border-gray-200 rounded-xl p-3 cursor-pointer ${m.anulado ? 'line-through text-gray-400' : ''}`}
            >
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatoFecha(m.fecha)}</span>
                <span>{ETIQUETA_TIPO[m.tipo] ?? m.tipo}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-sm text-gray-900">{m.descripcion ?? ETIQUETA_TIPO[m.tipo]}</span>
                <span className={`text-sm font-bold ${colorMonto}`}>
                  {signo} {formatMoney(Math.abs(m.monto))}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>
                  <span>{m.cuentaNombre}</span>
                  {concepto ? <span> · {concepto}</span> : null}
                </span>
                <span>Cargó {m.creadoPor}</span>
              </div>
              {m.anulado && (
                <p className="text-xs text-red-700 mt-1 no-underline">
                  Anulado por {m.anuladoPor}
                  {m.anuladoEl ? ` el ${diaMesBA(m.anuladoEl)}` : ''} · Motivo: {m.motivoAnulacion}
                </p>
              )}
              {seleccionadoId === m.id && !m.anulado && (
                <div className="mt-3 pt-3 border-t border-gray-200 no-underline" onClick={(e) => e.stopPropagation()}>
                  {m.tipo === 'compra' || m.tipo === 'venta_cobro' ? (
                    <p className="text-sm text-gray-700">
                      {m.tipo === 'compra'
                        ? `Es parte de la compra de ${m.vehiculoCodigo ?? ''}`
                        : `Es parte de la venta de ${m.vehiculoCodigo ?? ''}`}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMotivo('');
                        setAAnular(m);
                      }}
                      className="w-full py-2 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-lg"
                    >
                      Anular
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {aAnular && (
        <div role="dialog" aria-modal="true" className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm text-red-900">
            Vas a anular {textoAnulacion(aAnular)}. ¿Seguro?
          </p>
          <div>
            <label htmlFor="anular-motivo" className="block text-xs font-semibold text-gray-700 mb-1">
              Motivo (obligatorio)
            </label>
            <input
              id="anular-motivo"
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAAnular(null)}
              className="flex-1 py-2 bg-white border border-gray-300 text-gray-800 text-sm rounded-lg"
            >
              Volver
            </button>
            <button
              type="button"
              disabled={motivo.trim() === ''}
              onClick={() => void confirmarAnulacion()}
              className="flex-1 py-2 bg-red-600 disabled:bg-gray-300 text-white text-sm rounded-lg"
            >
              Anular movimiento
            </button>
          </div>
          {errorAnular && (
            <p role="alert" className="text-sm text-red-700">
              {errorAnular}
            </p>
          )}
        </div>
      )}

      {hayMas && (
        <button
          type="button"
          onClick={onVerMas}
          className="w-full mt-4 py-2.5 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-xl"
        >
          Ver más
        </button>
      )}
    </div>
  );
};
