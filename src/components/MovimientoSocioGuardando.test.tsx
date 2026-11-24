import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { MovimientoSocioView } from './MovimientoSocioView';

const socios = [{ id: 'u1', nombre: 'Agustín Fernandez' }];
const cuentas = [{ id: 'c1', nombre: 'Caja efectivo', saldo: 3000000 }];

const llenarAporte = () => {
  fireEvent.click(within(screen.getByRole('group', { name: 'Cuenta' })).getByRole('button', { name: /caja efectivo/i }));
  fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: '500000' } });
};

describe('MovimientoSocioView: Guardando…', () => {
  it('mientras guarda, Registrar aporte queda deshabilitado con "Guardando…" y un segundo clic no vuelve a registrar', () => {
    const onRegistrar = vi.fn(() => new Promise<never>(() => {}));
    render(
      <MovimientoSocioView modo="aporte" socios={socios} socioActualId="u1" cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />
    );

    llenarAporte();
    fireEvent.click(screen.getByRole('button', { name: /registrar aporte/i }));

    const guardando = screen.getByRole('button', { name: 'Guardando…' });
    expect(guardando).toBeDisabled();
    fireEvent.click(guardando);
    expect(onRegistrar).toHaveBeenCalledTimes(1);
  });

  it('si falla, Registrar aporte vuelve a habilitarse con su texto y el monto sigue cargado', async () => {
    const onRegistrar = vi.fn().mockResolvedValue({ success: false, error: 'Sin conexión' });
    render(
      <MovimientoSocioView modo="aporte" socios={socios} socioActualId="u1" cuentas={cuentas} onRegistrar={onRegistrar} onVolver={vi.fn()} />
    );

    llenarAporte();
    fireEvent.click(screen.getByRole('button', { name: /registrar aporte/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
    expect(screen.getByRole('button', { name: /registrar aporte/i })).toBeEnabled();
    expect(screen.getByLabelText(/monto/i)).toHaveValue('$ 500.000');
  });
});
