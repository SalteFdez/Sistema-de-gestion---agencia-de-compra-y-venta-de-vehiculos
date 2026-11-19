import { describe, it, expect } from 'vitest';
import { coincideBusqueda } from './busqueda';

const corsa = { codigo: 'MC-014', marca: 'Chevrolet', modelo: 'Corsa', patente: 'AB123CD' };
const uno = { codigo: 'MC-007', marca: 'Fiat', modelo: 'Uno', patente: null };

describe('coincideBusqueda', () => {
  it('no distingue mayúsculas ni acentos', () => {
    expect(coincideBusqueda(corsa, 'corsa')).toBe(true);
    expect(coincideBusqueda(corsa, 'CORSA')).toBe(true);
    expect(coincideBusqueda({ ...uno, modelo: 'Clío' }, 'clio')).toBe(true);
    expect(coincideBusqueda({ ...uno, modelo: 'clio' }, 'CLÍO')).toBe(true);
  });

  it('el código encuentra con "14", "014" o "mc-014"', () => {
    expect(coincideBusqueda(corsa, '14')).toBe(true);
    expect(coincideBusqueda(corsa, '014')).toBe(true);
    expect(coincideBusqueda(corsa, 'mc-014')).toBe(true);
    expect(coincideBusqueda(corsa, 'MC014')).toBe(true);
    expect(coincideBusqueda(uno, '014')).toBe(false);
  });

  it('la patente se encuentra sin importar espacios ni guiones', () => {
    expect(coincideBusqueda(corsa, 'ab 123')).toBe(true);
    expect(coincideBusqueda(corsa, 'ab123')).toBe(true);
    expect(coincideBusqueda(corsa, 'AB-123')).toBe(true);
    expect(coincideBusqueda(uno, 'ab123')).toBe(false);
  });

  it('busca en marca, modelo, código y patente a la vez', () => {
    expect(coincideBusqueda(corsa, 'chevrolet')).toBe(true);
    expect(coincideBusqueda(corsa, 'chevrolet corsa')).toBe(true);
    expect(coincideBusqueda(uno, 'fiat')).toBe(true);
  });

  it('un texto vacío o de solo espacios coincide con todo', () => {
    expect(coincideBusqueda(corsa, '')).toBe(true);
    expect(coincideBusqueda(corsa, '   ')).toBe(true);
  });

  it('un texto que no aparece en ningún campo no coincide', () => {
    expect(coincideBusqueda(corsa, 'ford')).toBe(false);
  });
});
