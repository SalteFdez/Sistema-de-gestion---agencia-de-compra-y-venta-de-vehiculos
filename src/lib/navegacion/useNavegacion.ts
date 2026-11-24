import { useState, useEffect, useCallback, useRef } from 'react';

export type Vista =
  | 'home'
  | 'balances'
  | 'cuentas'
  | 'change_pin'
  | 'vehiculos'
  | 'comprar'
  | 'vehiculo_detalle'
  | 'vender'
  | 'gasto'
  | 'ingreso'
  | 'movimientos'
  | 'mover_plata'
  | 'pasar_plata'
  | 'aporte_socio'
  | 'retiro_socio'
  | 'pendientes'
  | 'asignar_gasto'
  | 'cuotas_por_cobrar'
  | 'cobrar_cuota'
  | 'ganancia_mensual'
  | 'ganancia_mes'
  | 'mas'
  | 'cargar_stock';

export type Pestana = 'home' | 'vehiculos' | 'movimientos' | 'mas';

export interface NavegacionState {
  vista: Vista;
  datos?: Record<string, unknown>;
}

export interface UseNavegacionOptions {
  isUnlocked?: boolean;
  vistaInicial?: Vista;
}

export function useNavegacion(options: UseNavegacionOptions = {}) {
  const { isUnlocked = true, vistaInicial = 'home' } = options;

  const [estado, setEstado] = useState<NavegacionState>(() => ({ vista: vistaInicial }));
  const [pila, setPila] = useState<NavegacionState[]>([{ vista: vistaInicial }]);

  const pilaRef = useRef(pila);
  pilaRef.current = pila;
  const vistaInicialRef = useRef(vistaInicial);
  vistaInicialRef.current = vistaInicial;
  // Cuántos popstate vienen de volver() y ya están aplicados
  const internalBacks = useRef(0);
  // Marca de esta sesión de navegación: las entradas de historial de otra sesión
  // (por ejemplo, de antes de recargar la página) llevan al Inicio en vez de a una vista vieja
  const sesion = useRef(Math.random().toString(36).slice(2));

  const isUnlockedRef = useRef(isUnlocked);
  useEffect(() => {
    isUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  // Al montar, siempre arrancamos en la vista inicial en el historial.
  // Se deja además una copia de la raíz: así el gesto atrás vuelve a la raíz y no sale de la app.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({ vista: vistaInicial, nav: sesion.current }, '', '');
      window.history.pushState({ vista: vistaInicial, nav: sesion.current }, '', '');
    }
    // Solo una vez al montar: volver a la raíz no agrega entradas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escuchar popstate (gesto atrás del celular o botón atrás del navegador)
  useEffect(() => {
    // Deja de nuevo la entrada de la raíz: así el próximo atrás tampoco saca de la app
    const reabrirRaiz = () => {
      window.history.pushState({ vista: vistaInicialRef.current, nav: sesion.current }, '', '');
    };

    const onPopState = (event: PopStateEvent) => {
      if (internalBacks.current > 0) {
        internalBacks.current--;
        // Un volver() que aterriza en la raíz: se vuelve a dejar la entrada de la raíz
        if (isUnlockedRef.current && pilaRef.current.length === 1) reabrirRaiz();
        return;
      }
      // Si la app está bloqueada, el bloqueo tiene prioridad y no se cambia de vista
      if (!isUnlockedRef.current) return;

      const propia = event.state?.nav === sesion.current && event.state?.vista;
      const nuevoEstado: NavegacionState = propia
        ? { vista: event.state.vista, datos: event.state.datos }
        : { vista: vistaInicialRef.current };

      setEstado(nuevoEstado);
      setPila((prev) => (propia && prev.length > 1 ? prev.slice(0, -1) : [nuevoEstado]));
      if (nuevoEstado.vista === vistaInicialRef.current) reabrirRaiz();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const ir = useCallback((vista: Vista, datos?: Record<string, unknown>) => {
    const nuevo = { vista, datos };
    setPila((prev) => [...prev, nuevo]);
    setEstado(nuevo);
    if (typeof window !== 'undefined') {
      window.history.pushState({ ...nuevo, nav: sesion.current }, '', '');
    }
  }, []);

  const reemplazar = useCallback((vista: Vista, datos?: Record<string, unknown>) => {
    const nuevo = { vista, datos };
    setPila((prev) => (prev.length > 0 ? [...prev.slice(0, -1), nuevo] : [nuevo]));
    setEstado(nuevo);
    if (typeof window !== 'undefined') {
      window.history.replaceState({ ...nuevo, nav: sesion.current }, '', '');
    }
  }, []);

  const volver = useCallback(() => {
    // En la raíz no hay a dónde volver: no se llama a history.back (cerraría la app)
    if (pilaRef.current.length <= 1) {
      const nuevo: NavegacionState = { vista: 'home' };
      setPila([nuevo]);
      setEstado(nuevo);
      return;
    }
    const nuevaPila = pilaRef.current.slice(0, -1);
    setPila(nuevaPila);
    setEstado(nuevaPila[nuevaPila.length - 1]);
    if (typeof window !== 'undefined') {
      // El popstate que dispara este back ya está reflejado en el estado: se ignora una vez
      internalBacks.current++;
      window.history.back();
    }
  }, []);

  const irAPestana = useCallback((pestana: Pestana) => {
    if (estado.vista === pestana) return;
    ir(pestana);
  }, [estado.vista, ir]);

  return {
    vista: estado.vista,
    datos: estado.datos,
    ir,
    reemplazar,
    volver,
    irAPestana,
  };
}
