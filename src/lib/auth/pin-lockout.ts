export interface LockoutStatus {
  failedAttempts: number;
  isLocked: boolean;
  remainingSeconds: number;
  lockoutUntil: number | null;
}

const STORAGE_KEY = 'machoman_pin_lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;

interface PersistedState {
  failedAttempts: number;
  lockoutUntil: number | null;
}

export class PinLockout {
  private key: string;

  constructor(key = STORAGE_KEY) {
    this.key = key;
  }

  private load(): PersistedState {
    if (typeof localStorage === 'undefined') {
      return { failedAttempts: 0, lockoutUntil: null };
    }
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return { failedAttempts: 0, lockoutUntil: null };
      const parsed = JSON.parse(raw) as PersistedState;
      return {
        failedAttempts: typeof parsed.failedAttempts === 'number' ? parsed.failedAttempts : 0,
        lockoutUntil: typeof parsed.lockoutUntil === 'number' ? parsed.lockoutUntil : null,
      };
    } catch {
      return { failedAttempts: 0, lockoutUntil: null };
    }
  }

  private save(state: PersistedState): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // Ignorar errores de almacenamiento si está restringido
    }
  }

  getStatus(now = Date.now()): LockoutStatus {
    const state = this.load();

    if (state.lockoutUntil !== null) {
      if (now < state.lockoutUntil) {
        const remainingSeconds = Math.ceil((state.lockoutUntil - now) / 1000);
        return {
          failedAttempts: state.failedAttempts,
          isLocked: true,
          remainingSeconds,
          lockoutUntil: state.lockoutUntil,
        };
      } else {
        // Expiró el bloqueo: reiniciamos el bloqueo pero dejamos los intentos o limpiamos
        const cleaned: PersistedState = { failedAttempts: 0, lockoutUntil: null };
        this.save(cleaned);
        return {
          failedAttempts: 0,
          isLocked: false,
          remainingSeconds: 0,
          lockoutUntil: null,
        };
      }
    }

    return {
      failedAttempts: state.failedAttempts,
      isLocked: false,
      remainingSeconds: 0,
      lockoutUntil: null,
    };
  }

  recordFailedAttempt(now = Date.now()): LockoutStatus {
    const current = this.getStatus(now);
    if (current.isLocked) {
      return current;
    }

    const nextAttempts = current.failedAttempts + 1;
    let lockoutUntil: number | null = null;

    if (nextAttempts >= MAX_ATTEMPTS) {
      lockoutUntil = now + LOCKOUT_MS;
    }

    this.save({ failedAttempts: nextAttempts, lockoutUntil });
    return this.getStatus(now);
  }

  recordSuccess(): void {
    this.reset();
  }

  reset(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Ignorar
    }
  }
}
