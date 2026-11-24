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

/** "Ingresó hoy", "1 día en stock" o "45 días en stock" */
export function textoDiasEnStock(dias: number): string {
  if (dias === 0) return 'Ingresó hoy';
  return dias === 1 ? '1 día en stock' : `${dias} días en stock`;
}
