import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { InputMonto } from './InputMonto';

const ConEstado: React.FC<{ inicial?: number | null; onCambio: (n: number | null) => void }> = ({ inicial = null, onCambio }) => {
  const [valor, setValor] = useState<number | null>(inicial);
  return (
    <InputMonto
      aria-label="Monto"
      valor={valor}
      onChange={(n) => {
        setValor(n);
        onCambio(n);
      }}
    />
  );
};

describe('InputMonto', () => {
  it('mientras escribo muestra el monto con miles y entrega el número entero', () => {
    const onCambio = vi.fn();
    render(<ConEstado onCambio={onCambio} />);

    const input = screen.getByLabelText('Monto');
    fireEvent.change(input, { target: { value: '8000000' } });

    expect(input).toHaveValue('$ 8.000.000');
    expect(onCambio).toHaveBeenLastCalledWith(8000000);
  });

  it('vacío significa sin valor (null), no 0', () => {
    const onCambio = vi.fn();
    render(<ConEstado inicial={500} onCambio={onCambio} />);

    const input = screen.getByLabelText('Monto');
    fireEvent.change(input, { target: { value: '' } });

    expect(input).toHaveValue('');
    expect(onCambio).toHaveBeenLastCalledWith(null);
  });

  it('usa teclado numérico y letra de 16 px, y el cursor queda al final', () => {
    render(<ConEstado onCambio={vi.fn()} />);

    const input = screen.getByLabelText('Monto');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveClass('text-base');

    fireEvent.change(input, { target: { value: '1500' } });
    expect((input as HTMLInputElement).selectionStart).toBe((input as HTMLInputElement).value.length);
  });
});
