import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { BalancesView } from './BalancesView';

describe('BalancesView: Por cobrar', () => {
  it('muestra la tarjeta Por cobrar con el total que queda por cobrar', () => {
    render(
      <BalancesView totalDisponible={1500000} cuentas={[]} porCobrar={2000000} onVolver={vi.fn()} onIrACuentas={vi.fn()} />
    );

    const tarjeta = screen.getByText('Por cobrar').closest('section') as HTMLElement;
    expect(within(tarjeta).getByText('$ 2.000.000')).toBeInTheDocument();
  });

  it('el Dinero disponible no cambia por lo que queda por cobrar', () => {
    render(
      <BalancesView totalDisponible={1500000} cuentas={[]} porCobrar={2000000} onVolver={vi.fn()} onIrACuentas={vi.fn()} />
    );

    expect(screen.getByTestId('total-disponible')).toHaveTextContent('$ 1.500.000');
  });

  it('si falla la lectura de lo que queda por cobrar, avisa sin tapar el dinero disponible', () => {
    render(
      <BalancesView totalDisponible={1500000} cuentas={[]} errorPorCobrar onVolver={vi.fn()} onIrACuentas={vi.fn()} />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo cargar lo que queda por cobrar/i);
    expect(screen.getByTestId('total-disponible')).toHaveTextContent('$ 1.500.000');
  });
});
