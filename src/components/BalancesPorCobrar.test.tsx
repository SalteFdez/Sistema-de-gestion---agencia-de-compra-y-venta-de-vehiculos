import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { BalancesView } from './BalancesView';

describe('BalancesView: próximas cuotas', () => {
  const cuota = (id: string, estado: string, vencimiento: string, comprador: string) => ({
    cuotaId: id, ventaId: 'ven1', numero: 1, totalCuotas: 4, monto: 500000, cobrado: 0, saldo: 500000,
    estado, vencimiento, vehiculoCodigo: 'MC-014', comprador, compradorTelefono: null,
  });

  it('debajo de Por cobrar muestra las próximas 3 cuotas, con las vencidas en rojo', () => {
    render(
      <BalancesView
        totalDisponible={1500000}
        cuentas={[]}
        porCobrar={2000000}
        proximasCuotas={[
          cuota('a', 'pendiente', '2027-03-15', 'Ana'),
          cuota('b', 'vencida', '2026-10-15', 'Pedro'),
          cuota('c', 'pendiente', '2027-01-15', 'Lucía'),
          cuota('d', 'pendiente', '2027-02-15', 'Mario'),
        ]}
        onVolver={vi.fn()}
        onIrACuentas={vi.fn()}
      />
    );

    const seccion = screen.getByRole('heading', { name: 'Próximas cuotas' }).closest('section') as HTMLElement;
    const items = within(seccion).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Pedro');
    expect(items[0]).toHaveClass('text-red-700');
    expect(within(seccion).getByText(/Mario/)).toBeInTheDocument();
    expect(within(seccion).queryByText(/Ana/)).not.toBeInTheDocument();
  });

  it('sin cuotas pendientes no muestra la sección', () => {
    render(
      <BalancesView totalDisponible={0} cuentas={[]} porCobrar={0} proximasCuotas={[]} onVolver={vi.fn()} onIrACuentas={vi.fn()} />
    );

    expect(screen.queryByRole('heading', { name: 'Próximas cuotas' })).not.toBeInTheDocument();
  });
});

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
