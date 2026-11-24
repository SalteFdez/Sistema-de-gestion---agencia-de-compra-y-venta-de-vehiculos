import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  fechaIngreso: '2026-10-10',
  vendedor: 'Juan Pérez',
  valorIngreso: 3000000,
  gastosAsignados: 0,
  costoReal: 3000000,
  pagos: [],
  venta: null,
  gastos: [],
};

const vendido = (ganancia: number): DetalleVehiculo => ({
  ...detalleBase,
  estado: 'vendido',
  fechaIngreso: '2026-11-01',
  venta: {
    ventaId: 'ven1',
    fecha: '2026-11-15',
    comprador: 'Pedro',
    precioVenta: 6000000,
    ganancia,
    cobros: [{ cuentaNombre: 'Caja efectivo', monto: 6000000 }],
  },
});

describe('VehiculoDetalleView: encabezado con días en stock y número clave', () => {
  beforeEach(() => {
    // Hoy en Buenos Aires: 24/11/2026
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T12:00:00-03:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('en stock: cuenta los días hasta hoy y muestra el costo real como número clave, sin abrir secciones', () => {
    render(<VehiculoDetalleView detalle={detalleBase} fotoUrl={null} onVolver={vi.fn()} />);

    expect(screen.getByText('45 días en stock')).toBeVisible();
    expect(screen.getByText('Costo real')).toBeVisible();
    expect(screen.getByTestId('costo-real')).toHaveTextContent('$ 3.000.000');
  });

  it('vendido: cuenta los días hasta la fecha de venta y la ganancia en verde como número clave', () => {
    render(<VehiculoDetalleView detalle={vendido(1500000)} fotoUrl={null} onVolver={vi.fn()} />);

    expect(screen.getByText('14 días en stock')).toBeVisible();
    const etiqueta = screen.getByText('Ganancia');
    expect(etiqueta).toBeVisible();
    expect(etiqueta).toHaveClass('text-green-700');
    const monto = screen.getByText('$ 1.500.000');
    expect(monto).toBeVisible();
    expect(monto).toHaveClass('text-green-700');
  });

  it('la ganancia va en dos bloques: etiqueta arriba y monto debajo, que no se corta (whitespace-nowrap)', () => {
    render(<VehiculoDetalleView detalle={vendido(1500000)} fotoUrl={null} onVolver={vi.fn()} />);

    const bloque = screen.getByTestId('numero-clave');
    expect(bloque).toContainElement(screen.getByText('Ganancia'));
    expect(screen.getByText('$ 1.500.000')).toHaveClass('whitespace-nowrap');
  });

  it('la ganancia aparece una sola vez: como número clave, no también en Venta', () => {
    render(<VehiculoDetalleView detalle={vendido(1500000)} fotoUrl={null} onVolver={vi.fn()} />);

    expect(screen.getAllByText('Ganancia')).toHaveLength(1);
  });

  it('un auto que ingresó hoy dice "Ingresó hoy" y uno de ayer dice "1 día en stock"', () => {
    const { unmount } = render(
      <VehiculoDetalleView detalle={{ ...detalleBase, fechaIngreso: '2026-11-24' }} fotoUrl={null} onVolver={vi.fn()} />
    );
    expect(screen.getByText('Ingresó hoy')).toBeVisible();
    unmount();

    render(<VehiculoDetalleView detalle={{ ...detalleBase, fechaIngreso: '2026-11-23' }} fotoUrl={null} onVolver={vi.fn()} />);
    expect(screen.getByText('1 día en stock')).toBeVisible();
  });

  it('anulado: no muestra número clave y los días siguen contando hasta hoy', () => {
    render(
      <VehiculoDetalleView
        detalle={{
          ...detalleBase,
          anulado: { por: 'Antonio', motivo: 'precio mal cargado', el: '2026-11-20T15:00:00-03:00' },
        }}
        fotoUrl={null}
        onVolver={vi.fn()}
      />
    );

    expect(screen.getByText('45 días en stock')).toBeVisible();
    expect(screen.queryByText('Costo real')).not.toBeInTheDocument();
    expect(screen.queryByTestId('costo-real')).not.toBeInTheDocument();
  });
});
