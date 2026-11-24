import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthFlow } from './AuthFlow';
import type { DeviceAuthService } from '../lib/auth/device-auth';
import type { PinLockout } from '../lib/auth/pin-lockout';
import type { SessionInactivityTracker } from '../lib/auth/session-inactivity';

describe('Vender: la revisión tiene entrada en el historial', () => {
  it('Continuar muestra la revisión; atrás vuelve a los datos con lo cargado intacto', async () => {
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
    const vehiculo = { id: 'v14', codigo: 'MC-014', marca: 'Peugeot', modelo: '208', anio: 2018, color: null, estado: 'en_stock', fotoUrl: null, fechaIngreso: '2026-11-01', costoReal: 6500000 };
    const vehiculosService = {
      listarVehiculos: vi.fn().mockResolvedValue([vehiculo]),
      obtenerInventario: vi.fn().mockResolvedValue({ total: 0, cantidad: 0 }),
      listarMovimientos: vi.fn().mockResolvedValue([]),
      listarPendientes: vi.fn().mockResolvedValue({ grupos: [], total: 0 }),
      obtenerPorCobrar: vi.fn().mockResolvedValue(0),
      listarCuotasPorCobrar: vi.fn().mockResolvedValue([]),
      registrarVentaConPermutas: vi.fn(),
    };
    const cuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([{ id: 'c1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 9000000 }]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(9000000),
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

    fireEvent.click(await screen.findByRole('button', { name: /^caja$/i }));
    fireEvent.click(screen.getByRole('button', { name: /vender vehículo/i }));
    fireEvent.click(await screen.findByText('MC-014'));
    fireEvent.change(await screen.findByLabelText(/precio de venta/i), { target: { value: '8000000' } });
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }));

    expect(await screen.findByRole('heading', { name: /revisá antes de confirmar/i })).toBeInTheDocument();

    // Atrás del navegador: vuelve a los datos
    window.history.back();

    expect(await screen.findByLabelText(/precio de venta/i)).toHaveValue('$ 8.000.000');
    await waitFor(() => expect(screen.queryByRole('heading', { name: /revisá antes de confirmar/i })).not.toBeInTheDocument());
  });
});
