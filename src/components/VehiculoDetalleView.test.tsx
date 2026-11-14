import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
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

  it('un vehículo vendido muestra el bloque Venta: fecha, comprador, precio, cómo se cobró y ganancia', () => {
    render(
      <VehiculoDetalleView
        detalle={{
          ...detalleBase,
          estado: 'vendido',
          venta: {
            ventaId: 'ven1',
            fecha: '2026-11-14',
            comprador: 'Pedro',
            precioVenta: 6000000,
            ganancia: 1500000,
            cobros: [
              { cuentaNombre: 'Caja efectivo', monto: 4000000 },
              { cuentaNombre: 'Banco Galicia', monto: 2000000 },
            ],
          },
        }}
        fotoUrl={null}
        onVolver={vi.fn()}
      />
    );

    const seccion = screen.getByRole('heading', { name: 'Venta' }).closest('section') as HTMLElement;
    expect(within(seccion).getByText('14/11/2026')).toBeInTheDocument();
    expect(within(seccion).getByText('Pedro')).toBeInTheDocument();
    expect(within(seccion).getByText('$ 6.000.000')).toBeInTheDocument();
    expect(within(seccion).getByText('Cómo se cobró')).toBeInTheDocument();
    expect(within(seccion).getByText('Caja efectivo')).toBeInTheDocument();
    expect(within(seccion).getByText('$ 4.000.000')).toBeInTheDocument();
    expect(within(seccion).getByText('Ganancia $ 1.500.000')).toBeInTheDocument();
  });

  it('una venta por debajo del costo muestra "Pérdida" en rojo, y sin comprador no muestra la fila', () => {
    render(
      <VehiculoDetalleView
        detalle={{
          ...detalleBase,
          estado: 'vendido',
          venta: {
            ventaId: 'ven2',
            fecha: '2026-11-14',
            comprador: null,
            precioVenta: 2800000,
            ganancia: -200000,
            cobros: [{ cuentaNombre: 'Caja efectivo', monto: 2800000 }],
          },
        }}
        fotoUrl={null}
        onVolver={vi.fn()}
      />
    );

    const perdida = screen.getByText('Pérdida $ −200.000');
    expect(perdida).toHaveClass('text-red-600');
    expect(screen.queryByText('Comprador')).not.toBeInTheDocument();
  });

  it('"Gastos asignados" lista cada gasto (fecha, categoría, descripción, monto) y su total', () => {
    render(
      <VehiculoDetalleView
        detalle={{
          ...detalleBase,
          gastosAsignados: 250000,
          costoReal: 3250000,
          gastos: [
            { fecha: '2026-11-14', categoria: 'Mecánica', descripcion: 'Pintura puerta', monto: 250000 },
          ],
        }}
        fotoUrl={null}
        onVolver={vi.fn()}
      />
    );

    // La fecha del gasto también aparece como fecha de ingreso: buscamos dentro de la lista de gastos
    const lista = screen.getByText(/Pintura puerta/).closest('li') as HTMLElement;
    expect(within(lista).getByText('14/11/2026')).toBeInTheDocument();
    expect(screen.getByText(/Mecánica/)).toBeInTheDocument();
    expect(screen.getByText(/Pintura puerta/)).toBeInTheDocument();
    expect(screen.getAllByText('$ 250.000').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Todavía no hay gastos cargados')).not.toBeInTheDocument();
  });

  it('el botón "Agregar gasto" llama a la acción para cargar un gasto de este vehículo', () => {
    const onAgregarGasto = vi.fn();

    render(
      <VehiculoDetalleView detalle={detalleBase} fotoUrl={null} onVolver={vi.fn()} onAgregarGasto={onAgregarGasto} />
    );

    fireEvent.click(screen.getByRole('button', { name: /agregar gasto/i }));

    expect(onAgregarGasto).toHaveBeenCalledTimes(1);
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
