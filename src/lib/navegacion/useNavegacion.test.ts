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

  it('al montar, deja una entrada de la raíz y una copia (colchón para que el atrás no salga de la app)', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    renderHook(() => useNavegacion({ isUnlocked: true, vistaInicial: 'vehiculos' }));

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ vista: 'vehiculos', nav: expect.any(String) }),
      '',
      ''
    );
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
    // El colchón del montaje no cuenta como navegación
    pushSpy.mockClear();

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
    // El colchón del montaje no cuenta como navegación
    pushSpy.mockClear();

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
    // La entrada de historial que la app guardó para Movimientos (la última; el colchón del montaje va antes)
    const entradaMovimientos = pushSpy.mock.calls.at(-1)![0];
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

  it('una entrada de historial que no es de esta sesión (ej. tras recargar) lleva a la raíz y la vuelve a dejar', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true, vistaInicial: 'vehiculos' }));

    act(() => {
      result.current.ir('balances');
    });
    pushSpy.mockClear();
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { vista: 'vehiculos', nav: 'otra-sesion' } }));
    });

    expect(result.current.vista).toBe('vehiculos');
    expect(pushSpy).toHaveBeenCalledWith(expect.objectContaining({ vista: 'vehiculos' }), '', '');
  });

  it('en la raíz Vehículos, un atrás que aterriza ahí vuelve a empujar la entrada de la raíz', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true, vistaInicial: 'vehiculos' }));
    const nav = replaceSpy.mock.calls[0][0] as { nav: string };
    act(() => {
      result.current.ir('balances');
    });
    pushSpy.mockClear();

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { vista: 'vehiculos', nav: nav.nav } }));
    });

    expect(result.current.vista).toBe('vehiculos');
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ vista: 'vehiculos', nav: nav.nav }),
      '',
      ''
    );
  });

  it('con la app bloqueada, un atrás a la raíz no empuja ninguna entrada', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result, rerender } = renderHook(
      ({ isUnlocked }) => useNavegacion({ isUnlocked, vistaInicial: 'vehiculos' }),
      { initialProps: { isUnlocked: true } }
    );
    const nav = replaceSpy.mock.calls[0][0] as { nav: string };
    act(() => {
      result.current.ir('balances');
    });
    rerender({ isUnlocked: false });
    pushSpy.mockClear();

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { vista: 'vehiculos', nav: nav.nav } }));
    });

    expect(pushSpy).not.toHaveBeenCalled();
    expect(result.current.vista).toBe('balances');
  });

  it('volver() desde una pantalla hija hasta la raíz también deja la entrada de la raíz', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useNavegacion({ isUnlocked: true, vistaInicial: 'vehiculos' }));
    const nav = replaceSpy.mock.calls[0][0] as { nav: string };
    act(() => {
      result.current.ir('balances');
    });
    act(() => {
      result.current.volver();
    });
    pushSpy.mockClear();

    // El back interno del navegador aterriza en la raíz
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { vista: 'vehiculos', nav: nav.nav } }));
    });

    expect(result.current.vista).toBe('vehiculos');
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ vista: 'vehiculos', nav: nav.nav }),
      '',
      ''
    );
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
