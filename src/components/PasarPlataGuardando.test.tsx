import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { PasarPlataView } from './PasarPlataView';

const cuentas = [
  { id: 'c1', nombre: 'Caja efectivo', saldo: 3000000 },
  { id: 'c2', nombre: 'Banco', saldo: 1500000 },
];

const llenarPase = () => {
  fireEvent.click(within(screen.getByRole('group', { name: 'Desde' })).getByRole('button', { name: /caja efectivo/i }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Hacia' })).getByRole('button', { name: /banco/i }));
  fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '1000000' } });
};

describe('PasarPlataView: Guardando…', () => {
  it('mientras guarda, Pasar plata queda deshabilitado con "Guardando…" y un segundo clic no vuelve a registrar', () => {
    const onRegistrar = vi.fn(() => new Promise<never>(() => {}));
    render(<PasarPlataView cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />);

    llenarPase();
    fireEvent.click(screen.getByRole('button', { name: /pasar plata/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('si falla, Pasar plata vuelve a habilitarse con su texto y el monto sigue cargado', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(<PasarPlataView cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />);

    llenarPase();
    fireEvent.click(screen.getByRole('button', { name: /pasar plata/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: /pasar plata/i })).toBeEnabled();
    expect(screen.getByLabelText(/monto/i)).toHaveValue('$ 1.000.000');
  });
});
