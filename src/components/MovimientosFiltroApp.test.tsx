import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthFlow } from './AuthFlow';
import type { DeviceAuthService } from '../lib/auth/device-auth';
import type { PinLockout } from '../lib/auth/pin-lockout';
import type { SessionInactivityTracker } from '../lib/auth/session-inactivity';

const ingreso = (id: string, fecha: string, descripcion: string) => ({
  id,
  fecha,
  tipo: 'ingreso_otro',
  monto: 80000,
  descripcion,
  cuentaNombre: 'Banco',
  vehiculoId: null,
  vehiculoCodigo: null,
  categoriaNombre: 'Comisión',
  creadoPor: 'Lautaro',
  anulado: false,
  anuladoPor: null,
  anuladoEl: null,
  motivoAnulacion: null,
  gastoId: null,
  ventaId: null,
});

const armarApp = (listarMovimientos: ReturnType<typeof vi.fn>, anularMovimiento = vi.fn().mockResolvedValue({ success: true })) => {
  const authService = {
    isDeviceLinked: vi.fn().mockReturnValue(true),
    getLinkedUser: vi.fn().mockReturnValue({ id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' }),
    validatePin: vi.fn().mockResolvedValue(true),
  };
  const inactivity = { isUnlocked: vi.fn().mockReturnValue(true), markUnlocked: vi.fn(), recordActivity: vi.fn(), lock: vi.fn() };
  const lockout = {
    getStatus: vi.fn().mockReturnValue({ failedAttempts: 0, isLocked: false, remainingSeconds: 0, lockoutUntil: null }),
    recordFailedAttempt: vi.fn(), recordSuccess: vi.fn(), reset: vi.fn(),
  };
  const vehiculosService = {
    listarVehiculos: vi.fn().mockResolvedValue([]),
    obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
    listarMovimientos,
    listarPendientes: vi.fn().mockResolvedValue({ grupos: [], total: 0 }),
    obtenerPorCobrar: vi.fn().mockResolvedValue(0),
    listarCuotasPorCobrar: vi.fn().mockResolvedValue([]),
    registrarVentaConPermutas: vi.fn(),
    anularMovimiento,
  };
  const cuentasService = {
    obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
      { id: 'c1', nombre: 'Banco', tipo: 'banco', saldo: 1000000 },
      { id: 'c2', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 500000 },
    ]),
    obtenerDineroDisponible: vi.fn().mockResolvedValue(1500000),
    crearCuenta: vi.fn(),
  };

  render(
    <AuthFlow
      authService={authService as unknown as DeviceAuthService}
      lockout={lockout as unknown as PinLockout}
      inactivity={inactivity as unknown as SessionInactivityTracker}
      cuentasService={cuentasService as unknown as any}
      vehiculosService={vehiculosService as unknown as any}
    />
  );
  return { vehiculosService };
};

const abrirMovimientos = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /^movimientos$/i }));
  await screen.findByRole('heading', { name: 'Movimientos' });
};

describe('Movimientos: filtro en la app', () => {
  it('elegir Salidas vuelve a pedir desde 0 con ese filtro', async () => {
    const listar = vi.fn().mockResolvedValue([]);
    armarApp(listar);
    await abrirMovimientos();

    fireEvent.click(screen.getByRole('button', { name: 'Salidas' }));

    await waitFor(() => expect(listar).toHaveBeenLastCalledWith(0, { sentido: 'salidas' }));
  });

  it('"Ver más" con un filtro trae la página siguiente con el mismo filtro', async () => {
    const pagina50 = Array.from({ length: 50 }, (_, i) => ingreso(`m${i}`, '2026-11-14', `Ingreso ${i}`));
    const listar = vi.fn().mockResolvedValue(pagina50);
    armarApp(listar);
    await abrirMovimientos();
    fireEvent.click(screen.getByRole('button', { name: 'Entradas' }));
    await waitFor(() => expect(listar).toHaveBeenLastCalledWith(0, { sentido: 'entradas' }));

    fireEvent.click(await screen.findByRole('button', { name: /ver más/i }));

    await waitFor(() => expect(listar).toHaveBeenLastCalledWith(50, { sentido: 'entradas' }));
  });

  it('anular un movimiento con el filtro activo recarga la lista con el mismo filtro', async () => {
    const listar = vi.fn().mockResolvedValue([ingreso('m1', '2026-11-24', 'Comisión por intermediación')]);
    const anular = vi.fn().mockResolvedValue({ success: true });
    armarApp(listar, anular);
    await abrirMovimientos();
    fireEvent.click(screen.getByRole('button', { name: 'Entradas' }));
    fireEvent.click(await screen.findByText('Comisión por intermediación'));

    fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
    fireEvent.change(screen.getByLabelText(/motivo/i), { target: { value: 'cargué mal' } });
    fireEvent.click(screen.getByRole('button', { name: /anular movimiento/i }));

    await waitFor(() => expect(anular).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listar).toHaveBeenLastCalledWith(0, { sentido: 'entradas' }));
  });

  it('el filtro sigue marcado al salir de Movimientos y volver (la app lo guarda)', async () => {
    const listar = vi.fn().mockResolvedValue([]);
    armarApp(listar);
    await abrirMovimientos();
    fireEvent.click(screen.getByRole('button', { name: 'Salidas' }));
    await waitFor(() => expect(listar).toHaveBeenLastCalledWith(0, { sentido: 'salidas' }));

    fireEvent.click(screen.getByRole('button', { name: /^vehículos$/i }));
    await abrirMovimientos();

    expect(screen.getByRole('button', { name: 'Salidas' })).toHaveAttribute('aria-pressed', 'true');
    expect(listar).toHaveBeenLastCalledWith(0, { sentido: 'salidas' });
  });
});
