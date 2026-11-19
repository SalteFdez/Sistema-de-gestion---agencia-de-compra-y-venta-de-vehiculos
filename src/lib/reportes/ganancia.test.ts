import { describe, it, expect } from 'vitest';
import { calcularMes, leyendaSinAsignar } from './ganancia';

const base = {
  ventas: 8000000,
  cantidadVendidos: 2,
  costoVendido: 5000000,
  gastosGenerales: 500000,
  gastosSinAsignar: 200000,
  ingresos: 100000,
};

describe('calcularMes', () => {
  it('la ganancia es ventas − costo − generales − sin asignar + ingresos', () => {
    expect(calcularMes(base).ganancia).toBe(2400000);
  });

  it('una pérdida se marca como tal', () => {
    expect(calcularMes({ ...base, ventas: 1000000 }).esPerdida).toBe(true);
    expect(calcularMes(base).esPerdida).toBe(false);
  });
});

describe('leyendaSinAsignar', () => {
  it('dice cuánto hay sin asignar cuando hay', () => {
    expect(leyendaSinAsignar(200000)).toBe('Incluye $ 200.000 de gastos sin asignar');
  });

  it('no aparece cuando no hay nada sin asignar', () => {
    expect(leyendaSinAsignar(0)).toBeNull();
  });
});
