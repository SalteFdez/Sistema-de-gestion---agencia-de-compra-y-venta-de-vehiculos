import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CompraVehiculoView } from './CompraVehiculoView';

const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

describe('Comprar: la foto primero', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview-1');
    URL.revokeObjectURL = vi.fn();
  });

  it('arriba de todo hay un recuadro "Sacar foto" que abre la cámara (capture environment)', () => {
    const { container } = render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    const primerCampo = container.querySelector('section input, section label');
    expect(primerCampo?.closest('label')).toHaveTextContent('Sacar foto');
    const entrada = container.querySelector('input[type="file"]');
    expect(entrada).toHaveAttribute('capture', 'environment');
    expect(entrada).toHaveAttribute('accept', 'image/*');
  });

  it('al elegir una foto muestra la vista previa con "Cambiar foto", y revoca la URL al cambiarla y al desmontar', () => {
    const { container, unmount } = render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);
    const entrada = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(entrada, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });

    expect(screen.getByRole('img', { name: /vista previa de la foto/i })).toHaveAttribute('src', 'blob:preview-1');
    expect(screen.getByRole('button', { name: /cambiar foto/i })).toBeInTheDocument();

    fireEvent.change(entrada, { target: { files: [new File(['y'], 'b.jpg', { type: 'image/jpeg' })] } });
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('marca y modelo van en una fila de dos columnas; año y color también', () => {
    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} />);

    const filaMarca = screen.getByLabelText(/marca/i).closest('.grid');
    expect(filaMarca).toHaveClass('grid-cols-2');
    expect(filaMarca).toContainElement(screen.getByLabelText(/modelo/i));

    const filaAnio = screen.getByLabelText(/año/i).closest('.grid');
    expect(filaAnio).toHaveClass('grid-cols-2');
    expect(filaAnio).toContainElement(screen.getByLabelText(/color/i));
  });
});
