import { describe, it, expect } from 'vitest';
import { calcularTamanoRedimensionado } from './comprimir-foto';

describe('calcularTamanoRedimensionado', () => {
  it('reduce el lado mayor a 1280 px manteniendo la proporción', () => {
    expect(calcularTamanoRedimensionado(4000, 3000)).toEqual({ ancho: 1280, alto: 960 });
  });

  it('una foto que ya es chica no se agranda', () => {
    expect(calcularTamanoRedimensionado(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });
});
