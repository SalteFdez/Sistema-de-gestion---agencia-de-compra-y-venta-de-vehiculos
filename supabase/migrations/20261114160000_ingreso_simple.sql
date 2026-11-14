-- Migración E1-07b: Registrar un ingreso simple
-- RPC registrar_ingreso: inserta un único movimiento 'ingreso_otro' positivo, con su categoría de tipo 'ingreso'.
-- Los ingresos son siempre generales: no llevan vehículo y no tocan costos, inventario ni ganancia.

CREATE OR REPLACE FUNCTION public.registrar_ingreso(
  p_monto BIGINT,
  p_categoria_id UUID,
  p_cuenta_id UUID,
  p_descripcion TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_categoria_nombre TEXT;
  v_movimiento_id UUID;
  v_saldo BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Fecha de hoy en Buenos Aires, igual que el resto
  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto tiene que ser mayor que 0';
  END IF;

  SELECT c.nombre INTO v_categoria_nombre
  FROM public.categorias c
  WHERE c.id = p_categoria_id AND c.tipo = 'ingreso' AND c.activa = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La categoría no existe o no está activa';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = p_cuenta_id AND c.activa) THEN
    RAISE EXCEPTION 'La cuenta no existe o está inactiva';
  END IF;

  -- Un único movimiento positivo: el ingreso solo suma al dinero disponible
  INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, categoria_id)
  VALUES (
    v_fecha,
    p_cuenta_id,
    p_monto,
    'ingreso_otro',
    COALESCE(pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''), v_categoria_nombre),
    v_user_id,
    p_categoria_id
  )
  RETURNING id INTO v_movimiento_id;

  SELECT COALESCE(SUM(m.monto), 0)::BIGINT INTO v_saldo
  FROM public.movimientos m
  WHERE m.cuenta_id = p_cuenta_id AND m.anulado = false;

  RETURN jsonb_build_object(
    'movimiento_id', v_movimiento_id,
    'fecha', v_fecha,
    'saldo_cuenta', v_saldo
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_ingreso(BIGINT, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_ingreso(BIGINT, UUID, UUID, TEXT) TO authenticated;
