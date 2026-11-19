-- Migración E2-04: Cuotas por cobrar
-- 1. cobrar_cuota: cobro total o parcial de una cuota, en la cuenta donde entró. La cuota se bloquea
--    y el saldo se recalcula con la cuota bloqueada, así dos cobros simultáneos no se pasan.
-- 2. anular_movimiento acepta cuota_cobro. anular_venta no cambia: los cobros de cuota llevan venta_id.

-- 1. Cobrar una cuota
CREATE OR REPLACE FUNCTION public.cobrar_cuota(
  p_cuota_id UUID,
  p_cuenta_id UUID,
  p_monto BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_numero INTEGER;
  v_cuota_monto BIGINT;
  v_venta_id UUID;
  v_vehiculo_id UUID;
  v_cantidad INTEGER;
  v_vt_anulada BOOLEAN;
  v_codigo TEXT;
  v_cobrado BIGINT;
  v_saldo BIGINT;
  v_movimiento_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto tiene que ser mayor que 0';
  END IF;

  -- Bloquea la cuota: dos cobros sobre la misma cuota pasan uno por vez
  SELECT c.numero, c.monto, f.venta_id, f.cantidad_cuotas, vt.vehiculo_id, vt.anulada, v.codigo
  INTO v_numero, v_cuota_monto, v_venta_id, v_cantidad, v_vehiculo_id, v_vt_anulada, v_codigo
  FROM public.cuotas c
  JOIN public.financiaciones f ON f.id = c.financiacion_id
  JOIN public.ventas vt ON vt.id = f.venta_id
  JOIN public.vehiculos v ON v.id = vt.vehiculo_id
  WHERE c.id = p_cuota_id
  FOR UPDATE OF c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la cuota';
  END IF;
  IF v_vt_anulada THEN
    RAISE EXCEPTION 'La venta de esta cuota está anulada';
  END IF;

  -- Saldo recalculado con la cuota bloqueada
  SELECT COALESCE(SUM(m.monto), 0) INTO v_cobrado
  FROM public.movimientos m
  WHERE m.cuota_id = p_cuota_id AND m.tipo = 'cuota_cobro' AND m.anulado = false;

  v_saldo := v_cuota_monto - v_cobrado;
  IF v_saldo <= 0 THEN
    RAISE EXCEPTION 'Esta cuota ya está cobrada';
  END IF;
  IF p_monto > v_saldo THEN
    RAISE EXCEPTION 'Solo quedan $ % de esta cuota. No se cobró nada.', v_saldo;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = p_cuenta_id AND c.activa) THEN
    RAISE EXCEPTION 'La cuenta no existe o está inactiva';
  END IF;

  INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, vehiculo_id, venta_id, cuota_id)
  VALUES (
    v_fecha,
    p_cuenta_id,
    p_monto,
    'cuota_cobro',
    'Cuota ' || v_numero || '/' || v_cantidad || ' · ' || v_codigo,
    v_user_id,
    v_vehiculo_id,
    v_venta_id,
    p_cuota_id
  )
  RETURNING id INTO v_movimiento_id;

  RETURN jsonb_build_object(
    'movimiento_id', v_movimiento_id,
    'saldo_restante', v_saldo - p_monto
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cobrar_cuota(UUID, UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cobrar_cuota(UUID, UUID, BIGINT) TO authenticated;

-- 2. anular_movimiento: además de los tipos anteriores, acepta el cobro de una cuota
CREATE OR REPLACE FUNCTION public.anular_movimiento(p_movimiento_id uuid, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
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
  IF v_tipo IN ('transferencia_salida', 'transferencia_entrada') THEN
    RAISE EXCEPTION 'Este movimiento es parte de un pase: se anula el pase completo';
  END IF;
  IF v_tipo NOT IN ('saldo_inicial', 'ingreso_otro', 'aporte_socio', 'retiro_socio', 'cuota_cobro') THEN
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
$function$;

REVOKE EXECUTE ON FUNCTION public.anular_movimiento(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_movimiento(UUID, TEXT) TO authenticated;
