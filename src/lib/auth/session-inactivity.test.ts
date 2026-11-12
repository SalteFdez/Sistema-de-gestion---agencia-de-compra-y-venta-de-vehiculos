import { describe, it, expect, beforeEach } from 'vitest';
import { SessionInactivityTracker } from './session-inactivity';

describe('SessionInactivityTracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inicia bloqueado si nunca fue desbloqueado', () => {
    const tracker = new SessionInactivityTracker();
    expect(tracker.isUnlocked()).toBe(false);
  });

  it('permanece desbloqueado inmediatamente después del desbloqueo', () => {
    const tracker = new SessionInactivityTracker();
    const now = 1700000000000;

    tracker.markUnlocked(now);
    expect(tracker.isUnlocked(now)).toBe(true);
  });

  it('sigue desbloqueado si la inactividad es menor a 5 minutos (300 segundos)', () => {
    const tracker = new SessionInactivityTracker();
    const now = 1700000000000;

    tracker.markUnlocked(now);

    // 4 minutos y 59 segundos después
    const withinLimit = now + 4 * 60 * 1000 + 59 * 1000;
    expect(tracker.isUnlocked(withinLimit)).toBe(true);
  });

  it('se bloquea si pasaron 5 minutos o más desde la última actividad', () => {
    const tracker = new SessionInactivityTracker();
    const now = 1700000000000;

    tracker.markUnlocked(now);

    // 5 minutos exactos
    const exactly5Min = now + 5 * 60 * 1000;
    expect(tracker.isUnlocked(exactly5Min)).toBe(false);

    // 10 minutos después
    const after10Min = now + 10 * 60 * 1000;
    expect(tracker.isUnlocked(after10Min)).toBe(false);
  });

  it('actualizar actividad extiende la vigencia de la sesión', () => {
    const tracker = new SessionInactivityTracker();
    const now = 1700000000000;

    tracker.markUnlocked(now);

    // Actividad a los 3 minutos
    const at3Min = now + 3 * 60 * 1000;
    tracker.recordActivity(at3Min);

    // A los 7 minutos del tiempo inicial (4 min desde última actividad), sigue desbloqueado
    const at7Min = now + 7 * 60 * 1000;
    expect(tracker.isUnlocked(at7Min)).toBe(true);

    // A los 8 minutos y 1 segundo (5 min y 1 s desde última actividad), se bloquea
    const at8Min = now + 8 * 60 * 1000 + 1000;
    expect(tracker.isUnlocked(at8Min)).toBe(false);
  });

  it('lock() fuerza el bloqueo inmediato', () => {
    const tracker = new SessionInactivityTracker();
    const now = 1700000000000;

    tracker.markUnlocked(now);
    expect(tracker.isUnlocked(now)).toBe(true);

    tracker.lock();
    expect(tracker.isUnlocked(now)).toBe(false);
  });
});
