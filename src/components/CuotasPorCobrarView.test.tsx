import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { CuotasPorCobrarView } from './CuotasPorCobrarView';
import type { CuotaPorCobrar } from '../lib/vehiculos/vehiculos-service';

const cuota = (over: Partial<CuotaPorCobrar>): CuotaPorCobrar => ({
  cuotaId: 'c1', ventaId: 'ven1', numero: 2, totalCuotas: 4, monto: 500000, cobrado: 0, saldo: 500000,
  estado: 'pendiente', vencimiento: '2027-01-15', vehiculoCodigo: 'MC-014', comprador: 'Pedro',
  compradorTelefono: '1155', ...over,
});

describe('CuotasPorCobrarView', () => {
  it('cada cuota muestra vencimiento, comprador, teléfono, vehículo, "Cuota n de N", monto, lo que falta y estado', () => {
    render(<CuotasPorCobrarView cuotas={[cuota({})]} onCobrar={vi.fn()} onVolver={vi.fn()} />);

    const tarjeta = screen.getByText('Pedro').closest('article') as HTMLElement;
    expect(within(tarjeta).getByText('15/01/2027')).toBeInTheDocument();
    expect(within(tarjeta).getByText('1155')).toBeInTheDocument();
    expect(within(tarjeta).getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:1155');
    expect(within(tarjeta).getByText('MC-014')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Cuota 2 de 4')).toBeInTheDocument();
    expect(within(tarjeta).getByText('$ 500.000')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Falta $ 500.000')).toBeInTheDocument();
    expect(within(tarjeta).getByText('Pendiente')).toBeInTheDocument();
  });

  it('las vencidas van arriba y en rojo', () => {
    render(
      <CuotasPorCobrarView
        cuotas={[
          cuota({ cuotaId: 'c-enero', comprador: 'Lucía', vencimiento: '2027-01-15' }),
          cuota({ cuotaId: 'c-vencida', comprador: 'Pedro', vencimiento: '2026-10-15', estado: 'vencida' }),
        ]}
        onCobrar={vi.fn()}
        onVolver={vi.fn()}
      />
    );

    const tarjetas = screen.getAllByRole('article');
    expect(tarjetas[0]).toHaveTextContent('Pedro');
    expect(tarjetas[0]).toHaveClass('border-red-400');
    expect(tarjetas[1]).not.toHaveClass('border-red-400');
  });

  it('una parcial dice "Cobrado $ X de $ Y"', () => {
    render(
      <CuotasPorCobrarView
        cuotas={[cuota({ cobrado: 200000, saldo: 300000, estado: 'parcial' })]}
        onCobrar={vi.fn()}
        onVolver={vi.fn()}
      />
    );

    expect(screen.getByText('Cobrado $ 200.000 de $ 500.000')).toBeInTheDocument();
  });

  it('sin cuotas pendientes dice que no hay cuotas por cobrar', () => {
    render(<CuotasPorCobrarView cuotas={[]} onCobrar={vi.fn()} onVolver={vi.fn()} />);

    expect(screen.getByText('No hay cuotas por cobrar')).toBeInTheDocument();
  });

  it('tocar Cobrar en una cuota la abre para cobrar', () => {
    const onCobrar = vi.fn();
    render(<CuotasPorCobrarView cuotas={[cuota({})]} onCobrar={onCobrar} onVolver={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /cobrar/i }));

    expect(onCobrar).toHaveBeenCalledWith(expect.objectContaining({ cuotaId: 'c1', saldo: 500000 }));
  });
});
