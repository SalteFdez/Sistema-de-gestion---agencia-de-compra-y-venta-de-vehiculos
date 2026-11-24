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
      cantidadCuotas: 2,
      fechaPrimera: '2026-12-15',
      faltaCobrar: 2000000,
      cuotas: [
        { numero: 1, monto: 1000000, fechaVencimiento: '2026-12-15', estado: 'pendiente' },
        { numero: 2, monto: 1000000, fechaVencimiento: '2027-01-15', estado: 'pendiente' },
      ],
    },
  },
};

describe('VehiculoDetalleView: anular al final, separado del resto', () => {
  it('en stock: Anular compra va después de la última sección y fuera de ellas, a la vista', () => {
    render(<VehiculoDetalleView detalle={enStock} fotoUrl={null} onVolver={vi.fn()} onAnularVehiculo={vi.fn()} />);

    const anular = screen.getByRole('button', { name: 'Anular compra' });
    expect(anular).toBeVisible();
    expect(anular.closest('details')).toBeNull();

    const gastos = screen.getByRole('heading', { name: 'Gastos' }).closest('section') as HTMLElement;
    expect(gastos.compareDocumentPosition(anular) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('vendido con cuotas: Anular venta va después de Cuotas y fuera de ellas', () => {
    render(<VehiculoDetalleView detalle={vendidoConCuotas} fotoUrl={null} onVolver={vi.fn()} onAnularVenta={vi.fn()} />);

    const anular = screen.getByRole('button', { name: 'Anular venta' });
    expect(anular).toBeVisible();
    expect(anular.closest('details')).toBeNull();

    const cuotas = screen.getByRole('heading', { name: 'Cuotas' }).closest('section') as HTMLElement;
    expect(cuotas.compareDocumentPosition(anular) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Anular compra abre el mismo diálogo "¿Seguro?" con el motivo', () => {
    render(<VehiculoDetalleView detalle={enStock} fotoUrl={null} onVolver={vi.fn()} onAnularVehiculo={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anular compra' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('¿Seguro?')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/motivo/i)).toBeInTheDocument();
  });

  it('anulado: muestra el estado Anulado y el aviso, sin Anular, Vender ni Agregar gasto', () => {
    render(
      <VehiculoDetalleView
        detalle={{ ...enStock, anulado: { por: 'Antonio', motivo: 'precio mal cargado', el: '2026-11-20T15:00:00-03:00' } }}
        fotoUrl={null}
        onVolver={vi.fn()}
        onAnularVehiculo={vi.fn()}
        onVender={vi.fn()}
        onAgregarGasto={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Anulado por Antonio');
    expect(screen.getByText('Anulado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /anular/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vender' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar gasto' })).not.toBeInTheDocument();
  });
});
