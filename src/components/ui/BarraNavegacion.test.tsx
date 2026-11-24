import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { BarraNavegacion } from './BarraNavegacion';

describe('BarraNavegacion', () => {
  it('muestra las 4 pestañas en orden: Vehículos, Caja, Movimientos y Más', () => {
    render(<BarraNavegacion pestanaActiva="home" onSeleccionar={vi.fn()} />);

    const nav = screen.getByRole('navigation', { name: /navegación principal/i });
    const etiquetas = within(nav).getAllByRole('button').map((b) => b.textContent);
    expect(etiquetas).toEqual(['Vehículos', 'Caja', 'Movimientos', 'Más']);
  });

  it('la pestaña Caja lleva a la vista de inicio (home)', () => {
    const onSeleccionar = vi.fn();
    render(<BarraNavegacion pestanaActiva="vehiculos" onSeleccionar={onSeleccionar} />);

    fireEvent.click(screen.getByRole('button', { name: /caja/i }));
    expect(onSeleccionar).toHaveBeenCalledWith('home');
  });

  it('destaca la pestaña activa con aria-current="page" y color de marca', () => {
    const { rerender } = render(<BarraNavegacion pestanaActiva="home" onSeleccionar={vi.fn()} />);

    const inicioBtn = screen.getByRole('button', { name: /caja/i });
    expect(inicioBtn).toHaveAttribute('aria-current', 'page');
    expect(inicioBtn).toHaveClass('text-marca');

    const masBtn = screen.getByRole('button', { name: /más/i });
    expect(masBtn).not.toHaveAttribute('aria-current');

    rerender(<BarraNavegacion pestanaActiva="mas" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: /más/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /más/i })).toHaveClass('text-marca');
  });

  it('llama a onSeleccionar con la pestaña correspondiente al hacer clic', () => {
    const onSeleccionar = vi.fn();
    render(<BarraNavegacion pestanaActiva="home" onSeleccionar={onSeleccionar} />);

    fireEvent.click(screen.getByRole('button', { name: /vehículos/i }));
    expect(onSeleccionar).toHaveBeenCalledWith('vehiculos');

    fireEvent.click(screen.getByRole('button', { name: /movimientos/i }));
    expect(onSeleccionar).toHaveBeenCalledWith('movimientos');

    fireEvent.click(screen.getByRole('button', { name: /más/i }));
    expect(onSeleccionar).toHaveBeenCalledWith('mas');
  });
});
