import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VehiculoDetalleView } from './VehiculoDetalleView';
import { MovimientosView } from './MovimientosView';

const detalle = {
  id: 'v1', codigo: 'MC-001', marca: 'Fiat', modelo: 'Uno', anio: 2010, color: null, patente: null,
  estado: 'en_stock', origen: 'compra', fechaIngreso: '2026-11-01', vendedor: null, valorIngreso: 3000000,
  gastosAsignados: 0, costoReal: 3000000, pagos: [], venta: null, gastos: [], fotos: undefined,
} as any;

const movimiento = {
  id: 'm1', fecha: '2026-11-10', tipo: 'ingreso_otro', monto: 80000, descripcion: 'Comisión',
  cuentaNombre: 'Banco', vehiculoId: null, vehiculoCodigo: null, categoriaNombre: null, creadoPor: 'Agustín Fernandez',
  anulado: false, anuladoPor: null, anuladoEl: null, motivoAnulacion: null, gastoId: null, ventaId: null,
  transferenciaId: null, cuentaContraparte: null, socioNombre: null,
} as any;

describe('VehiculoDetalleView: Anular Guardando…', () => {
  it('mientras anula, "Sí, anular" queda deshabilitado con "Guardando…" y un segundo clic no vuelve a anular', () => {
    const onAnularVehiculo = vi.fn(() => new Promise<never>(() => {}));
    render(<VehiculoDetalleView detalle={detalle} fotoUrl={null} onVolver={vi.fn()} onAnularVehiculo={onAnularVehiculo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anular compra' }));
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: 'cargué mal' } });
    fireEvent.click(screen.getByRole('button', { name: /sí, anular/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onAnularVehiculo).toHaveBeenCalledTimes(1);
  });

  it('si falla, "Sí, anular" vuelve a habilitarse con su texto y el motivo sigue cargado', async () => {
    const onAnularVehiculo = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(<VehiculoDetalleView detalle={detalle} fotoUrl={null} onVolver={vi.fn()} onAnularVehiculo={onAnularVehiculo} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anular compra' }));
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: 'cargué mal' } });
    fireEvent.click(screen.getByRole('button', { name: /sí, anular/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: /sí, anular/i })).toBeEnabled();
    expect(screen.getByLabelText(/motivo/i)).toHaveValue('cargué mal');
  });
});

describe('MovimientosView: Anular Guardando…', () => {
  it('mientras anula, "Anular movimiento" queda deshabilitado con "Guardando…" y un segundo clic no vuelve a anular', () => {
    const onAnular = vi.fn(() => new Promise<never>(() => {}));
    render(<MovimientosView movimientos={[movimiento]} onAnular={onAnular} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('Comisión'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: 'cargué mal' } });
    fireEvent.click(screen.getByRole('button', { name: /anular movimiento/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onAnular).toHaveBeenCalledTimes(1);
  });

  it('si falla, "Anular movimiento" vuelve a habilitarse con su texto y el motivo sigue cargado', async () => {
    const onAnular = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(<MovimientosView movimientos={[movimiento]} onAnular={onAnular} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('Comisión'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: 'cargué mal' } });
    fireEvent.click(screen.getByRole('button', { name: /anular movimiento/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: /anular movimiento/i })).toBeEnabled();
    expect(screen.getByLabelText(/motivo/i)).toHaveValue('cargué mal');
  });
});
