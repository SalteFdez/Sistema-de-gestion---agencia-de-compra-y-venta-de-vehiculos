import { hoyBuenosAires } from './financiacion';

/**
 * Días que el auto estuvo en stock: desde la fecha de ingreso hasta la fecha de venta
 * (si se vendió) o hasta hoy en Buenos Aires. Fechas AAAA-MM-DD, sin horas ni zona horaria.
 */
export function diasEnStock(p: { fechaIngreso: string; fechaVenta?: string | null; hoy?: string }): number {
  const hasta = p.fechaVenta ?? p.hoy ?? hoyBuenosAires();
  const aDias = (iso: string): number => {
    const [anio, mes, dia] = iso.split('-').map(Number);
    // UTC para que la resta no dependa de la zona horaria ni del horario de verano
    return Date.UTC(anio, mes - 1, dia) / 86400000;
  };
  return Math.round(aDias(hasta) - aDias(p.fechaIngreso));
}

/** Una fecha AAAA-MM-DD que existe de verdad (no "2026-13-01" ni "24/11/2026") */
export function esFechaIso(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

/**
 * Texto de días en stock de un auto del listado, o null si la fecha de ingreso no es válida
 * (así no se muestra nada y no se rompe la lista). Si se vendió, cuenta hasta la venta;
 * si la fecha de venta falta o no es válida, cuenta hasta hoy.
 */
export function textoDiasDeVehiculo(v: { fechaIngreso: unknown; estado: string; fechaVenta?: unknown }): string | null {
  if (!esFechaIso(v.fechaIngreso)) return null;
  const fechaVenta = v.estado === 'vendido' && esFechaIso(v.fechaVenta) ? v.fechaVenta : undefined;
  return textoDiasEnStock(diasEnStock({ fechaIngreso: v.fechaIngreso, fechaVenta }));
}

/** "Ingresó hoy", "1 día en stock" o "45 días en stock" */
export function textoDiasEnStock(dias: number): string {
  if (dias === 0) return 'Ingresó hoy';
  return dias === 1 ? '1 día en stock' : `${dias} días en stock`;
}
