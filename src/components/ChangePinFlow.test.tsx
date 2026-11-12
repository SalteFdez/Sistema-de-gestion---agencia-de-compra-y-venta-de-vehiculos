import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ChangePinFlow } from './ChangePinFlow';
import type { DeviceAuthService } from '../lib/auth/device-auth';
import type { PinLockout } from '../lib/auth/pin-lockout';

describe('ChangePinFlow', () => {
  let mockAuthService: Partial<DeviceAuthService>;
  let mockLockout: Partial<PinLockout>;
  let onDone: () => void;
  let onCancel: () => void;

  beforeEach(() => {
    onDone = vi.fn();
    onCancel = vi.fn();

    mockLockout = {
      getStatus: vi.fn().mockReturnValue({ failedAttempts: 0, isLocked: false, remainingSeconds: 0, lockoutUntil: null }),
      recordFailedAttempt: vi.fn().mockReturnValue({ failedAttempts: 1, isLocked: false, remainingSeconds: 0, lockoutUntil: null }),
      recordSuccess: vi.fn(),
      reset: vi.fn(),
    };

    mockAuthService = {
      validatePin: vi.fn(),
      changePin: vi.fn(),
    };
  });

  it('inicia pidiendo el PIN actual y permite cancelar', () => {
    render(
      <ChangePinFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        onDone={onDone}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText(/ingresá tu pin actual/i)).toBeInTheDocument();
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it('si el PIN actual es incorrecto, registra intento fallido y no avanza', async () => {
    mockAuthService.validatePin = vi.fn().mockResolvedValue(false);

    render(
      <ChangePinFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        onDone={onDone}
        onCancel={onCancel}
      />
    );

    // Ingresamos 1, 1, 1, 1
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));

    await waitFor(() => {
      expect(mockAuthService.validatePin).toHaveBeenCalledWith('1111');
      expect(mockLockout.recordFailedAttempt).toHaveBeenCalled();
    });

    // Sigue en la pantalla de PIN actual
    expect(screen.getByText(/ingresá tu pin actual/i)).toBeInTheDocument();
    expect(screen.queryByText(/elegí tu nuevo pin/i)).not.toBeInTheDocument();
  });

  it('avanza al nuevo PIN cuando el actual es correcto, y si la confirmación no coincide vuelve a pedir el nuevo PIN', async () => {
    mockAuthService.validatePin = vi.fn().mockResolvedValue(true);

    render(
      <ChangePinFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        onDone={onDone}
        onCancel={onCancel}
      />
    );

    // 1. PIN actual correcto: 1, 2, 3, 4
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    await waitFor(() => {
      expect(screen.getByText(/elegí tu nuevo pin/i)).toBeInTheDocument();
    });
    expect(mockLockout.recordSuccess).toHaveBeenCalled();

    // 2. Nuevo PIN: 5, 5, 5, 5
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));

    await waitFor(() => {
      expect(screen.getByText(/confirmá tu nuevo pin/i)).toBeInTheDocument();
    });

    // 3. Confirmación errónea: 9, 9, 9, 9
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));

    await waitFor(() => {
      expect(screen.getByText(/los nuevos pines no coinciden/i)).toBeInTheDocument();
      // Vuelve al paso de elegir nuevo PIN
      expect(screen.getByText(/elegí tu nuevo pin/i)).toBeInTheDocument();
    });
  });

  it('flujo exitoso: cambia el PIN y muestra confirmación "PIN cambiado"', async () => {
    mockAuthService.validatePin = vi.fn().mockResolvedValue(true);
    mockAuthService.changePin = vi.fn().mockResolvedValue({ success: true });

    render(
      <ChangePinFlow
        authService={mockAuthService as DeviceAuthService}
        lockout={mockLockout as PinLockout}
        onDone={onDone}
        onCancel={onCancel}
      />
    );

    // 1. PIN actual: 1234
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    await waitFor(() => {
      expect(screen.getByText(/elegí tu nuevo pin/i)).toBeInTheDocument();
    });

    // 2. Nuevo PIN: 7890
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));

    await waitFor(() => {
      expect(screen.getByText(/confirmá tu nuevo pin/i)).toBeInTheDocument();
    });

    // 3. Confirmar nuevo PIN: 7890
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));

    await waitFor(() => {
      expect(mockAuthService.changePin).toHaveBeenCalledWith({
        currentPin: '1234',
        newPin: '7890',
        confirmNewPin: '7890',
      });
      expect(screen.getByText(/pin cambiado/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /listo/i }));
    expect(onDone).toHaveBeenCalled();
  });
});
