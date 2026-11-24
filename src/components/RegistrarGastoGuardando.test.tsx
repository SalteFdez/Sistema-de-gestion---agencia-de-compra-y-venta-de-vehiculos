import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RegistrarGastoView } from './RegistrarGastoView';

const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo' as const, saldo: 5000000 }];
const categorias = [{ id: 'k1', nombre: 'Combustible' }];

const llenarGastoGeneral = () => {
  fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '100000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Combustible' }));
  fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
  fireEvent.click(screen.getByRole('button', { name: /general del negocio/i }));
};

describe('RegistrarGastoView: Guardando…', () => {
  it('gasto: mientras guarda, Confirmar queda deshabilitado con "Guardando…" y un segundo clic no vuelve a registrar', () => {
    const onRegistrar = vi.fn(() => new Promise<never>(() => {}));
    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />
    );

    llenarGastoGeneral();
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('gasto: si falla, Confirmar vuelve a habilitarse con su texto y el monto sigue cargado', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(
      <RegistrarGastoView categorias={categorias} cuentas={cuentas} onVolver={vi.fn()} onIrACuentas={vi.fn()} onRegistrar={onRegistrar} />
    );

    llenarGastoGeneral();
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: /^confirmar$/i })).toBeEnabled();
    expect(screen.getByLabelText(/monto/i)).toHaveValue('$ 100.000');
  });

  it('ingreso: mientras guarda, Confirmar queda deshabilitado con "Guardando…"', () => {
    const onRegistrarIngreso = vi.fn(() => new Promise<never>(() => {}));
    render(
      <RegistrarGastoView
        modo="ingreso"
        categorias={categorias}
        cuentas={cuentas}
        onVolver={vi.fn()}
        onIrACuentas={vi.fn()}
        onRegistrarIngreso={onRegistrarIngreso}
      />
    );

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Combustible' }));
    fireEvent.click(screen.getByRole('button', { name: /caja efectivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirmar$/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onRegistrarIngreso).toHaveBeenCalledTimes(1);
  });
});
