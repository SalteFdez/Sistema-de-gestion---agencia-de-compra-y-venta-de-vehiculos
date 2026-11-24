import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import { VenderVehiculoView } from './VenderVehiculoView';
import type { DetalleVehiculo, VehiculoItem } from '../lib/vehiculos/vehiculos-service';

const detalle = (estado: DetalleVehiculo['estado']): DetalleVehiculo => ({
  id: 'v14', codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, patente: null,
  estado, origen: 'compra', fechaIngreso: '2026-11-01', vendedor: null, valorIngreso: 6500000,
  gastosAsignados: 0, costoReal: 6500000, pagos: [], venta: null, gastos: [],
});

const auto = { id: 'v14', codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01' } as VehiculoItem;

describe('Vender desde el detalle', () => {
  it('un auto en stock muestra el botón Vender, que lo abre; uno vendido no lo muestra', () => {
    const onVender = vi.fn();
    const { rerender } = render(<VehiculoDetalleView detalle={detalle('en_stock')} fotoUrl={null} onVolver={vi.fn()} onVender={onVender} />);

    fireEvent.click(screen.getByRole('button', { name: /^vender$/i }));
    expect(onVender).toHaveBeenCalledTimes(1);

    rerender(<VehiculoDetalleView detalle={detalle('vendido')} fotoUrl={null} onVolver={vi.fn()} onVender={onVender} />);
    expect(screen.queryByRole('button', { name: /^vender$/i })).not.toBeInTheDocument();
  });

  it('con el auto inicial, Vender arranca en los datos (sin la lista) y Volver regresa al detalle', () => {
    const onVolver = vi.fn();
    const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 9000000 }];
    render(<VenderVehiculoView vehiculos={[auto]} vehiculoInicial={auto} cuentas={cuentas} onVolver={onVolver} />);

    expect(screen.getByText('Datos de la venta · MC-014')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: /buscar vehículos/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(onVolver).toHaveBeenCalledTimes(1);
  });
});
