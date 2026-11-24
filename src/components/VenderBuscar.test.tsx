import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VenderVehiculoView } from './VenderVehiculoView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const vehiculos = [
  { id: 'v14', codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, patente: 'AB123CD', estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
  { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
] as VehiculoItem[];

describe('Vender: buscador de autos', () => {
  it('escribir "14" filtra la lista y deja solo MC-014', () => {
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={[]} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByRole('searchbox', { name: /buscar vehículos/i }), { target: { value: '14' } });

    expect(screen.getByText('MC-014')).toBeInTheDocument();
    expect(screen.queryByText('MC-001')).not.toBeInTheDocument();
  });
});
