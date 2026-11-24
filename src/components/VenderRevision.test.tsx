import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { VenderVehiculoView } from './VenderVehiculoView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 9000000 }];
const auto = { id: 'v14', codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01', costoReal: 6500000 } as VehiculoItem;

const llenarVenta = () => {
  fireEvent.click(screen.getByText('MC-014'));
  fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: '8000000' } });
  fireEvent.change(screen.getByLabelText(/comprador/i), { target: { value: 'Juan Pérez' } });
};

describe('Vender: revisá antes de confirmar', () => {
  it('Continuar abre la revisión con el auto, el comprador, el precio, los cobros y la ganancia; Confirmar venta la manda una sola vez', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, codigo: 'MC-014', ganancia: 1500000, permutas: [] });
    render(<VenderVehiculoView vehiculos={[auto]} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />);
    llenarVenta();

    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));

    expect(screen.getByRole('heading', { name: /revisá antes de confirmar/i })).toBeInTheDocument();
    expect(screen.getByText(/MC-014 · Peugeot 208/)).toBeInTheDocument();
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
    expect(screen.getByText(/Caja efectivo/)).toBeInTheDocument();
    expect(screen.getByText('Ganancia estimada $ 1.500.000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirmar venta/i }));
    await waitFor(() => expect(onRegistrar).toHaveBeenCalledTimes(1));
    expect(onRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({ vehiculoId: 'v14', precio: 8000000, comprador: 'Juan Pérez', cobros: [{ cuentaId: 'c1', monto: 8000000 }] })
    );
  });

  it('Corregir vuelve a los datos sin perder lo cargado', () => {
    render(<VenderVehiculoView vehiculos={[auto]} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={vi.fn()} />);
    llenarVenta();
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));

    fireEvent.click(screen.getByRole('button', { name: /^corregir$/i }));

    expect(screen.getByLabelText(/precio de venta/i)).toHaveValue('$ 8.000.000');
    expect(screen.getByLabelText(/comprador/i)).toHaveValue('Juan Pérez');
  });
});
