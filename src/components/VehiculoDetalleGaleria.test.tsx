import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import type { DetalleVehiculo } from '../lib/vehiculos/vehiculos-service';

const detalle: DetalleVehiculo = {
  id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
  estado: 'en_stock', origen: 'compra', fechaIngreso: '2026-11-01', vendedor: null, valorIngreso: 3000000,
  gastosAsignados: 0, costoReal: 3000000, pagos: [], venta: null, gastos: [],
  fotos: [
    { id: 'f1', ruta: 'v1/a.jpg', url: 'https://storage.test/a', orden: 1, esPrincipal: true },
    { id: 'f2', ruta: 'v1/b.jpg', url: 'https://storage.test/b', orden: 2, esPrincipal: false },
  ],
};

describe('VehiculoDetalleView: galería', () => {
  it('con fotos, muestra la galería en lugar de una sola foto', () => {
    render(<VehiculoDetalleView detalle={detalle} fotoUrl={null} onVolver={vi.fn()} onUsarComoPrincipal={vi.fn()} onQuitarFoto={vi.fn()} onAgregarFotos={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Foto grande' })).toHaveAttribute('src', 'https://storage.test/a');
    expect(screen.getByRole('button', { name: 'Foto 2' })).toBeInTheDocument();
  });

  it('un auto anulado muestra sus fotos sin acciones', () => {
    const anulado: DetalleVehiculo = { ...detalle, anulado: { por: 'Antonio', motivo: 'error', el: '2026-11-14T15:30:00+00:00' } };
    render(<VehiculoDetalleView detalle={anulado} fotoUrl={null} onVolver={vi.fn()} onUsarComoPrincipal={vi.fn()} onQuitarFoto={vi.fn()} onAgregarFotos={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Foto grande' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar fotos' })).not.toBeInTheDocument();
  });
});
