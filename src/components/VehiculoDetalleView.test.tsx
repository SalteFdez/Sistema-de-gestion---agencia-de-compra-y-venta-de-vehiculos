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
};

describe('VehiculoDetalleView', () => {
  it('muestra foto, código, estado, datos, fecha en dd/mm/aaaa, origen en palabras y vendedor', () => {
    render(
      <VehiculoDetalleView
        detalle={detalleBase}
        fotoUrl="https://storage.test/ka.jpg"
        onVolver={vi.fn()}
      />
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://storage.test/ka.jpg');
    expect(screen.getByText('MC-002')).toBeInTheDocument();
    expect(screen.getByText('En stock')).toBeInTheDocument();
    expect(screen.getByText(/Ford Ka/)).toBeInTheDocument();
    expect(screen.getByText(/2012/)).toBeInTheDocument();
    expect(screen.getByText(/Rojo/)).toBeInTheDocument();
    expect(screen.getByText(/AB123CD/)).toBeInTheDocument();
    expect(screen.getByText('14/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Compra')).toBeInTheDocument();
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
  });

  it('"Cómo se pagó" lista cada cuenta con su monto', () => {
    render(
      <VehiculoDetalleView
        detalle={{
          ...detalleBase,
          pagos: [
            { cuentaNombre: 'Caja efectivo', monto: 3000000 },
            { cuentaNombre: 'Banco Galicia', monto: 1500000 },
          ],
        }}
        fotoUrl={null}
        onVolver={vi.fn()}
      />
    );

    const seccion = screen.getByRole('heading', { name: 'Cómo se pagó' }).closest('section') as HTMLElement;
    expect(within(seccion).getByText('Caja efectivo')).toBeInTheDocument();
    expect(within(seccion).getByText('$ 3.000.000')).toBeInTheDocument();
    expect(within(seccion).getByText('Banco Galicia')).toBeInTheDocument();
    expect(within(seccion).getByText('$ 1.500.000')).toBeInTheDocument();
  });

  it('el bloque de costo muestra valor de ingreso, gastos en $ 0 y el costo real', () => {
    render(<VehiculoDetalleView detalle={detalleBase} fotoUrl={null} onVolver={vi.fn()} />);

    expect(screen.getByText('Valor de ingreso')).toBeInTheDocument();
    expect(screen.getByText('Gastos asignados')).toBeInTheDocument();
    expect(screen.getByText('$ 0')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay gastos cargados')).toBeInTheDocument();
    expect(screen.getByTestId('costo-real')).toHaveTextContent('$ 3.000.000');
  });

  it('con valor de ingreso $ 0 aclara "Costo desconocido"', () => {
    render(
      <VehiculoDetalleView
        detalle={{ ...detalleBase, valorIngreso: 0, costoReal: 0 }}
        fotoUrl={null}
        onVolver={vi.fn()}
      />
    );

    expect(screen.getByText('Costo desconocido')).toBeInTheDocument();
  });

  it('un vehículo de stock existente dice que no tiene pagos registrados', () => {
    render(
      <VehiculoDetalleView
        detalle={{ ...detalleBase, origen: 'inventario_inicial', pagos: [] }}
        fotoUrl={null}
        onVolver={vi.fn()}
      />
    );

    expect(screen.getByText('Cargado como stock existente, sin pagos registrados')).toBeInTheDocument();
  });
});
