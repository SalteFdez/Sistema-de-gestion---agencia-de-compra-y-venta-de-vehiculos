import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavegacion, type Vista } from './useNavegacion';

describe('useNavegacion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Limpiar historial simulado
    window.history.replaceState(null, '', '/');
  });

  it('inicia en "home" por defecto y setea replaceState si no había estado', () => {
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true }));
    expect(result.current.vista).toBe('home');
  });

  it('navegar con ir() cambia la vista y hace pushState', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true }));

    act(() => {
      result.current.ir('vehiculos');
    });

    expect(result.current.vista).toBe('vehiculos');
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ vista: 'vehiculos' }),
      '',
      ''
    );
  });

  it('irAPestana() no hace pushState si ya está en esa pestaña', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true }));

    expect(result.current.vista).toBe('home');

    act(() => {
      result.current.irAPestana('home');
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(result.current.vista).toBe('home');

    act(() => {
      result.current.irAPestana('movimientos');
    });

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ vista: 'movimientos' }),
      '',
      ''
    );
    expect(result.current.vista).toBe('movimientos');
  });

  it('reemplazar() actualiza la vista con replaceState en lugar de pushState', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true }));

    act(() => {
      result.current.reemplazar('balances');
    });

    expect(result.current.vista).toBe('balances');
    expect(replaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({ vista: 'balances' }),
      '',
      ''
    );
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('volver() vuelve a la vista anterior y llama a window.history.back', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true }));

    act(() => {
      result.current.ir('vehiculos');
    });
    act(() => {
      result.current.volver();
    });

    expect(result.current.vista).toBe('home');
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('volver() en la raíz no llama a history.back (no cierra la app)', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true }));

    act(() => {
      result.current.volver();
    });

    expect(result.current.vista).toBe('home');
    expect(backSpy).not.toHaveBeenCalled();
  });

  it('responde a eventos popstate restaurando vista y datos', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true }));

    act(() => {
      result.current.ir('movimientos');
    });
    // La entrada de historial que la app guardó para Movimientos
    const entradaMovimientos = pushSpy.mock.calls[0][0];
    act(() => {
      result.current.ir('vehiculo_detalle', { id: 'MC-001' });
    });
    expect(result.current.vista).toBe('vehiculo_detalle');
    expect(result.current.datos).toEqual({ id: 'MC-001' });

    // El usuario toca atrás: el navegador devuelve la entrada de Movimientos
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: entradaMovimientos }));
    });

    expect(result.current.vista).toBe('movimientos');
  });

  it('una entrada de historial que no es de esta sesión (ej. tras recargar) lleva al Inicio', () => {
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true }));

    act(() => {
      result.current.ir('balances');
    });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { vista: 'vehiculos', nav: 'otra-sesion' } }));
    });

    expect(result.current.vista).toBe('home');
  });

  it('con la app bloqueada (isUnlocked: false), popstate no cambia la vista', () => {
    const { result, rerender } = renderHook(
      ({ isUnlocked }) => useNavegacion({ isUnlocked }),
      { initialProps: { isUnlocked: true } }
    );

    act(() => {
      result.current.ir('balances');
    });
    expect(result.current.vista).toBe('balances');

    // Se bloquea la app
    rerender({ isUnlocked: false });

    // Intento de popstate hacia 'home' o cualquier otra
    act(() => {
      const popEvent = new PopStateEvent('popstate', {
        state: { vista: 'home', datos: undefined },
      });
      window.dispatchEvent(popEvent);
    });

    // La vista no debe cambiar mientras esté bloqueada
    expect(result.current.vista).toBe('balances');
  });
});
