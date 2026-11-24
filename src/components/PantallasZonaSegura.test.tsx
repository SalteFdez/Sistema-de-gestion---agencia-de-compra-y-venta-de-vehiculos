import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { AuthFlow } from './AuthFlow';
import type { DeviceAuthService } from '../lib/auth/device-auth';
import type { PinLockout } from '../lib/auth/pin-lockout';
import type { SessionInactivityTracker } from '../lib/auth/session-inactivity';

const armar = (vinculado: boolean) => {
  const authService = {
    isDeviceLinked: vi.fn().mockReturnValue(vinculado),
    getLinkedUser: vi.fn().mockReturnValue(vinculado ? { id: 'u1', email: 'agustin@machoman.local', nombre: 'Agustín Fernandez' } : null),
    validatePin: vi.fn().mockResolvedValue(true),
  };
  const inactivity = { isUnlocked: vi.fn().mockReturnValue(false), markUnlocked: vi.fn(), recordActivity: vi.fn(), lock: vi.fn() };
  const lockout = {
    getStatus: vi.fn().mockReturnValue({ failedAttempts: 0, isLocked: false, remainingSeconds: 0, lockoutUntil: null }),
    recordFailedAttempt: vi.fn(), recordSuccess: vi.fn(), reset: vi.fn(),
  };
  return render(
    <AuthFlow
      authService={authService as unknown as DeviceAuthService}
      lockout={lockout as unknown as PinLockout}
      inactivity={inactivity as unknown as SessionInactivityTracker}
    />
  );
};

describe('pantallas sin Encabezado: el contenido arranca debajo del notch', () => {
  it('la pantalla de vincular dispositivo deja libre la zona segura arriba', () => {
    const { container } = armar(false);

    expect(container.querySelector('main')).toHaveClass('pt-[max(1.5rem,env(safe-area-inset-top))]');
  });

  it('la pantalla del PIN deja libre la zona segura arriba', () => {
    const { container } = armar(true);

    expect(container.querySelector('main')).toHaveClass('pt-[max(1.5rem,env(safe-area-inset-top))]');
  });
});
