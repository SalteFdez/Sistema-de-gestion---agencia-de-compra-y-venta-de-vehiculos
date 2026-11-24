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
  /** Autos y montos que bajan si se anula un gasto (para el aviso de un gasto repartido) */
  vistaPreviaGasto?: (gastoId: string) => Promise<Array<{ codigo: string; monto: number }>>;
  /** Lleva al detalle del vehículo de una compra o de un cobro de venta */
  onVerVehiculo?: (vehiculoId: string) => void;
  onVolver: () => void;
}

const ETIQUETA_TIPO: Record<string, string> = {
  saldo_inicial: 'Saldo inicial',
  compra: 'Compra',
  venta_cobro: 'Cobro de venta',
  gasto: 'Gasto',
  ingreso_otro: 'Ingreso',
  aporte_socio: 'Aporte de socio',
  retiro_socio: 'Retiro de socio',
  transferencia_salida: 'Pase',
  transferencia_entrada: 'Pase',
  cuota_cobro: 'Cobro de cuota',
};

// Resumen de lo que se va a anular: "el ingreso de $ 80.000 · Comisión · Banco"
const textoAnulacion = (m: MovimientoItem): string => {
  // Anular una pata anula el pase completo: la plata vuelve de la cuenta que recibió a la que envió
  if (m.tipo === 'transferencia_salida' || m.tipo === 'transferencia_entrada') {
    const [desde, hasta] =
      m.tipo === 'transferencia_salida'
        ? [m.cuentaContraparte, m.cuentaNombre]
        : [m.cuentaNombre, m.cuentaContraparte];
    return `el pase completo: vuelven ${formatMoney(Math.abs(m.monto))} de ${desde ?? ''} a ${hasta ?? ''}`;
  }
  const etiqueta = (ETIQUETA_TIPO[m.tipo] ?? m.tipo).toLowerCase();
  const concepto = [m.descripcion ?? m.categoriaNombre, m.vehiculoCodigo].filter(Boolean).join(' · ');
  return `el ${etiqueta} de ${formatMoney(Math.abs(m.monto))}${concepto ? ` · ${concepto}` : ''}, de ${m.cuentaNombre}`;
};

// Título de la fila: aporte y retiro dicen de qué socio son; el resto usa la descripción o la etiqueta
const tituloMovimiento = (m: MovimientoItem): string => {
  if (m.tipo === 'aporte_socio') return `Aporte de ${m.socioNombre ?? ''}`;
  if (m.tipo === 'retiro_socio') return `Retiro de ${m.socioNombre ?? ''}`;
  if (m.tipo === 'transferencia_salida') return `Pase a ${m.cuentaContraparte ?? ''}`;
  if (m.tipo === 'transferencia_entrada') return `Pase desde ${m.cuentaContraparte ?? ''}`;
  if (m.tipo === 'cuota_cobro' && m.cuotaNumero) return `Cobro de cuota ${m.cuotaNumero}/${m.cuotaTotal ?? ''} · ${m.vehiculoCodigo ?? ''}`;
  return m.descripcion ?? ETIQUETA_TIPO[m.tipo];
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
const TIPOS_QUE_ENTRAN = new Set(['saldo_inicial', 'venta_cobro', 'ingreso_otro', 'transferencia_entrada', 'aporte_socio', 'cuota_cobro']);

const formatoFecha = (iso: string): string => {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};

export const MovimientosView: React.FC<MovimientosViewProps> = ({
  movimientos,
  hayMas = false,
  onVerMas,
  onAnular,
  onVerVehiculo,
  vistaPreviaGasto,
  onVolver,
}) => {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [aAnular, setAAnular] = useState<MovimientoItem | null>(null);
  const [motivo, setMotivo] = useState<string>('');
  const [errorAnular, setErrorAnular] = useState<string | null>(null);
  // Mientras anula, el botón queda deshabilitado con "Guardando…" (evita la doble anulación)
  const [guardando, setGuardando] = useState<boolean>(false);
  // Autos y montos afectados por anular un gasto repartido (null mientras se cargan)
  const [afectados, setAfectados] = useState<Array<{ codigo: string; monto: number }> | null>(null);

  const abrirAnular = (m: MovimientoItem) => {
    setMotivo('');
    setAfectados(null);
    setAAnular(m);
    if (m.tipo === 'gasto' && m.gastoId && vistaPreviaGasto) {
      void vistaPreviaGasto(m.gastoId).then(setAfectados).catch(() => setAfectados(null));
    }
  };

  const confirmarAnulacion = async () => {
    if (!aAnular || !onAnular || guardando) return;
    setGuardando(true);
    const res = (await onAnular(aAnular, motivo.trim())) as { success: boolean; error?: string } | void;
    setGuardando(false);
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
                <span className="text-sm text-gray-900">{tituloMovimiento(m)}</span>
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
                    <button
                      type="button"
                      disabled={!m.vehiculoId}
                      onClick={() => m.vehiculoId && onVerVehiculo?.(m.vehiculoId)}
                      className="w-full py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg"
                    >
                      Ver vehículo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => abrirAnular(m)}
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
          {afectados && afectados.length > 0 && (
            <p className="text-sm text-red-900">
              Baja el costo de{' '}
              {afectados.map((a, i) => `${i > 0 ? 'de ' : ''}${a.codigo} en ${formatMoney(a.monto)}`).join(' y ')}
            </p>
          )}
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
              disabled={motivo.trim() === '' || guardando}
              onClick={() => void confirmarAnulacion()}
              className="flex-1 py-2 bg-red-600 disabled:bg-gray-300 text-white text-sm rounded-lg"
            >
              {guardando ? 'Guardando…' : 'Anular movimiento'}
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
