import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { MovimientoSocioView } from './MovimientoSocioView';

const socios = [
  { id: 'u1', nombre: 'Agustín Fernandez' },
  { id: 'u2', nombre: 'Lautaro' },
];
const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', saldo: 3000000 },
  { id: 'c2', nombre: 'Banco', saldo: 1500000 },
];

describe('MovimientoSocioView: selección y saldo', () => {
  it('el socio y la cuenta elegidos se ven seleccionados, y cada cuenta muestra su saldo', () => {
    render(
      <MovimientoSocioView
        modo="aporte"
        socios={socios}
        socioActualId="u1"
        cuentas={cuentas}
        onRegistrar={vi.fn()}
        onVolver={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /caja efectivo/i })).toHaveTextContent('Caja efectivo · $ 3.000.000');

    const socio = within(screen.getByRole('group', { name: 'Socio' }));
    expect(socio.getByRole('button', { name: 'Agustín Fernandez' })).toHaveClass('bg-blue-600', 'text-white');
    fireEvent.click(socio.getByRole('button', { name: 'Lautaro' }));
    expect(socio.getByRole('button', { name: 'Lautaro' })).toHaveAttribute('aria-pressed', 'true');
    expect(socio.getByRole('button', { name: 'Lautaro' })).toHaveClass('bg-blue-600', 'text-white');
    expect(socio.getByRole('button', { name: 'Agustín Fernandez' })).toHaveAttribute('aria-pressed', 'false');
    expect(socio.getByRole('button', { name: 'Agustín Fernandez' })).not.toHaveClass('bg-blue-600');

    const cuenta = within(screen.getByRole('group', { name: 'Cuenta' }));
    fireEvent.click(cuenta.getByRole('button', { name: /banco/i }));
    expect(cuenta.getByRole('button', { name: /banco/i })).toHaveClass('bg-blue-600', 'text-white');
    expect(cuenta.getByRole('button', { name: /caja efectivo/i })).not.toHaveClass('bg-blue-600');
  });
});
