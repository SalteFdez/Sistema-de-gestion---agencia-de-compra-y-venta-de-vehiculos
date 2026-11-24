import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { Opciones } from './Opciones';

const opciones = [
  { id: 'c1', nombre: 'Caja efectivo', secundario: '$ 3.000.000' },
  { id: 'c2', nombre: 'Banco', secundario: '$ −150.000', negativo: true },
];

describe('Opciones', () => {
  it('muestra cada opción con su línea secundaria, y la elegida en marca con aria-pressed', () => {
    render(<Opciones etiqueta="Cuenta" opciones={opciones} seleccionada="c1" onElegir={vi.fn()} />);

    const grupo = within(screen.getByRole('group', { name: 'Cuenta' }));
    const caja = grupo.getByRole('button', { name: /caja efectivo/i });
    expect(caja).toHaveTextContent('Caja efectivo');
    expect(caja).toHaveTextContent('$ 3.000.000');
    expect(caja).toHaveAttribute('aria-pressed', 'true');
    expect(caja).toHaveClass('bg-marca', 'text-white');
    expect(grupo.getByRole('button', { name: /banco/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('un saldo negativo se ve en rojo', () => {
    render(<Opciones etiqueta="Cuenta" opciones={opciones} seleccionada={null} onElegir={vi.fn()} />);

    const banco = within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /banco/i });
    expect(banco).toHaveTextContent('$ −150.000');
    expect(banco.querySelector('.text-red-600')).not.toBeNull();
  });

  it('elegir una opción llama a onElegir con su id, y en dos columnas usa grid-cols-2', () => {
    const onElegir = vi.fn();
    render(<Opciones etiqueta="Cuenta" opciones={opciones} seleccionada={null} onElegir={onElegir} columnas={2} />);

    fireEvent.click(screen.getByRole('button', { name: /banco/i }));
    expect(onElegir).toHaveBeenCalledWith('c2');
    expect(screen.getByRole('group', { name: 'Cuenta' })).toHaveClass('grid-cols-2');
  });
});
