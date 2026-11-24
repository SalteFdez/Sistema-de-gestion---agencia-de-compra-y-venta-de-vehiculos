import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Boton } from './Boton';

describe('Boton', () => {
  it('la variante primaria usa el color de marca y la de peligro el rojo', () => {
    const { rerender } = render(<Boton onClick={vi.fn()}>Confirmar</Boton>);
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveClass('bg-marca', 'text-white');

    rerender(<Boton variante="peligro" onClick={vi.fn()}>Anular</Boton>);
    expect(screen.getByRole('button', { name: 'Anular' })).toHaveClass('bg-red-600');
  });

  it('llama a onClick cuando no está guardando', () => {
    const onClick = vi.fn();
    render(<Boton onClick={onClick}>Confirmar</Boton>);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('con guardando, queda deshabilitado con "Guardando…" y no vuelve a llamar a onClick', () => {
    const onClick = vi.fn();
    render(<Boton guardando onClick={onClick}>Confirmar</Boton>);

    const boton = screen.getByRole('button', { name: 'Guardando…' });
    expect(boton).toBeDisabled();
    fireEvent.click(boton);
    expect(onClick).not.toHaveBeenCalled();
  });
});
