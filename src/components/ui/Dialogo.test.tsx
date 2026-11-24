import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Dialogo } from './Dialogo';

describe('Dialogo', () => {
  it('es un diálogo modal con título y el foco en el primer botón', () => {
    render(
      <Dialogo titulo="La cuenta Caja va a quedar en $ −500.000" onCerrar={vi.fn()}>
        <button type="button">Volver</button>
        <button type="button">Confirmar igual</button>
      </Dialogo>
    );

    const dialogo = screen.getByRole('dialog', { name: /va a quedar en/i });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus();
  });

  it('Escape y tocar el fondo cierran el diálogo', () => {
    const onCerrar = vi.fn();
    render(
      <Dialogo titulo="Aviso" onCerrar={onCerrar}>
        <button type="button">Volver</button>
      </Dialogo>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('fondo'));
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });

  it('mientras guarda, Escape y el fondo no cierran el diálogo', () => {
    const onCerrar = vi.fn();
    render(
      <Dialogo titulo="Aviso" onCerrar={onCerrar} guardando>
        <button type="button">Volver</button>
      </Dialogo>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('fondo'));
    expect(onCerrar).not.toHaveBeenCalled();
  });
});
