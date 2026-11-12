const STORAGE_KEY = 'machoman_last_activity_at';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

export class SessionInactivityTracker {
  private key: string;
  private timeoutMs: number;

  constructor(key = STORAGE_KEY, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.key = key;
    this.timeoutMs = timeoutMs;
  }

  markUnlocked(now = Date.now()): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.key, String(now));
    } catch {
      // Ignorar errores de almacenamiento
    }
  }

  recordActivity(now = Date.now()): void {
    if (this.isUnlocked(now)) {
      this.markUnlocked(now);
    }
  }

  isUnlocked(now = Date.now()): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return false;
      const lastActivity = Number(raw);
      if (Number.isNaN(lastActivity)) return false;

      const elapsed = now - lastActivity;
      if (elapsed >= 0 && elapsed < this.timeoutMs) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  lock(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Ignorar
    }
  }
}
