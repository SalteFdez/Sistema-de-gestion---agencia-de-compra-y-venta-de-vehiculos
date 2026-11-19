import { formatMoney } from '../format/money';

export interface DatosMes {
  ventas: number;
  cantidadVendidos: number;
  costoVendido: number;
  gastosGenerales: number;
  gastosSinAsignar: number;
  ingresos: number;
}

export function calcularMes(d: DatosMes): DatosMes & { ganancia: number; esPerdida: boolean } {
  const ganancia = d.ventas - d.costoVendido - d.gastosGenerales - d.gastosSinAsignar + d.ingresos;
  return { ...d, ganancia, esPerdida: ganancia < 0 };
}

/** "Incluye $ X de gastos sin asignar", solo cuando hay algo sin asignar */
export function leyendaSinAsignar(monto: number): string | null {
  return monto > 0 ? `Incluye ${formatMoney(monto)} de gastos sin asignar` : null;
}
