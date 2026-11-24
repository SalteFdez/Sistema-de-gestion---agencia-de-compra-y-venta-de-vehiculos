import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RepartoCuentas } from './RepartoCuentas';

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 },
  { id: 'c2', nombre: 'Banco Galicia', tipo: 'banco' as const, saldo: 1000000 },
];

describe('RepartoCuentas', () => {
  it('precarga la primera cuenta con el precio completo', () => {
    const onChange = vi.fn();

    render(<RepartoCuentas cuentas={cuentas} precio={3000000} onChange={onChange} />);

    expect(screen.getByLabelText(/cuenta de pago 1/i)).toHaveValue('c1');
    expect(screen.getByLabelText('Monto pago 1')).toHaveValue('$ 3.000.000');
  });

  it('"+ Agregar otra cuenta" suma una fila con una cuenta que todavía no está en el reparto', () => {
    render(<RepartoCuentas cuentas={cuentas} precio={3000000} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /agregar otra cuenta/i }));

    expect(screen.getByLabelText(/cuenta de pago 2/i)).toHaveValue('c2');
    expect(screen.getByLabelText('Monto pago 2')).toHaveValue('');
  });

  it('muestra cuánto falta o sobra frente al precio según la suma de los cobros', () => {
    render(<RepartoCuentas cuentas={cuentas} precio={3000000} onChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto pago 1'), { target: { value: '1000000' } });
    expect(screen.getByText('Faltan $ 2.000.000')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Monto pago 1'), { target: { value: '3500000' } });
    expect(screen.getByText('Sobran $ 500.000')).toBeInTheDocument();
  });

  it('avisa si un cobro es 0', () => {
    render(<RepartoCuentas cuentas={cuentas} precio={3000000} onChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Monto pago 1'), { target: { value: '0' } });

    expect(screen.getByText('Cada pago tiene que ser mayor que 0')).toBeInTheDocument();
  });

  it('avisa si la misma cuenta aparece dos veces', () => {
    render(<RepartoCuentas cuentas={cuentas} precio={3000000} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /agregar otra cuenta/i }));
    fireEvent.change(screen.getByLabelText(/cuenta de pago 2/i), { target: { value: 'c1' } });

    expect(screen.getByText('No podés repetir una cuenta en los pagos')).toBeInTheDocument();
  });

  it('si las cuentas llegan después de montar, la primera fila se arma con la primera cuenta', () => {
    const { rerender } = render(<RepartoCuentas cuentas={[]} precio={3000000} onChange={vi.fn()} />);

    rerender(<RepartoCuentas cuentas={cuentas} precio={3000000} onChange={vi.fn()} />);

    expect(screen.getByLabelText(/cuenta de pago 1/i)).toHaveValue('c1');
    expect(screen.getByLabelText('Monto pago 1')).toHaveValue('$ 3.000.000');
  });

  it('con una sola fila, el monto sigue al precio cuando el precio cambia', () => {
    const { rerender } = render(<RepartoCuentas cuentas={cuentas} precio={3000000} onChange={vi.fn()} />);

    rerender(<RepartoCuentas cuentas={cuentas} precio={4000000} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Monto pago 1')).toHaveValue('$ 4.000.000');
  });

  it('se puede quitar una fila agregada, y la primera no se quita', () => {
    render(<RepartoCuentas cuentas={cuentas} precio={3000000} onChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /quitar pago 1/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /agregar otra cuenta/i }));
    fireEvent.click(screen.getByRole('button', { name: /quitar pago 2/i }));

    expect(screen.queryByLabelText(/cuenta de pago 2/i)).not.toBeInTheDocument();
  });
});
