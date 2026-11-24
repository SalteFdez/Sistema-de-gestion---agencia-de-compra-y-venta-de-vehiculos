import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VenderVehiculoView } from './VenderVehiculoView';

const vehiculos = [
  { id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' },
] as any[];
const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

const llenarVenta = () => {
  fireEvent.click(screen.getByRole('heading', { name: 'Fiat Uno' }));
  fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: '1500000' } });
};

describe('VenderVehiculoView: Guardando…', () => {
  it('mientras guarda, Confirmar queda deshabilitado con "Guardando…" y un segundo clic no vuelve a registrar', () => {
    const onRegistrar = vi.fn(() => new Promise<never>(() => {}));
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />);

    llenarVenta();
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar venta/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('si falla, Confirmar vuelve a habilitarse con su texto y el precio sigue cargado', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(<VenderVehiculoView vehiculos={vehiculos} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />);

    llenarVenta();
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar venta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: /confirmar venta/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /^corregir$/i }));
    expect(screen.getByLabelText(/precio de venta/i)).toHaveValue('$ 1.500.000');
  });
});
