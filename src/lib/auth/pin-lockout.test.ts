import { describe, it, expect, beforeEach } from 'vitest';
import { PinLockout } from './pin-lockout';

describe('PinLockout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inicia sin fallos y sin bloqueo', () => {
    const lockout = new PinLockout();
    const status = lockout.getStatus();

    expect(status.failedAttempts).toBe(0);
    expect(status.isLocked).toBe(false);
    expect(status.remainingSeconds).toBe(0);
  });

  it('incrementa fallos con cada intento fallido', () => {
    const lockout = new PinLockout();

    const status1 = lockout.recordFailedAttempt();
    expect(status1.failedAttempts).toBe(1);
    expect(status1.isLocked).toBe(false);

    lockout.recordFailedAttempt();
    lockout.recordFailedAttempt();
    const status4 = lockout.recordFailedAttempt();
    expect(status4.failedAttempts).toBe(4);
    expect(status4.isLocked).toBe(false);
  });

  it('bloquea por 30 segundos al alcanzar 5 intentos fallidos consecutivos', () => {
    const lockout = new PinLockout();
    const baseTime = 1700000000000;

    for (let i = 0; i < 4; i++) {
      lockout.recordFailedAttempt(baseTime);
    }
    const status5 = lockout.recordFailedAttempt(baseTime);

    expect(status5.failedAttempts).toBe(5);
    expect(status5.isLocked).toBe(true);
    expect(status5.remainingSeconds).toBe(30);

    // A los 10 segundos sigue bloqueado con 20 segundos restantes
    const statusAt10s = lockout.getStatus(baseTime + 10000);
    expect(statusAt10s.isLocked).toBe(true);
    expect(statusAt10s.remainingSeconds).toBe(20);

    // A los 30 segundos exactos o después se desbloquea
    const statusAt30s = lockout.getStatus(baseTime + 30000);
    expect(statusAt30s.isLocked).toBe(false);
    expect(statusAt30s.remainingSeconds).toBe(0);
  });

  it('un acierto resetea el contador de fallos y el bloqueo', () => {
    const lockout = new PinLockout();
    lockout.recordFailedAttempt();
    lockout.recordFailedAttempt();

    lockout.recordSuccess();

    const status = lockout.getStatus();
    expect(status.failedAttempts).toBe(0);
    expect(status.isLocked).toBe(false);
  });

  it('persiste el estado de bloqueo en localStorage ante una nueva instancia', () => {
    const lockout1 = new PinLockout();
    const baseTime = 1700000000000;
    for (let i = 0; i < 5; i++) {
      lockout1.recordFailedAttempt(baseTime);
    }

    // Simulamos reapertura de la app creando otra instancia con el mismo storage
    const lockout2 = new PinLockout();
    const status = lockout2.getStatus(baseTime + 5000);

    expect(status.failedAttempts).toBe(5);
    expect(status.isLocked).toBe(true);
    expect(status.remainingSeconds).toBe(25);
  });
});
