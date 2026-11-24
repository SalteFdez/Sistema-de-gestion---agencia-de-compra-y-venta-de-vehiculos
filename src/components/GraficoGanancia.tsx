import React from 'react';
import type { MesGraficado } from '../lib/reportes/ganancia';
import { formatoMontoCorto } from '../lib/reportes/ganancia';
import { formatMoney } from '../lib/format/money';

// Geometría en un viewBox fijo: el SVG se estira al ancho de la pantalla (100 %)
const ANCHO = 300;
const ALTO = 200;
const ARRIBA = 28; // espacio para los montos de las barras positivas
const ABAJO = 150; // fondo del área de barras (los negativos llegan hasta acá)
const ANCHO_BARRA = 28;

const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const redondear = (n: number): number => Math.round(n * 100) / 100;

export interface GraficoGananciaProps {
  /** Los meses a graficar, de viejo a nuevo (ver ultimos6Meses) */
  meses: MesGraficado[];
}

/**
 * Barras por mes en SVG propio. Escala proporcional al máximo absoluto; la línea base (0)
 * queda más arriba o más abajo según haya más positivos o negativos, para que entren las dos.
 */
export const GraficoGanancia: React.FC<GraficoGananciaProps> = ({ meses }) => {
  const maxPositivo = Math.max(0, ...meses.map((m) => m.ganancia));
  const maxNegativo = Math.max(0, ...meses.map((m) => -m.ganancia));
  const total = maxPositivo + maxNegativo;
  // Pixels por peso: el valor más grande (en valor absoluto) ocupa el área disponible
  const pixelesPorPeso = total > 0 ? (ABAJO - ARRIBA) / total : 0;
  const lineaBase = ARRIBA + maxPositivo * pixelesPorPeso;
  const anchoSlot = ANCHO / meses.length;

  const resumen = meses
    .map((m) => `${NOMBRES_MES[Number(m.mes.slice(5, 7)) - 1]} ${formatMoney(m.ganancia)}`)
    .join(', ');

  return (
    <svg
      role="img"
      aria-label={`Ganancia de los últimos ${meses.length} meses: ${resumen}`}
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="w-full h-auto"
    >
      <line
        x1={0}
        x2={ANCHO}
        y1={redondear(lineaBase)}
        y2={redondear(lineaBase)}
        strokeWidth={1}
        className="stroke-gray-300"
        data-testid="linea-base"
      />
      {meses.map((m, i) => {
        const cx = (i + 0.5) * anchoSlot;
        const g = m.ganancia;
        const alto = Math.abs(g) * pixelesPorPeso;
        const nombre = NOMBRES_MES[Number(m.mes.slice(5, 7)) - 1];
        // Positivas suben desde la línea base, negativas bajan desde ella
        const yMonto = g > 0 ? lineaBase - alto - 6 : g < 0 ? lineaBase + alto + 14 : lineaBase - 6;
        return (
          <g key={m.mes}>
            {g !== 0 && (
              <rect
                data-mes={m.mes}
                x={redondear(cx - ANCHO_BARRA / 2)}
                y={redondear(g > 0 ? lineaBase - alto : lineaBase)}
                width={ANCHO_BARRA}
                height={redondear(alto)}
                rx={3}
                className={g >= 0 ? 'fill-green-600' : 'fill-red-600'}
              >
                <title>{`${nombre} ${formatMoney(g)}`}</title>
              </rect>
            )}
            <text
              x={redondear(cx)}
              y={redondear(yMonto)}
              textAnchor="middle"
              fontSize={11}
              className={g < 0 ? 'fill-red-600' : 'fill-gray-800'}
            >
              {formatoMontoCorto(g)}
            </text>
            <text x={redondear(cx)} y={ALTO - 6} textAnchor="middle" fontSize={11} className="fill-gray-600">
              {m.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
