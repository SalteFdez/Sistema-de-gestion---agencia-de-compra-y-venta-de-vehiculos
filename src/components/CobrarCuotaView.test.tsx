import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CobrarCuotaView } from './CobrarCuotaView';
import type { CuotaPorCobrar } from '../lib/vehiculos/vehiculos-service';

const cuota: CuotaPorCobrar = {
  cuotaId: 'c2', ventaId: 'ven1', numero: 2, totalCuotas: 4, monto: 500000, cobrado: 0, saldo: 500000,
  estado: 'pendiente', vencimiento: '2027-01-15', vehiculoCodigo: 'MC-014', comprador: 'Pedro',
  compradorTelefono: null,
};

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', saldo: 3000000 },
  { id: 'c2', nombre: 'Banco', saldo: 1500000 },
];

describe('CobrarCuotaView', () => {
  it('el monto viene precargado con lo que falta de la cuota', () => {
    render(<CobrarCuotaView cuota={cuota} cuentas={cuentas} onCobrar={vi.fn()} onVolver={vi.fn()} />);

    expect(screen.getByLabelText('Monto a cobrar ($)')).toHaveValue('$ 500.000');
  });

  it('se puede bajar el monto para un cobro parcial, y se elige la cuenta donde entró', () => {
    const onCobrar = vi.fn().mockResolvedValue({ success: true });
    render(<CobrarCuotaView cuota={cuota} cuentas={cuentas} onCobrar={onCobrar} onVolver={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto a cobrar ($)'), { target: { value: '200000' } });
    fireEvent.click(screen.getByRole('button', { name: /banco/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    expect(onCobrar).toHaveBeenCalledWith({ cuotaId: 'c2', cuentaId: 'c2', monto: 200000, saldo: 500000 });
  });

  it('no deja cobrar más que lo que falta ni 0, y no se puede confirmar sin cuenta', () => {
    render(<CobrarCuotaView cuota={cuota} cuentas={cuentas} onCobrar={vi.fn()} onVolver={vi.fn()} />);
    const confirmar = screen.getByRole('button', { name: 'Confirmar cobro' });

    fireEvent.click(screen.getByRole('button', { name: /banco/i }));
    fireEvent.change(screen.getByLabelText('Monto a cobrar ($)'), { target: { value: '600000' } });
    expect(confirmar).toBeDisabled();
    expect(screen.getByText(/solo quedan \$ 500\.000/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Monto a cobrar ($)'), { target: { value: '0' } });
    expect(confirmar).toBeDisabled();
  });

  it('al cobrar bien muestra el resumen con la cuota, el vehículo y la cuenta', async () => {
    const onCobrar = vi.fn().mockResolvedValue({ success: true });
    render(<CobrarCuotaView cuota={cuota} cuentas={cuentas} onCobrar={onCobrar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /banco/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Cobraste $ 500.000 de la cuota 2 de 4 de MC-014 · entró en Banco'
    );
  });

  it('si el cobro falla, muestra el error y deja lo cargado', async () => {
    const onCobrar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión. No se pudo confirmar si se cobró.' });
    render(<CobrarCuotaView cuota={cuota} cuentas={cuentas} onCobrar={onCobrar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /banco/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo confirmar/i);
    expect(screen.getByLabelText('Monto a cobrar ($)')).toHaveValue('$ 500.000');
  });
});
