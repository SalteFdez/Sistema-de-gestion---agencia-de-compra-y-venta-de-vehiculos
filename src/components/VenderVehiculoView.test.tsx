import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VenderVehiculoView } from './VenderVehiculoView';
import type { VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const enStock: VehiculoItem = {
  id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null,
  estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-13',
};
const vendido: VehiculoItem = {
  id: 'v2', codigo: 'MC-002', marca: 'Ford', modelo: 'Ka', anio: 2012, color: null,
  estado: 'vendido', fotoUrl: null, fechaIngreso: '2026-11-13',
};

describe('VenderVehiculoView: elegir vehículo', () => {
  it('solo lista los vehículos en stock', () => {
    render(<VenderVehiculoView vehiculos={[enStock, vendido]} cuentas={[]} onVolver={vi.fn()} />);

    expect(screen.getByText('MC-001')).toBeInTheDocument();
    expect(screen.queryByText('MC-002')).not.toBeInTheDocument();
  });

  it('al elegir un vehículo abre los datos de la venta, con Confirmar deshabilitado al principio', () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

    render(<VenderVehiculoView vehiculos={[enStock]} cuentas={cuentas} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('MC-001'));

    expect(screen.getByRole('heading', { name: /datos de la venta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/precio de venta/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar/i })).toBeDisabled();
  });

  it('con precio y cobros que cierran, Confirmar se habilita', () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

    render(<VenderVehiculoView vehiculos={[enStock]} cuentas={cuentas} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('MC-001'));
    fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: '6000000' } });

    expect(screen.getByRole('button', { name: /continuar/i })).toBeEnabled();
  });

  it('al confirmar, guarda la venta y muestra el código, el resumen y la ganancia', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
    const onRegistrar = vi.fn().mockResolvedValue({ success: true, ventaId: 'ven1', codigo: 'MC-001', ganancia: 1500000 });

    render(
      <VenderVehiculoView vehiculos={[enStock]} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.click(screen.getByText('MC-001'));
    fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: '6000000' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar venta/i }));

    expect(await screen.findByTestId('codigo-venta')).toHaveTextContent('MC-001');
    expect(screen.getByText('Vendiste MC-001 en $ 6.000.000 · Entraron $ 6.000.000 en Caja efectivo')).toBeInTheDocument();
    expect(screen.getByText(/ganancia \$ 1\.500\.000/i)).toBeInTheDocument();
    expect(onRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        vehiculoId: 'v1',
        precio: 6000000,
        cobros: [{ cuentaId: 'c1', monto: 6000000 }],
      })
    );
  });

  it('si la venta no se registra, muestra el motivo y conserva los datos cargados', async () => {
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
    const onRegistrar = vi.fn().mockResolvedValue({
      success: false,
      error: 'MC-001 ya está vendido. No se guardó nada.',
    });

    render(
      <VenderVehiculoView vehiculos={[enStock]} cuentas={cuentas} onVolver={vi.fn()} onRegistrar={onRegistrar} />
    );

    fireEvent.click(screen.getByText('MC-001'));
    fireEvent.change(screen.getByLabelText(/precio de venta/i), { target: { value: '6000000' } });
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar venta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('MC-001 ya está vendido. No se guardó nada.');
    expect(screen.queryByTestId('codigo-venta')).not.toBeInTheDocument();
    // El error aparece en la revisión, que sigue lista para reintentar
    expect(screen.getByRole('button', { name: /confirmar venta/i })).toBeEnabled();
    // Corregir vuelve a los datos con lo cargado
    fireEvent.click(screen.getByRole('button', { name: /^corregir$/i }));
    expect(screen.getByLabelText(/precio de venta/i)).toHaveValue('$ 6.000.000');
    expect(screen.getByRole('button', { name: /continuar/i })).toBeEnabled();
  });

  it('sin cuentas cargadas, avisa en lugar del formulario de venta', () => {
    render(<VenderVehiculoView vehiculos={[enStock]} cuentas={[]} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('MC-001'));

    expect(screen.getByText(/no hay cuentas cargadas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/precio de venta/i)).not.toBeInTheDocument();
  });

  it('si no hay vehículos en stock, avisa en lugar de la lista', () => {
    render(<VenderVehiculoView vehiculos={[vendido]} cuentas={[]} onVolver={vi.fn()} />);

    expect(screen.getByText(/no hay vehículos en stock para vender/i)).toBeInTheDocument();
  });
});
