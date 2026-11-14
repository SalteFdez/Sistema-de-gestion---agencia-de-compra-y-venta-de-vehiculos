-- Migración E1-08: Historial y anulación simple
-- Sin cambios de tablas: movimientos y gastos ya tienen anulado / anulado_por / anulado_at / motivo_anulacion.
-- 1. anular_movimiento: solo saldo inicial e ingreso.
-- 2. anular_gasto: anula el gasto y su movimiento de salida en una sola transacción.
-- Nada se borra. Las vistas de saldo, costo y ganancia ya excluyen lo anulado.

-- 1. Anular un movimiento suelto (saldo inicial o ingreso)
CREATE OR REPLACE FUNCTION public.anular_movimiento(
  p_movimiento_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_tipo TEXT;
  v_anulado BOOLEAN;
  v_motivo TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);
  IF v_motivo IS NULL OR pg_catalog.length(v_motivo) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  -- Bloquea el movimiento para que dos anulaciones simultáneas no pasen ambas
  SELECT m.tipo, m.anulado INTO v_tipo, v_anulado
  FROM public.movimientos m
  WHERE m.id = p_movimiento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el movimiento';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'Este movimiento ya está anulado';
  END IF;

  IF v_tipo IN ('compra', 'venta_cobro') THEN
    RAISE EXCEPTION 'Este movimiento es parte de una compra o venta: se anula la operación completa';
  END IF;
  IF v_tipo = 'gasto' THEN
    RAISE EXCEPTION 'Este movimiento es un gasto: se anula el gasto completo';
  END IF;
  IF v_tipo NOT IN ('saldo_inicial', 'ingreso_otro') THEN
    RAISE EXCEPTION 'Este tipo de movimiento no se puede anular todavía';
  END IF;

  UPDATE public.movimientos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE id = p_movimiento_id;

  RETURN jsonb_build_object('movimiento_id', p_movimiento_id, 'anulado', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_movimiento(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_movimiento(UUID, TEXT) TO authenticated;

-- 2. Anular un gasto: el gasto y su movimiento de salida, juntos
CREATE OR REPLACE FUNCTION public.anular_gasto(
  p_gasto_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_anulado BOOLEAN;
  v_motivo TEXT;
  v_movimientos INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);
  IF v_motivo IS NULL OR pg_catalog.length(v_motivo) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  SELECT g.anulado INTO v_anulado
  FROM public.gastos g
  WHERE g.id = p_gasto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el gasto';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'Este gasto ya está anulado';
  END IF;

  UPDATE public.gastos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE id = p_gasto_id;

  -- Su movimiento de salida se anula con los mismos datos
  UPDATE public.movimientos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE gasto_id = p_gasto_id AND anulado = false;
  GET DIAGNOSTICS v_movimientos = ROW_COUNT;

  RETURN jsonb_build_object('gasto_id', p_gasto_id, 'anulado', true, 'movimientos_anulados', v_movimientos);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_gasto(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_gasto(UUID, TEXT) TO authenticated;
