import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BadgeEstado } from './BadgeEstado';
import { Cargando } from './Cargando';
import { ErrorReintentar } from './ErrorReintentar';

describe('BadgeEstado', () => {
  it('muestra el estado con su color: verde, ámbar, gris y rojo', () => {
    const { rerender } = render(<BadgeEstado estado="en_stock" />);
    expect(screen.getByText('En stock')).toHaveClass('bg-green-50', 'text-green-700');

    rerender(<BadgeEstado estado="reservado" />);
    expect(screen.getByText('Reservado')).toHaveClass('bg-amber-50', 'text-amber-800');

    rerender(<BadgeEstado estado="vendido" />);
    expect(screen.getByText('Vendido')).toHaveClass('bg-gray-100', 'text-gray-700');

    rerender(<BadgeEstado estado="anulado" />);
    expect(screen.getByText('Anulado')).toHaveClass('bg-red-50', 'text-red-700');
  });
});

describe('Cargando', () => {
  it('muestra "Cargando…" como estado en vivo', () => {
    render(<Cargando />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  });
});

describe('ErrorReintentar', () => {
  it('muestra "No se pudo cargar" y Reintentar vuelve a pedir', () => {
    const onReintentar = vi.fn();
    render(<ErrorReintentar onReintentar={onReintentar} />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});
