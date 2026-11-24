import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MasView } from './MasView';

const opciones = {
  onBalances: vi.fn(),
  onMoverPlata: vi.fn(),
  onCuotas: vi.fn(),
  onPendientes: vi.fn(),
  onGanancia: vi.fn(),
  onChangePin: vi.fn(),
  onBloquear: vi.fn(),
  onDesvincular: vi.fn(),
};

describe('Más: Cargar stock existente', () => {
  it('muestra "Cargar stock existente" y al tocarlo abre el alta de stock', () => {
    const onCargarStock = vi.fn();
    render(<MasView {...opciones} onCargarStock={onCargarStock} />);

    fireEvent.click(screen.getByRole('button', { name: /cargar stock existente/i }));
    expect(onCargarStock).toHaveBeenCalledTimes(1);
  });
});
