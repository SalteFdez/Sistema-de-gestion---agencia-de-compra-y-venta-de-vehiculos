import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BalancesView } from './BalancesView';
import type { CuentaItem } from '../lib/cuentas/cuentas-service';

describe('BalancesView', () => {
  it('muestra estado vacío con "$ 0" y botón para cargar la primera cuenta si no hay cuentas', () => {
    const onIrACuentas = vi.fn();
    const onVolver = vi.fn();

    render(
      <BalancesView
        totalDisponible={0}
        cuentas={[]}
        onVolver={onVolver}
        onIrACuentas={onIrACuentas}
      />
    );

    expect(screen.getByText(/balances/i)).toBeInTheDocument();
    expect(screen.getByText(/dinero disponible/i)).toBeInTheDocument();
    // Muestra $ 0 en grande
    expect(screen.getByTestId('total-disponible')).toHaveTextContent('$ 0');
    expect(screen.getByText(/no hay cuentas cargadas todavía/i)).toBeInTheDocument();

    const btnCargarPrimera = screen.getByRole('button', { name: /cargar primera cuenta/i });
    expect(btnCargarPrimera).toBeInTheDocument();
    fireEvent.click(btnCargarPrimera);
    expect(onIrACuentas).toHaveBeenCalledTimes(1);

    const btnVolver = screen.getByRole('button', { name: /volver/i });
    fireEvent.click(btnVolver);
    expect(onVolver).toHaveBeenCalledTimes(1);
  });

  it('muestra el dinero disponible total y el detalle de cada cuenta con su saldo', () => {
    const cuentas: CuentaItem[] = [
      { id: '1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 500000 },
      { id: '2', nombre: 'Banco Galicia', tipo: 'banco', saldo: 1000000 },
    ];

    render(
      <BalancesView
        totalDisponible={1500000}
        cuentas={cuentas}
        onVolver={() => {}}
        onIrACuentas={() => {}}
      />
    );

    expect(screen.getByTestId('total-disponible')).toHaveTextContent('$ 1.500.000');

    expect(screen.getByText('Caja efectivo')).toBeInTheDocument();
    expect(screen.getByText('$ 500.000')).toBeInTheDocument();

    expect(screen.getByText('Banco Galicia')).toBeInTheDocument();
    expect(screen.getByText('$ 1.000.000')).toBeInTheDocument();
  });
});
