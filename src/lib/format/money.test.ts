import { describe, it, expect } from 'vitest';
import { formatMoney, parseMoneyInput } from './money';

describe('formatMoney', () => {
  it('formatea cero como "$ 0"', () => {
    expect(formatMoney(0)).toBe('$ 0');
    expect(formatMoney(0n)).toBe('$ 0');
  });

  it('formatea montos positivos con separador de miles usando puntos', () => {
    expect(formatMoney(500)).toBe('$ 500');
    expect(formatMoney(1500)).toBe('$ 1.500');
    expect(formatMoney(1500000)).toBe('$ 1.500.000');
    expect(formatMoney(8000000n)).toBe('$ 8.000.000');
  });

  it('formatea montos negativos con signo menos', () => {
    expect(formatMoney(-50000)).toBe('$ −50.000');
  });

  it('maneja valores nulos, indefinidos o NaN devolviendo "$ 0"', () => {
    expect(formatMoney(null as unknown as number)).toBe('$ 0');
    expect(formatMoney(undefined as unknown as number)).toBe('$ 0');
    expect(formatMoney(NaN)).toBe('$ 0');
  });
});

describe('parseMoneyInput', () => {
  it('extrae el número entero eliminando puntos, símbolos y espacios', () => {
    expect(parseMoneyInput('')).toBe(0);
    expect(parseMoneyInput('$ 1.500.000')).toBe(1500000);
    expect(parseMoneyInput('1.500.000')).toBe(1500000);
    expect(parseMoneyInput('5000')).toBe(5000);
    expect(parseMoneyInput('abc123xyz')).toBe(123);
  });
});
