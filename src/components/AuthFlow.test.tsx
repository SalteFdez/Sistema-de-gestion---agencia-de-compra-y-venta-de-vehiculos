import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthFlow } from './AuthFlow';
import type { DeviceAuthService } from '../lib/auth/device-auth';
import type { PinLockout } from '../lib/auth/pin-lockout';
import type { SessionInactivityTracker } from '../lib/auth/session-inactivity';

describe('AuthFlow UI Integration', () => {
  let mockAuthService: Partial<DeviceAuthService>;
  let mockLockout: Partial<PinLockout>;
  let mockInactivity: Partial<SessionInactivityTracker>;

  beforeEach(() => {
    mockLockout = {
      getStatus: vi.fn().mockReturnValue({ failedAttempts: 0, isLocked: false, remainingSeconds: 0, lockoutUntil: null }),
      recordFailedAttempt: vi.fn().mockReturnValue({ failedAttempts: 1, isLocked: false, remainingSeconds: 0, lockoutUntil: null }),
      recordSuccess: vi.fn(),
      reset: vi.fn(),
    };

    mockInactivity = {
      isUnlocked: vi.fn().mockReturnValue(false),
      markUnlocked: vi.fn(),
      recordActivity: vi.fn(),
      lock: vi.fn(),
    };
  });

  it('muestra la pantalla de vinculación si el dispositivo no está vinculado', () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(false),
      getLinkedUser: vi.fn().mockReturnValue(null),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    expect(screen.getByText(/vincular dispositivo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email del socio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  it('valida credenciales al enviar el formulario: si fallan se queda en creds con mensaje de error y conserva el email', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(false),
      getLinkedUser: vi.fn().mockReturnValue(null),
      validateCredentials: vi.fn().mockResolvedValue({
        success: false,
        error: 'Email o contraseña incorrectos',
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    const emailInput = screen.getByLabelText(/email del socio/i);
    const passInput = screen.getByLabelText(/contraseña/i);

    fireEvent.change(emailInput, { target: { value: 'agustin@machoman.local' } });
    fireEvent.change(passInput, { target: { value: 'wrongpass' } });

    fireEvent.click(screen.getByRole('button', { name: /continuar a elegir pin/i }));

    expect(await screen.findByText(/email o contraseña incorrectos/i)).toBeInTheDocument();
    // Permanece en el formulario de creds y conserva el email
    expect(screen.getByLabelText(/email del socio/i)).toHaveValue('agustin@machoman.local');
    expect(screen.queryByText(/elegí tu pin de 4 dígitos/i)).not.toBeInTheDocument();
  });

  it('si las credenciales son válidas, pasa a elegir PIN', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(false),
      getLinkedUser: vi.fn().mockReturnValue(null),
      validateCredentials: vi.fn().mockResolvedValue({
        success: true,
        user: { id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' },
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    fireEvent.change(screen.getByLabelText(/email del socio/i), { target: { value: 'agustin@machoman.local' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'correctpass' } });

    fireEvent.click(screen.getByRole('button', { name: /continuar a elegir pin/i }));

    expect(await screen.findByText(/elegí tu pin de 4 dígitos/i)).toBeInTheDocument();
    expect(screen.queryByText(/email o contraseña incorrectos/i)).not.toBeInTheDocument();
  });

  it('muestra la pantalla de ingreso de PIN si el dispositivo está vinculado pero bloqueado', () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    expect(screen.getByText(/ingresá tu pin/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /me olvidé el pin/i })).toBeInTheDocument();
  });

  it('desbloquea y muestra "Hola, Agustín Fernandez" tras ingresar el PIN correcto', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    // Ingresamos 1, 2, 3, 4 en el teclado en pantalla
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    await waitFor(() => {
      expect(screen.getByText(/hola, agustín fernandez/i)).toBeInTheDocument();
    });

    expect(mockLockout.recordSuccess).toHaveBeenCalled();
    expect(mockInactivity.markUnlocked).toHaveBeenCalled();
  });

  it('si el PIN es incorrecto, registra intento fallido y sacude los círculos', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(false),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));

    await waitFor(() => {
      expect(mockLockout.recordFailedAttempt).toHaveBeenCalled();
    });

    expect(screen.queryByText(/hola, agustín fernandez/i)).not.toBeInTheDocument();
  });

  it('permite acceder a "Cambiar PIN" desde la pantalla principal y volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
      />
    );

    // En la pantalla principal vemos "Hola, Agustín Fernandez" y el botón "Cambiar PIN"
    expect(screen.getByText(/hola, agustín fernandez/i)).toBeInTheDocument();
    const changePinBtn = screen.getByRole('button', { name: /cambiar pin/i });
    expect(changePinBtn).toBeInTheDocument();

    // Al tocar "Cambiar PIN", se abre ChangePinFlow
    fireEvent.click(changePinBtn);
    expect(screen.getByText(/ingresá tu pin actual/i)).toBeInTheDocument();

    // Si cancela, vuelve a la pantalla principal
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);
    expect(screen.getByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('permite navegar a Balances desde el botón grande de la pantalla principal y volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([
        { id: '1', nombre: 'Caja efectivo', tipo: 'efectivo', saldo: 1500000 },
      ]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(1500000),
      crearCuenta: vi.fn(),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
      />
    );

    const btnBalances = screen.getByRole('button', { name: /balances/i });
    expect(btnBalances).toBeInTheDocument();

    fireEvent.click(btnBalances);

    expect(await screen.findByText(/dinero disponible/i)).toBeInTheDocument();
    expect(screen.getByTestId('total-disponible')).toHaveTextContent('$ 1.500.000');
    expect(screen.getByText('Caja efectivo')).toBeInTheDocument();

    // Botón volver
    const btnVolver = screen.getByRole('button', { name: /volver/i });
    fireEvent.click(btnVolver);

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });

  it('permite navegar a Cuentas desde Configuración y volver', async () => {
    mockAuthService = {
      isDeviceLinked: vi.fn().mockReturnValue(true),
      getLinkedUser: vi.fn().mockReturnValue({
        id: 'u1',
        email: 'agustin@machoman.local',
        nombre: 'Agustín Fernandez',
      }),
      validatePin: vi.fn().mockResolvedValue(true),
    };
    mockInactivity.isUnlocked = vi.fn().mockReturnValue(true);

    const mockCuentasService = {
      obtenerCuentasConSaldo: vi.fn().mockResolvedValue([]),
      obtenerDineroDisponible: vi.fn().mockResolvedValue(0),
      crearCuenta: vi.fn(),
    };

    render(
      <AuthFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        inactivity={mockInactivity as SessionInactivityTracker}
        cuentasService={mockCuentasService as unknown as any}
      />
    );

    const btnCuentas = screen.getByRole('button', { name: /cuentas/i });
    expect(btnCuentas).toBeInTheDocument();

    fireEvent.click(btnCuentas);

    expect(await screen.findByText(/nueva cuenta/i)).toBeInTheDocument();

    const btnVolver = screen.getByRole('button', { name: /volver/i });
    fireEvent.click(btnVolver);

    expect(await screen.findByText(/hola, agustín fernandez/i)).toBeInTheDocument();
  });
});
