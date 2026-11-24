/**
 * Formateo de montos en pesos argentinos enteros (sin centavos).
 * Ejemplo: 1500000 -> "$ 1.500.000"
 */

export function formatMoney(amount: number | bigint | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '$ 0';
  }

  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  if (isNaN(num)) {
    return '$ 0';
  }

  const isNegative = num < 0;
  const abs = Math.abs(Math.round(num));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Signo menos tipográfico (U+2212), no el guion
  return isNegative ? `$ −${formatted}` : `$ ${formatted}`;
}

/**
 * Parsea un string ingresado en el input para obtener el número entero.
 */
export function parseMoneyInput(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/\D/g, '');
  if (!cleaned) return 0;
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}
