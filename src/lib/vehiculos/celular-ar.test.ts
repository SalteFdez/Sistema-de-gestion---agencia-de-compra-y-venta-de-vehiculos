import { describe, it, expect } from 'vitest';
import { normalizarCelularAR } from './celular-ar';

describe('normalizarCelularAR', () => {
  it('Buenos Aires: "011 15-1234-5678" y "11 1234 5678" dan el mismo celular de 10 dígitos', () => {
    expect(normalizarCelularAR('011 15-1234-5678')).toBe('1112345678');
    expect(normalizarCelularAR('11 1234 5678')).toBe('1112345678');
  });

  it('Salta, área de 3 dígitos: "0387 15 412-3456" da 3874123456', () => {
    expect(normalizarCelularAR('0387 15 412-3456')).toBe('3874123456');
  });

  it('área de 4 dígitos: "3874 12-3456" da 3874123456 (sin 15)', () => {
    expect(normalizarCelularAR('3874 12-3456')).toBe('3874123456');
  });

  it('con +54 9: "+54 9 387 412 3456" y "+54 9 11 1234 5678" dan 10 dígitos', () => {
    expect(normalizarCelularAR('+54 9 387 412 3456')).toBe('3874123456');
    expect(normalizarCelularAR('+54 9 11 1234 5678')).toBe('1112345678');
  });

  it('Córdoba: "0351 15 123 4567" y "351 1234567" dan 3511234567', () => {
    expect(normalizarCelularAR('0351 15 123 4567')).toBe('3511234567');
    expect(normalizarCelularAR('351 1234567')).toBe('3511234567');
  });

  it('un número fijo corto, o sin área, da null: no se arma WhatsApp', () => {
    expect(normalizarCelularAR('4321-5678')).toBeNull();
  });

  it('vacío o solo símbolos da null', () => {
    expect(normalizarCelularAR('')).toBeNull();
    expect(normalizarCelularAR('  - / ')).toBeNull();
  });
});
