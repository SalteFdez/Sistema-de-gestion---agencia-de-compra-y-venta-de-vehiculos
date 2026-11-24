import { formatMoney } from '../format/money';
import type { CuotaPorCobrar } from './vehiculos-service';

/**
 * Link de WhatsApp a un celular argentino de 10 dígitos (ver normalizarCelularAR),
 * con el mensaje ya escrito. El texto va codificado para la URL.
 */
export function linkWhatsApp(celular10: string, mensaje: string): string {
  return `https://wa.me/549${celular10}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Mensaje para recordar una cuota: "Hola Juan Pérez, te escribo por la cuota 2 de 4 de $ 500.000 que vence el 15/12".
 * El monto es lo que falta cobrar de esa cuota (el saldo): el monto entero si no se cobró nada, o lo que queda si es parcial.
 */
export function mensajeCuota(
  c: Pick<CuotaPorCobrar, 'comprador' | 'numero' | 'totalCuotas' | 'saldo' | 'vencimiento'>
): string {
  const [, mes, dia] = c.vencimiento.split('-');
  const saludo = c.comprador ? `Hola ${c.comprador}` : 'Hola';
  return `${saludo}, te escribo por la cuota ${c.numero} de ${c.totalCuotas} de ${formatMoney(c.saldo)} que vence el ${dia}/${mes}`;
}
