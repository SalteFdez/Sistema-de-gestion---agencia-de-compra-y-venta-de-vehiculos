import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import type { DetalleVehiculo } from '../lib/vehiculos/vehiculos-service';

const detalleBase: DetalleVehiculo = {
  id: 'v2',
  codigo: 'MC-002',
  marca: 'Ford',
  modelo: 'Ka',
  anio: 2012,
  color: 'Rojo',
  patente: 'AB123CD',
  estado: 'en_stock',
  origen: 'compra',
  fechaIngreso: '2026-11-14',
  vendedor: 'Juan Pérez',
  valorIngreso: 3000000,
  gastosAsignados: 0,
  costoReal: 3000000,
  pagos: [],
  venta: null,
  gastos: [],
};

describe('VehiculoDetalleView: acciones principales en una fila', () => {
  it('en stock: Vender y Agregar gasto están en la misma fila, a la vista sin abrir secciones', () => {
    render(
      <VehiculoDetalleView
        detalle={detalleBase}
        fotoUrl={null}
        onVolver={vi.fn()}
        onVender={vi.fn()}
        onAgregarGasto={vi.fn()}
      />
    );

    const fila = screen.getByTestId('acciones');
    expect(within(fila).getByRole('button', { name: 'Vender' })).toBeVisible();
    expect(within(fila).getByRole('button', { name: 'Agregar gasto' })).toBeVisible();
  });

  it('vendido: no ofrece Vender, pero sí Agregar gasto en la fila', () => {
    render(
      <VehiculoDetalleView
        detalle={{
          ...detalleBase,
          estado: 'vendido',
          venta: {
            ventaId: 'ven1',
            fecha: '2026-11-15',
            comprador: 'Pedro',
            precioVenta: 6000000,
            ganancia: 1500000,
            cobros: [{ cuentaNombre: 'Caja efectivo', monto: 6000000 }],
          },
        }}
        fotoUrl={null}
        onVolver={vi.fn()}
        onVender={vi.fn()}
        onAgregarGasto={vi.fn()}
      />
    );

    const fila = screen.getByTestId('acciones');
    expect(within(fila).queryByRole('button', { name: 'Vender' })).not.toBeInTheDocument();
    expect(within(fila).getByRole('button', { name: 'Agregar gasto' })).toBeVisible();
  });

  it('anulado: no hay fila de acciones, ni Vender ni Agregar gasto', () => {
    render(
      <VehiculoDetalleView
        detalle={{
          ...detalleBase,
          anulado: { por: 'Antonio', motivo: 'precio mal cargado', el: '2026-11-20T15:00:00-03:00' },
        }}
        fotoUrl={null}
        onVolver={vi.fn()}
        onVender={vi.fn()}
        onAgregarGasto={vi.fn()}
      />
    );

    expect(screen.queryByTestId('acciones')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vender' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar gasto' })).not.toBeInTheDocument();
  });
});
