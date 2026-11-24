import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CompraVehiculoView } from './CompraVehiculoView';

const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];

const llenarCompra = () => {
  fireEvent.change(screen.getByLabelText(/marca/i), { target: { value: 'Fiat' } });
  fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: 'Uno' } });
  fireEvent.change(screen.getByLabelText(/año/i), { target: { value: '2010' } });
  fireEvent.change(screen.getByLabelText(/precio de compra/i), { target: { value: '1500000' } });
};

describe('CompraVehiculoView: Guardando…', () => {
  it('mientras guarda, Confirmar queda deshabilitado con "Guardando…" y un segundo clic no vuelve a registrar', () => {
    const onRegistrar = vi.fn(() => new Promise<never>(() => {}));
    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />);

    llenarCompra();
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('si falla, Confirmar vuelve a habilitarse con su texto y los datos siguen cargados', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(<CompraVehiculoView cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />);

    llenarCompra();
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo registrar la compra');
    expect(screen.getByRole('button', { name: /^confirmar$/i })).toBeEnabled();
    expect(screen.getByLabelText(/marca/i)).toHaveValue('Fiat');
  });
});
