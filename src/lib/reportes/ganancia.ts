import { formatMoney } from '../format/money';
import { hoyBuenosAires } from '../vehiculos/financiacion';
import type { MesGanancia } from '../vehiculos/vehiculos-service';

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

const ABREVIATURAS_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export interface MesGraficado {
  /** Primer día del mes, AAAA-MM-01 */
  mes: string;
  /** Nombre corto del mes: "jun", "jul"… */
  etiqueta: string;
  ganancia: number;
}

/**
 * Los últimos 6 meses calendario (incluido el actual), de viejo a nuevo.
 * Un mes sin actividad (sin fila en `meses`) vale 0. "Hoy" es el de Buenos Aires.
 */
export function ultimos6Meses(meses: MesGanancia[], hoy: string = hoyBuenosAires()): MesGraficado[] {
  const [anio, mes] = hoy.split('-').map(Number);
  const gananciaPorMes = new Map<string, number>();
  for (const m of meses) gananciaPorMes.set(m.mes.slice(0, 7), m.ganancia);

  const resultado: MesGraficado[] = [];
  for (let i = 5; i >= 0; i--) {
    // Date.UTC resuelve los meses hacia atrás que cruzan el año
    const d = new Date(Date.UTC(anio, mes - 1 - i, 1));
    const numeroMes = d.getUTCMonth() + 1;
    const clave = `${d.getUTCFullYear()}-${String(numeroMes).padStart(2, '0')}`;
    resultado.push({
      mes: `${clave}-01`,
      etiqueta: ABREVIATURAS_MES[numeroMes - 1],
      ganancia: gananciaPorMes.get(clave) ?? 0,
    });
  }
  return resultado;
}

const MENOS = '−'; // U+2212, como formatMoney

// "1,2 M", "1 M": millones con una decimal, coma y sin ".0"
const aMillones = (abs: number): string => `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',')} M`;

/** Monto corto para la barra: "$ 1,2 M", "$ 850 mil", "$ −300 mil", "$ 0". El monto completo queda en la lista. */
export function formatoMontoCorto(monto: number): string {
  if (monto === 0) return '$ 0';
  const signo = monto < 0 ? MENOS : '';
  const abs = Math.abs(monto);
  const mil = Math.round(abs / 1000);
  // Si el redondeo llega a 1000 mil, se muestra como millones
  if (mil >= 1000) return `$ ${signo}${aMillones(abs)}`;
  return `$ ${signo}${mil} mil`;
}

/** "Incluye $ X de gastos sin asignar", solo cuando hay algo sin asignar */
export function leyendaSinAsignar(monto: number): string | null {
  return monto > 0 ? `Incluye ${formatMoney(monto)} de gastos sin asignar` : null;
}
