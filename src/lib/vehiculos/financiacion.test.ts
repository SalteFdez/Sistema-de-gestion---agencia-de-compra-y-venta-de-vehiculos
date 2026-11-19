import { describe, it, expect } from 'vitest';
import { validarFinanciacion } from './financiacion';

const base = {
  precio: 5000000,
  permutas: 0,
  cobros: 3000000,
  financiado: 2000000,
  cantidadCuotas: 4,
  fechaPrimera: '2026-12-15',
  hoy: '2026-11-18',
};

describe('validarFinanciacion', () => {
  it('con los números que cierran no hay error', () => {
    expect(validarFinanciacion(base)).toBeNull();
  });

  it('dice cuánto falta o sobra cuando precio, permutas, financiado y cobrado no cierran', () => {
    expect(validarFinanciacion({ ...base, cobros: 2500000 })).toMatch(/faltan \$ 500\.000/i);
    expect(validarFinanciacion({ ...base, cobros: 3500000 })).toMatch(/sobran \$ 500\.000/i);
  });

  it('un financiado 0 no se puede confirmar', () => {
    expect(validarFinanciacion({ ...base, financiado: 0, cobros: 5000000 })).toMatch(/financiado.*mayor que 0/i);
  });

  it('el financiado no puede superar lo que queda después de las permutas', () => {
    const r = validarFinanciacion({ ...base, permutas: 1000000, cobros: 3000000, financiado: 2500000 });
    // precio 5M − permutas 1M = 4M por cubrir; financiado 2.5M ≤ 4M, pero cobros + financiado + permutas = 6.5M
    expect(r).toMatch(/no cierra|faltan|sobran/i);

    const sobra = validarFinanciacion({
      precio: 3000000, permutas: 1000000, cobros: 0, financiado: 2500000, cantidadCuotas: 3, fechaPrimera: '2026-12-15', hoy: '2026-11-18',
    });
    expect(sobra).toMatch(/supera lo que queda.*sobran \$ 500\.000/i);
  });

  it('con menos de una cuota no se puede confirmar', () => {
    expect(validarFinanciacion({ ...base, cantidadCuotas: 0 })).toMatch(/al menos 1/i);
  });

  it('una primera cuota anterior a hoy no se puede confirmar', () => {
    expect(validarFinanciacion({ ...base, fechaPrimera: '2026-11-17' })).toMatch(/no puede ser anterior a hoy/i);
  });

  it('una primera cuota que vence hoy sí se acepta', () => {
    expect(validarFinanciacion({ ...base, fechaPrimera: '2026-11-18' })).toBeNull();
  });

  it('si permutas y financiado cubren todo el precio, se puede confirmar sin cobros', () => {
    expect(
      validarFinanciacion({
        precio: 3000000, permutas: 1000000, cobros: 0, financiado: 2000000,
        cantidadCuotas: 2, fechaPrimera: '2026-12-15', hoy: '2026-11-18',
      })
    ).toBeNull();
  });
});
