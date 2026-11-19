import { formatMoney } from '../format/money';

/** Hoy en Buenos Aires, AAAA-MM-DD */
export const hoyBuenosAires = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

export interface ValidarFinanciacionParams {
  precio: number;
  permutas: number;
  cobros: number;
  financiado: number;
  cantidadCuotas: number;
  /** AAAA-MM-DD */
  fechaPrimera: string;
  /** AAAA-MM-DD, hoy en Buenos Aires */
  hoy: string;
}

/** Devuelve el primer motivo por el que la venta financiada no se puede confirmar, o null si está bien. */
export function validarFinanciacion(p: ValidarFinanciacionParams): string | null {
  if (!(p.financiado > 0)) {
    return 'El monto financiado tiene que ser mayor que 0';
  }
  if (!Number.isInteger(p.cantidadCuotas) || p.cantidadCuotas < 1) {
    return 'La cantidad de cuotas tiene que ser al menos 1';
  }
  const quedaTrasPermutas = p.precio - p.permutas;
  if (p.financiado > quedaTrasPermutas) {
    return `El financiado supera lo que queda después de las permutas. Sobran ${formatMoney(p.financiado - quedaTrasPermutas)}`;
  }
  // Las fechas son AAAA-MM-DD: comparar como texto da el orden correcto
  if (p.fechaPrimera < p.hoy) {
    return 'La primera cuota no puede ser anterior a hoy';
  }
  const total = p.cobros + p.permutas + p.financiado;
  if (total !== p.precio) {
    const diferencia = Math.abs(p.precio - total);
    const detalle = total < p.precio ? `Faltan ${formatMoney(diferencia)}` : `Sobran ${formatMoney(diferencia)}`;
    return `Precio, cobros, permutas y financiado no cierran. ${detalle}`;
  }
  return null;
}
