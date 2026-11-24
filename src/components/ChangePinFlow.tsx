import React, { useState, useEffect } from 'react';
import type { DeviceAuthService } from '../lib/auth/device-auth';
import type { PinLockout, LockoutStatus } from '../lib/auth/pin-lockout';
import { PinKeypad } from './PinKeypad';
import { Boton } from './ui/Boton';

export interface ChangePinFlowProps {
  authService: DeviceAuthService;
  lockout: PinLockout;
  onDone: () => void;
  onCancel: () => void;
}

type Step = 'current_pin' | 'new_pin' | 'confirm_pin' | 'success';

export const ChangePinFlow: React.FC<ChangePinFlowProps> = ({
  authService,
  lockout,
  onDone,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>('current_pin');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus>(() => lockout.getStatus());

  // Refrescar bloqueo si está bloqueado
  useEffect(() => {
    if (!lockoutStatus?.isLocked) return;

    const timer = setInterval(() => {
      const current = lockout.getStatus();
      setLockoutStatus(current);
      if (!current?.isLocked) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutStatus?.isLocked, lockout]);

  // Paso 1: Validar PIN actual
  const handleCurrentPin = async (pin: string) => {
    if (lockoutStatus?.isLocked) return;
    setErrorMsg(null);

    const isValid = await authService.validatePin(pin);
    if (isValid) {
      lockout.recordSuccess();
      setCurrentPin(pin);
      setPinError(false);
      setStep('new_pin');
    } else {
      const status = lockout.recordFailedAttempt();
      setLockoutStatus(status);
      setPinError(true);
      setErrorMsg('PIN actual incorrecto');
      setTimeout(() => setPinError(false), 500);
    }
  };

  // Paso 2: Elegir nuevo PIN
  const handleNewPin = (pin: string) => {
    setErrorMsg(null);
    setNewPin(pin);
    setStep('confirm_pin');
  };

  // Paso 3: Confirmar nuevo PIN
  const handleConfirmPin = async (confirmPin: string) => {
    if (confirmPin !== newPin) {
      setErrorMsg('Los nuevos PINes no coinciden. Probá de nuevo.');
      setPinError(true);
      setTimeout(() => setPinError(false), 500);
      setNewPin('');
      setStep('new_pin');
      return;
    }

    const result = await authService.changePin({
      currentPin,
      newPin,
      confirmNewPin: confirmPin,
    });

    if (result.success) {
      setStep('success');
    } else {
      setErrorMsg(result.error || 'No se pudo cambiar el PIN');
      setStep('new_pin');
      setNewPin('');
    }
  };

  if (step === 'success') {
    return (
      <div className="w-full max-w-xs mx-auto p-6 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">PIN cambiado</h2>
        <p className="text-sm text-gray-600 mb-6">
          A partir de ahora ingresás con tu nuevo PIN.
        </p>
        <Boton anchoCompleto onClick={onDone}>
          Listo
        </Boton>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs mx-auto p-4 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {step === 'current_pin' && 'Ingresá tu PIN actual'}
          {step === 'new_pin' && 'Elegí tu nuevo PIN'}
          {step === 'confirm_pin' && 'Confirmá tu nuevo PIN'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-800"
        >
          Cancelar
        </button>
      </div>

      {errorMsg && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 mb-2 text-center">
          {errorMsg}
        </div>
      )}

      {step === 'current_pin' && (
        <PinKeypad
          onComplete={handleCurrentPin}
          isLocked={lockoutStatus?.isLocked}
          remainingSeconds={lockoutStatus?.remainingSeconds}
          error={pinError}
        />
      )}

      {step === 'new_pin' && (
        <PinKeypad
          onComplete={handleNewPin}
          error={pinError}
        />
      )}

      {step === 'confirm_pin' && (
        <PinKeypad
          onComplete={handleConfirmPin}
          error={pinError}
        />
      )}
    </div>
  );
};
