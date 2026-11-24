import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RegistrarGastoView } from './RegistrarGastoView';

const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
const categorias = [{ id: 'k1', nombre: 'Combustible' }];
const vehiculos = [
  { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
] as any[];

// Textos que marcan cada campo, en el orden en que deben aparecer
const orden = (...textos: string[]) => {
  const nodos = textos.map((t) => screen.getByText(t));
  for (let i = 0; i < nodos.length - 1; i++) {
    // El nodo i debe venir antes que el i+1 en el documento
    expect(nodos[i].compareDocumentPosition(nodos[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
};

describe('Registrar gasto: Confirmar al final', () => {
  it('en gasto general y en "Un vehículo", Confirmar queda fijo abajo; en varios, no', () => {
    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} vehiculos={vehiculos} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={vi.fn()} />
    );
    const confirmar = () => screen.getByRole('button', { name: /^confirmar$/i });

    fireEvent.click(screen.getByRole('button', { name: /general del negocio/i }));
    expect(confirmar().closest('.fixed')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /un vehículo/i }));
    expect(confirmar().closest('.fixed')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /varios vehículos/i }));
    expect(confirmar().closest('.fixed')).toBeNull();
  });
});

describe('Registrar gasto: orden de los campos', () => {
  it('en gasto a un vehículo: Monto, ¿A qué corresponde? y el selector, Categoría, Cuenta, Descripción y Proveedor, con Confirmar al final', () => {
    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} vehiculos={vehiculos} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /un vehículo/i }));

    orden('Monto ($)', '¿A qué corresponde?', 'Elegí el vehículo', 'Categoría', '¿De dónde salió la plata?', 'Descripción (opcional)', 'Proveedor (opcional)');
    const confirmar = screen.getByRole('button', { name: /^confirmar$/i });
    expect(screen.getByText('Proveedor (opcional)').compareDocumentPosition(confirmar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('en gasto repartido (varios), el reparto va justo debajo de ¿A qué corresponde?', () => {
    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} vehiculos={vehiculos} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /varios vehículos/i }));

    const reparto = screen.getByRole('button', { name: /agregar otro vehículo/i });
    orden('¿A qué corresponde?', 'Categoría', '¿De dónde salió la plata?', 'Descripción (opcional)');
    expect(screen.getByText('¿A qué corresponde?').compareDocumentPosition(reparto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reparto.compareDocumentPosition(screen.getByText('Categoría')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('en ingreso no aparecen ¿A qué corresponde? ni Proveedor', () => {
    render(
      <RegistrarGastoView modo="ingreso" categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrarIngreso={vi.fn()} />
    );

    expect(screen.queryByText('¿A qué corresponde?')).not.toBeInTheDocument();
    expect(screen.queryByText('Proveedor (opcional)')).not.toBeInTheDocument();
    orden('Monto ($)', 'Categoría', '¿De dónde salió la plata?', 'Descripción (opcional)');
  });
});
