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
});
