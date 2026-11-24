import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Encabezado } from './Encabezado';

describe('Encabezado', () => {
  it('muestra el título y un Volver que llama a onVolver, con área táctil de 44 px', () => {
    const onVolver = vi.fn();
    render(<Encabezado titulo="Comprar vehículo" onVolver={onVolver} />);

    expect(screen.getByRole('heading', { name: 'Comprar vehículo' })).toBeInTheDocument();
    const volver = screen.getByRole('button', { name: 'Volver' });
    expect(volver).toHaveClass('min-h-11');
    fireEvent.click(volver);
    expect(onVolver).toHaveBeenCalledTimes(1);
  });
});
