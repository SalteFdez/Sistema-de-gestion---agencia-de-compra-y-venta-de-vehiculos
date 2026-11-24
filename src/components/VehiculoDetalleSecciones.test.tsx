import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import type { DetalleVehiculo } from '../lib/vehiculos/vehiculos-service';

const enStock: DetalleVehiculo = {
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
  pagos: [{ cuentaNombre: 'Caja efectivo', monto: 3000000 }],
  venta: null,
  gastos: [],
};

const vendidoConCuotas: DetalleVehiculo = {
  ...enStock,
  estado: 'vendido',
  venta: {
    ventaId: 'ven1',
    fecha: '2026-11-18',
    comprador: 'Pedro',
    precioVenta: 5000000,
    ganancia: 1000000,
    cobros: [{ cuentaNombre: 'Caja efectivo', monto: 3000000 }],
    financiacion: {
      monto: 2000000,
      cantidadCuotas: 4,
      fechaPrimera: '2026-12-15',
      faltaCobrar: 2000000,
      cuotas: [
        { numero: 1, monto: 500000, fechaVencimiento: '2026-12-15', estado: 'pendiente' },
        { numero: 2, monto: 500000, fechaVencimiento: '2027-01-15', estado: 'pendiente' },
        { numero: 3, monto: 500000, fechaVencimiento: '2027-02-15', estado: 'pendiente' },
        { numero: 4, monto: 500000, fechaVencimiento: '2027-03-15', estado: 'pendiente' },
      ],
    },
  },
};

// El bloque plegable que contiene el título (el <details> de la sección)
const seccion = (titulo: string) => screen.getByRole('heading', { name: titulo }).closest('details') as HTMLElement;
const resumen = (titulo: string) => screen.getByRole('heading', { name: titulo }).closest('summary') as HTMLElement;

describe('VehiculoDetalleView: secciones plegables', () => {
  it('Datos arranca abierta; Compra, Gastos, Venta y Cuotas arrancan cerradas', () => {
    render(<VehiculoDetalleView detalle={vendidoConCuotas} fotoUrl={null} onVolver={vi.fn()} />);

    expect(seccion('Datos')).toHaveAttribute('open');
    expect(seccion('Compra')).not.toHaveAttribute('open');
    expect(seccion('Gastos')).not.toHaveAttribute('open');
    expect(seccion('Venta')).not.toHaveAttribute('open');
    expect(seccion('Cuotas')).not.toHaveAttribute('open');
  });

  it('Datos muestra fecha de ingreso, origen, vendedor, patente y color sin abrir nada más', () => {
    render(<VehiculoDetalleView detalle={enStock} fotoUrl={null} onVolver={vi.fn()} />);

    expect(screen.getByText('14/11/2026')).toBeVisible();
    expect(within(seccion('Datos')).getByText('Compra')).toBeVisible();
    expect(screen.getByText('Juan Pérez')).toBeVisible();
    expect(screen.getByText('AB123CD')).toBeVisible();
    expect(screen.getByText('Rojo')).toBeVisible();
  });

  it('Compra aparece solo si el origen es compra', () => {
    const { unmount } = render(<VehiculoDetalleView detalle={enStock} fotoUrl={null} onVolver={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Compra' })).toBeInTheDocument();
    unmount();

    const { unmount: otro } = render(
      <VehiculoDetalleView detalle={{ ...enStock, origen: 'inventario_inicial' }} fotoUrl={null} onVolver={vi.fn()} />
    );
    expect(screen.queryByRole('heading', { name: 'Compra' })).not.toBeInTheDocument();
    otro();

    render(<VehiculoDetalleView detalle={{ ...enStock, origen: 'permuta' }} fotoUrl={null} onVolver={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: 'Compra' })).not.toBeInTheDocument();
  });

  it('Gastos siempre aparece, con "Todavía no hay gastos cargados" si no hay ninguno', () => {
    render(<VehiculoDetalleView detalle={{ ...enStock, origen: 'permuta' }} fotoUrl={null} onVolver={vi.fn()} />);

    expect(seccion('Gastos')).toBeInTheDocument();
    expect(within(seccion('Gastos')).getByText('Todavía no hay gastos cargados')).toBeInTheDocument();
  });

  it('Venta aparece solo si el auto se vendió', () => {
    const { unmount } = render(<VehiculoDetalleView detalle={enStock} fotoUrl={null} onVolver={vi.fn()} />);
    expect(screen.queryByRole('heading', { name: 'Venta' })).not.toBeInTheDocument();
    unmount();

    render(<VehiculoDetalleView detalle={vendidoConCuotas} fotoUrl={null} onVolver={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Venta' })).toBeInTheDocument();
  });

  it('Cuotas es su propia sección, fuera de Venta, y solo aparece con financiación', () => {
    const { unmount } = render(
      <VehiculoDetalleView detalle={{ ...vendidoConCuotas, venta: { ...vendidoConCuotas.venta!, financiacion: undefined } }} fotoUrl={null} onVolver={vi.fn()} />
    );
    expect(screen.queryByRole('heading', { name: 'Cuotas' })).not.toBeInTheDocument();
    unmount();

    render(<VehiculoDetalleView detalle={vendidoConCuotas} fotoUrl={null} onVolver={vi.fn()} />);
    const lista = screen.getByRole('list', { name: 'Cuotas financiadas' });
    expect(seccion('Cuotas')).toContainElement(lista);
    expect(seccion('Venta')).not.toContainElement(lista);
  });

  it('un toque en el título abre la sección y otro la cierra', () => {
    render(<VehiculoDetalleView detalle={vendidoConCuotas} fotoUrl={null} onVolver={vi.fn()} />);

    fireEvent.click(resumen('Gastos'));
    expect(seccion('Gastos')).toHaveAttribute('open');

    fireEvent.click(resumen('Gastos'));
    expect(seccion('Gastos')).not.toHaveAttribute('open');
  });

  it('al volver a entrar, las secciones vuelven a su estado inicial (no se recuerda lo abierto)', () => {
    const { unmount } = render(<VehiculoDetalleView detalle={vendidoConCuotas} fotoUrl={null} onVolver={vi.fn()} />);
    fireEvent.click(resumen('Venta'));
    expect(seccion('Venta')).toHaveAttribute('open');
    unmount();

    render(<VehiculoDetalleView detalle={vendidoConCuotas} fotoUrl={null} onVolver={vi.fn()} />);
    expect(seccion('Venta')).not.toHaveAttribute('open');
    expect(seccion('Datos')).toHaveAttribute('open');
  });
});
