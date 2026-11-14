import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { MovimientosView } from './MovimientosView';
import type { MovimientoItem } from '../lib/vehiculos/vehiculos-service';

const base: MovimientoItem = {
  id: 'm1', fecha: '2026-11-14', tipo: 'ingreso_otro', monto: 80000, descripcion: 'Comisión por intermediación',
  cuentaNombre: 'Banco', vehiculoCodigo: null, categoriaNombre: 'Comisión', creadoPor: 'Lautaro',
  anulado: false, anuladoPor: null, anuladoEl: null, motivoAnulacion: null, gastoId: null, ventaId: null,
};

describe('MovimientosView', () => {
  it('muestra cada movimiento con fecha, tipo en palabras, cuenta, monto con signo y quién lo cargó', () => {
    render(<MovimientosView movimientos={[base]} onVolver={vi.fn()} />);

    const fila = screen.getByText('Comisión por intermediación').closest('li') as HTMLElement;
    expect(within(fila).getByText('14/11/2026')).toBeInTheDocument();
    expect(within(fila).getByText('Ingreso')).toBeInTheDocument();
    expect(within(fila).getByText('Banco')).toBeInTheDocument();
    expect(within(fila).getByText('+ $ 80.000')).toHaveClass('text-green-700');
    expect(within(fila).getByText('Cargó Lautaro')).toBeInTheDocument();
  });

  it('un gasto (sale de la cuenta) va en rojo; un anulado aparece tachado con quién y por qué', () => {
    const gasto: MovimientoItem = {
      ...base, id: 'm2', tipo: 'gasto', monto: -250000, descripcion: 'Pintura puerta',
      categoriaNombre: 'Chapa y pintura', vehiculoCodigo: 'MC-010', anulado: true, anuladoPor: 'Antonio',
      motivoAnulacion: 'cargué mal el monto', gastoId: 'g1',
    };

    render(<MovimientosView movimientos={[gasto]} onVolver={vi.fn()} />);

    const fila = screen.getByText('Pintura puerta').closest('li') as HTMLElement;
    expect(within(fila).getByText('- $ 250.000')).toHaveClass('text-red-600');
    expect(fila).toHaveClass('line-through');
    expect(within(fila).getByText(/Anulado por Antonio/)).toBeInTheDocument();
    expect(within(fila).getByText(/cargué mal el monto/)).toBeInTheDocument();
  });

  it('un anulado muestra "Anulado por X el dd/mm" con el día de la anulación (hora de Buenos Aires)', () => {
    const anulado: MovimientoItem = {
      ...base, id: 'm9', anulado: true, anuladoPor: 'Antonio', anuladoEl: '2026-11-14T15:30:00+00:00',
      motivoAnulacion: 'cargué mal', descripcion: 'Comisión anulada',
    };

    render(<MovimientosView movimientos={[anulado]} onVolver={vi.fn()} />);

    expect(screen.getByText(/Anulado por Antonio el 14\/11/)).toBeInTheDocument();
  });

  it('al tocar un movimiento se ve su detalle: "Anular" si se puede, o de qué operación es parte', () => {
    const compra: MovimientoItem = {
      ...base, id: 'm7', tipo: 'compra', monto: -4500000, descripcion: 'Compra MC-007',
      vehiculoCodigo: 'MC-007', categoriaNombre: null, gastoId: null,
    };

    render(
      <MovimientosView movimientos={[base, compra]} onAnular={vi.fn()} onVolver={vi.fn()} />
    );

    fireEvent.click(screen.getByText('Comisión por intermediación'));
    expect(screen.getByRole('button', { name: /anular/i })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Compra MC-007'));
    expect(screen.queryByRole('button', { name: /anular/i })).not.toBeInTheDocument();
    expect(screen.getByText('Es parte de la compra de MC-007')).toBeInTheDocument();
  });

  it('anular pide un motivo obligatorio y una confirmación que dice qué se anula', () => {
    const onAnular = vi.fn();
    render(<MovimientosView movimientos={[base]} onAnular={onAnular} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('Comisión por intermediación'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('Vas a anular el ingreso de $ 80.000');
    const confirmar = within(dialogo).getByRole('button', { name: /anular movimiento/i });
    expect(confirmar).toBeDisabled();

    fireEvent.change(within(dialogo).getByLabelText(/motivo/i), { target: { value: 'cargué mal el monto' } });
    expect(confirmar).toBeEnabled();

    fireEvent.click(confirmar);
    expect(onAnular).toHaveBeenCalledWith(base, 'cargué mal el monto');
  });

  it('si la anulación falla, muestra el motivo y deja el diálogo abierto con el motivo cargado', async () => {
    const onAnular = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión. No se anuló nada.' });
    render(<MovimientosView movimientos={[base]} onAnular={onAnular} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByText('Comisión por intermediación'));
    fireEvent.click(screen.getByRole('button', { name: /^anular$/i }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText(/motivo/i), { target: { value: 'cargué mal el monto' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: /anular movimiento/i }));

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(/no se anuló nada/i);
    expect(within(screen.getByRole('dialog')).getByLabelText(/motivo/i)).toHaveValue('cargué mal el monto');
  });

  it('"Ver más" aparece cuando puede haber más movimientos y los trae', () => {
    const onVerMas = vi.fn();

    const { rerender } = render(
      <MovimientosView movimientos={[base]} hayMas={false} onVerMas={onVerMas} onVolver={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: /ver más/i })).not.toBeInTheDocument();

    rerender(<MovimientosView movimientos={[base]} hayMas={true} onVerMas={onVerMas} onVolver={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /ver más/i }));

    expect(onVerMas).toHaveBeenCalledTimes(1);
  });
});
