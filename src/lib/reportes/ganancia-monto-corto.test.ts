import { describe, it, expect } from 'vitest';
import { formatoMontoCorto } from './ganancia';

describe('formatoMontoCorto', () => {
  it('a partir de un millón, en millones con coma: "$ 1,2 M" y "$ 2,5 M"', () => {
    expect(formatoMontoCorto(1200000)).toBe('$ 1,2 M');
    expect(formatoMontoCorto(2500000)).toBe('$ 2,5 M');
  });

  it('un millón exacto no lleva decimales: "$ 1 M"', () => {
    expect(formatoMontoCorto(1000000)).toBe('$ 1 M');
  });

  it('debajo de un millón, en miles: "$ 850 mil"', () => {
    expect(formatoMontoCorto(850000)).toBe('$ 850 mil');
  });

  it('un negativo lleva el signo menos (U+2212) después del $: "$ −300 mil" y "$ −1,2 M"', () => {
    expect(formatoMontoCorto(-300000)).toBe('$ −300 mil');
    expect(formatoMontoCorto(-1200000)).toBe('$ −1,2 M');
  });

  it('cero es "$ 0"', () => {
    expect(formatoMontoCorto(0)).toBe('$ 0');
  });

  it('justo debajo del millón no muestra "$ 1000 mil": pasa a "$ 1 M"', () => {
    expect(formatoMontoCorto(999600)).toBe('$ 1 M');
  });
});
