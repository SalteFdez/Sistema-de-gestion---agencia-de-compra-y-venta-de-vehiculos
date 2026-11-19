import React from 'react';
import type { DetalleMesGanancia } from '../lib/vehiculos/vehiculos-service';
import { formatMoney } from '../lib/format/money';

export interface GananciaDetalleMesViewProps {
  mes: string;
  detalle: DetalleMesGanancia;
  onVerVenta: (vehiculoId: string) => void;
  onIrPendientes: () => void;
  onVolver: () => void;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// "2026-11-05" -> "05/11"
const diaMes = (iso: string): string => {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
};

const Seccion: React.FC<{ titulo: string; total: number; children: React.ReactNode }> = ({ titulo, total, children }) => (
  <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm mb-4">
    <div className="flex justify-between items-baseline mb-2">
      <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
      <span className="text-sm font-medium text-gray-800">{`Total ${formatMoney(total)}`}</span>
    </div>
    {children}
  </section>
);

export const GananciaDetalleMesView: React.FC<GananciaDetalleMesViewProps> = ({
  mes,
  detalle,
  onVerVenta,
  onIrPendientes,
  onVolver,
}) => {
  const [anio, m] = mes.split('-').map(Number);
  const titulo = `${NOMBRES_MES[m - 1]} ${anio}`;
  const totalVentas = detalle.ventas.reduce((acc, v) => acc + v.precio, 0);
  const totalGenerales = detalle.gastosGenerales.reduce((acc, g) => acc + g.monto, 0);
  const totalSinAsignar = detalle.gastosSinAsignar.reduce((acc, g) => acc + g.pendiente, 0);
  const totalIngresos = detalle.ingresos.reduce((acc, i) => acc + i.monto, 0);

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col min-h-screen">
      <header className="flex justify-between items-center py-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
        <button
          type="button"
          onClick={onVolver}
          className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-2.5 py-1"
        >
          Volver
        </button>
      </header>

      <Seccion titulo="Ventas" total={totalVentas}>
        <ul className="space-y-2">
          {detalle.ventas.map((v) => (
            <li key={v.ventaId}>
              <button
                type="button"
                onClick={() => onVerVenta(v.vehiculoId)}
                className="w-full text-left border border-gray-200 rounded-xl p-2.5 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-semibold text-blue-700">{`${v.codigo} · ${diaMes(v.fecha)}`}</span>
                  <span>{formatMoney(v.precio)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>{`Costo ${formatMoney(v.costoReal)}`}</span>
                  <span>{`Ganancia ${formatMoney(v.ganancia)}`}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Gastos generales" total={totalGenerales}>
        <ul className="space-y-1 text-sm text-gray-800">
          {detalle.gastosGenerales.map((g, i) => (
            <li key={i} className="flex justify-between">
              <span>{`${diaMes(g.fecha)} · ${g.categoria}${g.descripcion ? ` · ${g.descripcion}` : ''}`}</span>
              <span>{formatMoney(g.monto)}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Gastos sin asignar" total={totalSinAsignar}>
        <ul className="space-y-1 text-sm text-gray-800">
          {detalle.gastosSinAsignar.map((g) => (
            <li key={g.gastoId} className="flex justify-between">
              <span>{`${diaMes(g.fecha)} · ${g.proveedor ?? 'Sin proveedor'} · ${g.categoria}`}</span>
              <span>{formatMoney(g.pendiente)}</span>
            </li>
          ))}
        </ul>
        {detalle.gastosSinAsignar.length > 0 && (
          <button
            type="button"
            onClick={onIrPendientes}
            className="w-full mt-3 py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg"
          >
            Ver pendientes de asignar
          </button>
        )}
      </Seccion>

      <Seccion titulo="Ingresos generales" total={totalIngresos}>
        <ul className="space-y-1 text-sm text-gray-800">
          {detalle.ingresos.map((i, idx) => (
            <li key={idx} className="flex justify-between">
              <span>{`${diaMes(i.fecha)} · ${i.categoria}${i.descripcion ? ` · ${i.descripcion}` : ''}`}</span>
              <span>{formatMoney(i.monto)}</span>
            </li>
          ))}
        </ul>
      </Seccion>
    </div>
  );
};
