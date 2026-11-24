import React from 'react';
import type { MesGanancia } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';
import { leyendaSinAsignar, ultimos6Meses } from '../lib/reportes/ganancia';
import { GraficoGanancia } from './GraficoGanancia';
import { Encabezado } from './ui/Encabezado';
import { Cargando } from './ui/Cargando';
import { ErrorReintentar } from './ui/ErrorReintentar';

export interface GananciaMensualViewProps {
  meses: MesGanancia[];
  onVerMes: (mes: string) => void;
  onVolver: () => void;
  cargando?: boolean;
  errorCarga?: boolean;
  onReintentar?: () => void;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// "2026-11-01" -> "Noviembre 2026"
const nombreMes = (mes: string): string => {
  const [anio, m] = mes.split('-').map(Number);
  return `${NOMBRES_MES[m - 1]} ${anio}`;
};

export const GananciaMensualView: React.FC<GananciaMensualViewProps> = ({
  meses,
  onVerMes,
  onVolver,
  cargando = false,
  errorCarga = false,
  onReintentar,
}) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <Encabezado titulo="Ganancia por mes" onVolver={onVolver} />

      {errorCarga && <ErrorReintentar onReintentar={onReintentar ?? (() => undefined)} />}
      {cargando && meses.length === 0 && <Cargando />}

      {/* El gráfico solo con datos: no mientras carga ni con error */}
      {!cargando && !errorCarga && meses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-4">
          <GraficoGanancia meses={ultimos6Meses(meses)} />
        </div>
      )}

      {!errorCarga && !(cargando && meses.length === 0) && (meses.length === 0 ? (
        <p className="text-sm text-gray-600 bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center">
          Todavía no hay ventas ni gastos para mostrar
        </p>
      ) : (
        <div className="space-y-3">
          {meses.map((m) => {
            const gastos = m.gastosGenerales + m.gastosSinAsignar;
            const leyenda = leyendaSinAsignar(m.gastosSinAsignar);
            return (
              <article
                key={m.mes}
                onClick={() => onVerMes(m.mes)}
                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm cursor-pointer"
              >
                <h2 className="text-base font-semibold text-gray-900">{nombreMes(m.mes)}</h2>
                <ul className="text-sm text-gray-700 mt-2 space-y-0.5">
                  <li>{`Ventas ${formatMoney(m.ventas)} (${m.cantidadVendidos} ${m.cantidadVendidos === 1 ? 'auto' : 'autos'})`}</li>
                  <li>{`Costo de lo vendido ${formatMoney(m.costoVendido)}`}</li>
                  <li>{`Gastos ${formatMoney(gastos)}`}</li>
                  <li>{`Ingresos generales ${formatMoney(m.ingresos)}`}</li>
                </ul>
                {leyenda && <p className="text-xs text-amber-700 mt-1">{leyenda}</p>}
                <p className={`text-2xl font-extrabold mt-3 ${m.ganancia < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {formatMoney(m.ganancia)}
                </p>
              </article>
            );
          })}
        </div>
      ))}
    </div>
  );
};
