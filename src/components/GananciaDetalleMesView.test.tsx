import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { GananciaDetalleMesView } from './GananciaDetalleMesView';
import type { DetalleMesGanancia } from '../lib/vehiculos/vehiculos-service';

const detalle: DetalleMesGanancia = {
  ventas: [
    { ventaId: 'ven1', fecha: '2026-11-05', codigo: 'MC-014', vehiculoId: 'v14', precio: 8000000, costoReal: 5000000, ganancia: 3000000 },
  ],
  gastosGenerales: [
    { fecha: '2026-11-03', categoria: 'Alquiler', descripcion: 'Local', monto: 500000 },
  ],
  gastosSinAsignar: [
    { gastoId: 'g9', fecha: '2026-11-06', proveedor: 'Mecánico Juan', categoria: 'Chapa', descripcion: null, pendiente: 200000 },
  ],
  ingresos: [
    { fecha: '2026-11-08', categoria: 'Comisión', descripcion: 'Intermediación', monto: 100000 },
  ],
};

const seccion = (titulo: string) => screen.getByRole('heading', { name: titulo }).closest('section') as HTMLElement;

describe('GananciaDetalleMesView', () => {
  it('muestra las cuatro secciones con sus totales', () => {
    render(<GananciaDetalleMesView mes="2026-11-01" detalle={detalle} onVerVenta={vi.fn()} onIrPendientes={vi.fn()} onVolver={vi.fn()} />);

    expect(within(seccion('Ventas')).getByText(/MC-014 · 05\/11/)).toBeInTheDocument();
    expect(within(seccion('Ventas')).getByText('Total $ 8.000.000')).toBeInTheDocument();
    expect(within(seccion('Gastos generales')).getByText('Total $ 500.000')).toBeInTheDocument();
    expect(within(seccion('Gastos sin asignar')).getByText('Total $ 200.000')).toBeInTheDocument();
    expect(within(seccion('Ingresos generales')).getByText('Total $ 100.000')).toBeInTheDocument();
  });

  it('cada venta muestra precio, costo real y ganancia; tocarla lleva al detalle del auto', () => {
    const onVerVenta = vi.fn();
    render(<GananciaDetalleMesView mes="2026-11-01" detalle={detalle} onVerVenta={onVerVenta} onIrPendientes={vi.fn()} onVolver={vi.fn()} />);

    const fila = within(seccion('Ventas')).getByRole('button', { name: /MC-014/ });
    expect(fila).toHaveTextContent('$ 8.000.000');
    expect(fila).toHaveTextContent('Costo $ 5.000.000');
    expect(fila).toHaveTextContent('Ganancia $ 3.000.000');

    fireEvent.click(fila);
    expect(onVerVenta).toHaveBeenCalledWith('v14');
  });

  it('gastos sin asignar tienen acceso a Pendientes de asignar', () => {
    const onIrPendientes = vi.fn();
    render(<GananciaDetalleMesView mes="2026-11-01" detalle={detalle} onVerVenta={vi.fn()} onIrPendientes={onIrPendientes} onVolver={vi.fn()} />);

    fireEvent.click(within(seccion('Gastos sin asignar')).getByRole('button', { name: /pendientes de asignar/i }));
    expect(onIrPendientes).toHaveBeenCalledTimes(1);
  });
});
