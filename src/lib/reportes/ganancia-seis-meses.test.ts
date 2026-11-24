import { describe, it, expect, vi, afterEach } from 'vitest';
import { ultimos6Meses } from './ganancia';
import type { MesGanancia } from '../vehiculos/vehiculos-service';

const mes = (m: string, ganancia: number): MesGanancia => ({
  mes: m,
  ventas: 0,
  cantidadVendidos: 0,
  costoVendido: 0,
  gastosGenerales: 0,
  gastosSinAsignar: 0,
  ingresos: 0,
  ganancia,
});

describe('ultimos6Meses', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve 6 meses calendario, incluido el actual, de viejo a nuevo', () => {
    const meses = ultimos6Meses([], '2026-11-24');

    expect(meses.map((m) => m.mes)).toEqual([
      '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01',
    ]);
  });

  it('completa con 0 los meses sin actividad y usa la ganancia de los que tienen fila', () => {
    const meses = ultimos6Meses([mes('2026-08-01', 500000), mes('2026-11-01', -300000)], '2026-11-24');

    expect(meses.map((m) => m.ganancia)).toEqual([0, 0, 500000, 0, 0, -300000]);
  });

  it('cruza el año: de diciembre a enero', () => {
    const meses = ultimos6Meses([], '2027-02-10');

    expect(meses.map((m) => m.mes)).toEqual([
      '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01',
    ]);
  });

  it('cada mes tiene su nombre corto: jun, jul, … nov', () => {
    const meses = ultimos6Meses([], '2026-11-24');

    expect(meses.map((m) => m.etiqueta)).toEqual(['jun', 'jul', 'ago', 'sep', 'oct', 'nov']);
  });

  it('sin fecha, "hoy" es el día en Buenos Aires: a la noche del 30/11 en Argentina aún es noviembre', () => {
    // 2026-12-01 01:00 UTC = 2026-11-30 22:00 en Buenos Aires
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-01T01:00:00Z'));

    const meses = ultimos6Meses([]);

    expect(meses[5].mes).toBe('2026-11-01');
  });
});
