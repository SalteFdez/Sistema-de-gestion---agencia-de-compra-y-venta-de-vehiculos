import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PinKeypad } from './PinKeypad';

describe('PinKeypad', () => {
  it('renderiza los 4 círculos indicadores y los botones del teclado (1-9, 0, borrar)', () => {
    render(<PinKeypad onComplete={() => {}} />);

    // 4 círculos
    const circles = screen.getAllByTestId('pin-circle');
    expect(circles).toHaveLength(4);

    // Botones numéricos 0-9
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
    }

    // Botón borrar
    expect(screen.getByRole('button', { name: /borrar/i })).toBeInTheDocument();
  });

  it('permite ingresar dígitos y llama a onComplete automáticamente al 4.º dígito', () => {
    const onComplete = vi.fn();
    render(<PinKeypad onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('el botón borrar elimina el último dígito ingresado', () => {
    const onComplete = vi.fn();
    render(<PinKeypad onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: /borrar/i }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));

    // Se ingresó 1, 2, borra 2 -> queda '1', luego 9, 0, 5 -> '1905'
    expect(onComplete).toHaveBeenCalledWith('1905');
  });

  it('deshabilita los botones cuando está bloqueado y muestra el mensaje con tiempo restante', () => {
    render(<PinKeypad onComplete={() => {}} isLocked={true} remainingSeconds={25} />);

    expect(screen.getByText(/bloqueado.*25.*segundos/i)).toBeInTheDocument();

    const button1 = screen.getByRole('button', { name: '1' });
    expect(button1).toBeDisabled();
  });

  it('muestra clase o indicador de error/temblor cuando error es true', () => {
    const { container } = render(<PinKeypad onComplete={() => {}} error={true} />);
    const circlesContainer = container.querySelector('[data-testid="pin-circles"]');
    expect(circlesContainer?.className).toContain('shake');
  });

  it('muestra un solo botón "Me olvidé el PIN" cuando onForgotPin está definido', () => {
    render(<PinKeypad onComplete={() => {}} onForgotPin={() => {}} />);
    const botonesOlvide = screen.getAllByRole('button', { name: /olvid/i });
    expect(botonesOlvide).toHaveLength(1);
    expect(botonesOlvide[0]).toHaveTextContent('Me olvidé el PIN');
  });
});
