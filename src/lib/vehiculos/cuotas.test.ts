import { describe, it, expect } from 'vitest';
import { dividirCuotas } from './cuotas';

describe('dividirCuotas', () => {
  it('reparte en cuotas iguales cuando el monto se divide justo, con vencimientos mensuales', () => {
    const cuotas = dividirCuotas({ monto: 2000000, cantidad: 4, fechaPrimera: '2026-12-15' });

    expect(cuotas).toEqual([
      { numero: 1, monto: 500000, fechaVencimiento: '2026-12-15' },
      { numero: 2, monto: 500000, fechaVencimiento: '2027-01-15' },
      { numero: 3, monto: 500000, fechaVencimiento: '2027-02-15' },
      { numero: 4, monto: 500000, fechaVencimiento: '2027-03-15' },
    ]);
  });

  it('si no se divide justo, la diferencia va en la última cuota', () => {
    const cuotas = dividirCuotas({ monto: 1000000, cantidad: 3, fechaPrimera: '2026-12-01' });

    expect(cuotas.map((c) => c.monto)).toEqual([333333, 333333, 333334]);
    expect(cuotas.reduce((acc, c) => acc + c.monto, 0)).toBe(1000000);
  });

  it('una primera cuota el 31 cae el último día de los meses más cortos y la siguiente vuelve al 31', () => {
    const cuotas = dividirCuotas({ monto: 300000, cantidad: 3, fechaPrimera: '2027-01-31' });

    expect(cuotas.map((c) => c.fechaVencimiento)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });

  it('el vencimiento de cada cuota se calcula desde la primera, no desde la anterior', () => {
    const cuotas = dividirCuotas({ monto: 400000, cantidad: 4, fechaPrimera: '2027-01-30' });

    expect(cuotas.map((c) => c.fechaVencimiento)).toEqual([
      '2027-01-30',
      '2027-02-28',
      '2027-03-30',
      '2027-04-30',
    ]);
  });

  it('con una sola cuota, es todo el monto', () => {
    expect(dividirCuotas({ monto: 800000, cantidad: 1, fechaPrimera: '2026-12-01' })).toEqual([
      { numero: 1, monto: 800000, fechaVencimiento: '2026-12-01' },
    ]);
  });

  it('rechaza una cantidad menor que 1 o un monto que no es positivo', () => {
    expect(() => dividirCuotas({ monto: 100000, cantidad: 0, fechaPrimera: '2026-12-01' })).toThrow(/cuotas/i);
    expect(() => dividirCuotas({ monto: 0, cantidad: 2, fechaPrimera: '2026-12-01' })).toThrow(/mayor que 0/i);
  });
});
