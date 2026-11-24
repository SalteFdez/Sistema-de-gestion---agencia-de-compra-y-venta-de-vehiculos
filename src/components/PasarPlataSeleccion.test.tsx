import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { PasarPlataView } from './PasarPlataView';

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', saldo: 3000000 },
  { id: 'c2', nombre: 'Banco', saldo: 1500000 },
];

describe('PasarPlataView: selección y saldo', () => {
  it('cada cuenta muestra su saldo y la elegida como Desde o Hacia se ve seleccionada, las demás no', () => {
    render(<PasarPlataView cuentas={cuentas} onRegistrar={vi.fn()} onVolver={vi.fn()} />);

    const desde = within(screen.getByRole('group', { name: 'Desde' }));
    expect(desde.getByRole('button', { name: /caja efectivo/i })).toHaveTextContent('Caja efectivo · $ 3.000.000');
    expect(desde.getByRole('button', { name: /banco/i })).toHaveTextContent('Banco · $ 1.500.000');

    fireEvent.click(desde.getByRole('button', { name: /caja efectivo/i }));
    expect(desde.getByRole('button', { name: /caja efectivo/i })).toHaveAttribute('aria-pressed', 'true');
    expect(desde.getByRole('button', { name: /caja efectivo/i })).toHaveClass('bg-blue-600', 'text-white');

    const hacia = within(screen.getByRole('group', { name: 'Hacia' }));
    fireEvent.click(hacia.getByRole('button', { name: /banco/i }));
    expect(hacia.getByRole('button', { name: /banco/i })).toHaveAttribute('aria-pressed', 'true');
    expect(hacia.getByRole('button', { name: /banco/i })).toHaveClass('bg-blue-600', 'text-white');
  });
});
