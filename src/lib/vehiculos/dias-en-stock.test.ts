import { describe, it, expect } from 'vitest';
import { diasEnStock, textoDiasEnStock, textoDiasDeVehiculo } from './dias-en-stock';

describe('diasEnStock', () => {
  it('en stock cuenta desde la fecha de ingreso hasta hoy', () => {
    expect(diasEnStock({ fechaIngreso: '2026-10-10', hoy: '2026-11-24' })).toBe(45);
  });

  it('vendido cuenta hasta la fecha de venta, no hasta hoy', () => {
    expect(diasEnStock({ fechaIngreso: '2026-11-01', fechaVenta: '2026-11-15', hoy: '2026-12-30' })).toBe(14);
  });

  it('un auto que ingresó hoy lleva 0 días', () => {
    expect(diasEnStock({ fechaIngreso: '2026-11-24', hoy: '2026-11-24' })).toBe(0);
  });

  it('cruza bien el cambio de mes', () => {
    expect(diasEnStock({ fechaIngreso: '2026-01-31', hoy: '2026-02-02' })).toBe(2);
  });

  it('cruza bien el cambio de año', () => {
    expect(diasEnStock({ fechaIngreso: '2025-12-30', hoy: '2026-01-02' })).toBe(3);
  });
});

describe('textoDiasEnStock', () => {
  it('0 días dice "Ingresó hoy", 1 día en singular y el resto en plural', () => {
    expect(textoDiasEnStock(0)).toBe('Ingresó hoy');
    expect(textoDiasEnStock(1)).toBe('1 día en stock');
    expect(textoDiasEnStock(45)).toBe('45 días en stock');
  });
});

describe('textoDiasDeVehiculo: datos que no son una fecha válida', () => {
  it('sin fecha de ingreso, o con una que no es AAAA-MM-DD real, no muestra días y no tira error', () => {
    expect(textoDiasDeVehiculo({ fechaIngreso: undefined as unknown as string, estado: 'en_stock' })).toBeNull();
    expect(textoDiasDeVehiculo({ fechaIngreso: '2026-13-01', estado: 'en_stock' })).toBeNull();
    expect(textoDiasDeVehiculo({ fechaIngreso: '24/11/2026', estado: 'en_stock' })).toBeNull();
  });
});
