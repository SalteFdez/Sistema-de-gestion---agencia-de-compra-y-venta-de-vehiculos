-- Migración E1-08b: Anular una compra o una venta
-- 1. Columnas de anulación en vehiculos y ventas (nada se borra).
-- 2. v_inventario excluye vehículos anulados.
-- 3. anular_vehiculo: en una transacción anula el vehículo, sus gastos vigentes con sus movimientos y sus pagos de compra.
-- 4. anular_venta: en una transacción anula la venta y sus cobros, y devuelve el vehículo a en_stock.

-- 1. Columnas de anulación
ALTER TABLE public.vehiculos
  ADD COLUMN IF NOT EXISTS anulado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anulado_por UUID REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS anulado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

CREATE INDEX IF NOT EXISTS vehiculos_anulado_por_idx ON public.vehiculos (anulado_por);

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS anulada_por UUID REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS anulada_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

CREATE INDEX IF NOT EXISTS ventas_anulada_por_idx ON public.ventas (anulada_por);

-- 2. Inventario: sin vehículos anulados (sigue a costo real)
CREATE OR REPLACE VIEW public.v_inventario
WITH (security_invoker = true) AS
SELECT
  COUNT(*)::BIGINT AS cantidad,
  COALESCE(SUM(c.costo_real), 0)::BIGINT AS total
FROM public.vehiculos v
JOIN public.v_costo_vehiculo c ON c.vehiculo_id = v.id
WHERE v.estado IN ('en_stock', 'reservado') AND v.anulado = false;

-- 3. Anular un vehículo (compra o alta de stock existente), con cascada
CREATE OR REPLACE FUNCTION public.anular_vehiculo(
  p_vehiculo_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_motivo TEXT;
  v_codigo TEXT;
  v_anulado BOOLEAN;
  v_estado TEXT;
  v_gasto RECORD;
  v_gastos_anulados INTEGER := 0;
  v_total_gastos BIGINT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);
  IF v_motivo IS NULL OR pg_catalog.length(v_motivo) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  -- Bloquea el vehículo para que dos anulaciones o una venta simultánea no se crucen
  SELECT v.codigo, v.anulado, v.estado INTO v_codigo, v_anulado, v_estado
  FROM public.vehiculos v
  WHERE v.id = p_vehiculo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el vehículo';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION '% ya está anulado', v_codigo;
  END IF;
  IF v_estado = 'vendido' OR EXISTS (
    SELECT 1 FROM public.ventas vt WHERE vt.vehiculo_id = p_vehiculo_id AND vt.anulada = false
  ) THEN
    RAISE EXCEPTION 'Primero anulá la venta de %', v_codigo;
  END IF;

  -- Cascada: gastos vigentes asignados al vehículo, con su movimiento de salida
  FOR v_gasto IN
    SELECT g.id, g.monto_total
    FROM public.gastos g
    JOIN public.asignaciones_gasto a ON a.gasto_id = g.id
    WHERE a.vehiculo_id = p_vehiculo_id AND g.anulado = false
    FOR UPDATE OF g
  LOOP
    UPDATE public.gastos
    SET anulado = true,
        anulado_por = v_user_id,
        anulado_at = pg_catalog.now(),
        motivo_anulacion = v_motivo
    WHERE id = v_gasto.id;

    UPDATE public.movimientos
    SET anulado = true,
        anulado_por = v_user_id,
        anulado_at = pg_catalog.now(),
        motivo_anulacion = v_motivo
    WHERE gasto_id = v_gasto.id AND anulado = false;

    v_gastos_anulados := v_gastos_anulados + 1;
    v_total_gastos := v_total_gastos + v_gasto.monto_total;
  END LOOP;

  -- Pagos de la compra (las altas de stock existente no tienen pagos)
  UPDATE public.movimientos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE vehiculo_id = p_vehiculo_id AND tipo = 'compra' AND anulado = false;

  -- El vehículo queda anulado (su código no se reutiliza)
  UPDATE public.vehiculos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE id = p_vehiculo_id;

  RETURN jsonb_build_object(
    'vehiculo_id', p_vehiculo_id,
    'codigo', v_codigo,
    'gastos_anulados', v_gastos_anulados,
    'total_gastos', v_total_gastos
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_vehiculo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_vehiculo(UUID, TEXT) TO authenticated;

-- 4. Anular una venta: los cobros se anulan y el vehículo vuelve a en_stock
CREATE OR REPLACE FUNCTION public.anular_venta(
  p_venta_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_motivo TEXT;
  v_vehiculo_id UUID;
  v_anulada BOOLEAN;
  v_codigo TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);
  IF v_motivo IS NULL OR pg_catalog.length(v_motivo) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  SELECT vt.vehiculo_id, vt.anulada INTO v_vehiculo_id, v_anulada
  FROM public.ventas vt
  WHERE vt.id = p_venta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la venta';
  END IF;
  IF v_anulada THEN
    RAISE EXCEPTION 'Esta venta ya está anulada';
  END IF;

  UPDATE public.ventas
  SET anulada = true,
      anulada_por = v_user_id,
      anulada_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE id = p_venta_id;

  UPDATE public.movimientos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE venta_id = p_venta_id AND anulado = false;

  -- El vehículo vuelve a en_stock y puede volver a venderse
  UPDATE public.vehiculos
  SET estado = 'en_stock'
  WHERE id = v_vehiculo_id AND estado = 'vendido'
  RETURNING codigo INTO v_codigo;

  RETURN jsonb_build_object('venta_id', p_venta_id, 'vehiculo_id', v_vehiculo_id, 'codigo', v_codigo);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_venta(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_venta(UUID, TEXT) TO authenticated;

-- 5. Un vehículo anulado no se puede vender ni recibir gastos (anular_vehiculo lo deja en en_stock)
CREATE OR REPLACE FUNCTION public.registrar_gasto(
  p_monto bigint,
  p_categoria_id uuid,
  p_cuenta_id uuid,
  p_descripcion text DEFAULT NULL::text,
  p_vehiculo_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_categoria_nombre TEXT;
  v_gasto_id UUID;
  v_codigo TEXT;
  v_anulado BOOLEAN;
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
  WHERE c.id = p_categoria_id AND c.tipo = 'gasto' AND c.activa = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La categoría no existe o no está activa';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = p_cuenta_id AND c.activa) THEN
    RAISE EXCEPTION 'La cuenta no existe o está inactiva';
  END IF;

  IF p_vehiculo_id IS NOT NULL THEN
    SELECT v.codigo, v.anulado INTO v_codigo, v_anulado FROM public.vehiculos v WHERE v.id = p_vehiculo_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el vehículo';
    END IF;
    IF v_anulado THEN
      RAISE EXCEPTION '% está anulado', v_codigo;
    END IF;
  END IF;

  -- Gasto
  INSERT INTO public.gastos (fecha, monto_total, categoria_id, descripcion, alcance, created_by)
  VALUES (
    v_fecha,
    p_monto,
    p_categoria_id,
    pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''),
    CASE WHEN p_vehiculo_id IS NULL THEN 'general' ELSE 'vehiculos' END,
    v_user_id
  )
  RETURNING id INTO v_gasto_id;

  -- Si es de un vehículo, una asignación por el monto total
  IF p_vehiculo_id IS NOT NULL THEN
    INSERT INTO public.asignaciones_gasto (gasto_id, vehiculo_id, monto, created_by)
    VALUES (v_gasto_id, p_vehiculo_id, p_monto, v_user_id);
  END IF;

  -- Movimiento de salida de la cuenta
  INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, vehiculo_id, gasto_id, categoria_id)
  VALUES (
    v_fecha,
    p_cuenta_id,
    -p_monto,
    'gasto',
    COALESCE(pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''), v_categoria_nombre),
    v_user_id,
    p_vehiculo_id,
    v_gasto_id,
    p_categoria_id
  );

  SELECT COALESCE(SUM(m.monto), 0)::BIGINT INTO v_saldo
  FROM public.movimientos m
  WHERE m.cuenta_id = p_cuenta_id AND m.anulado = false;

  RETURN jsonb_build_object(
    'gasto_id', v_gasto_id,
    'fecha', v_fecha,
    'vehiculo_codigo', v_codigo,
    'saldo_cuenta', v_saldo
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_vehiculo_id uuid,
  p_precio bigint,
  p_comprador text DEFAULT NULL::text,
  p_cobros jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_estado TEXT;
  v_codigo TEXT;
  v_anulado BOOLEAN;
  v_venta_id UUID;
  v_cobro JSONB;
  v_cuenta_id UUID;
  v_monto BIGINT;
  v_suma BIGINT := 0;
  v_cuentas_usadas UUID[] := '{}';
  v_ganancia BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Fecha de hoy en Buenos Aires, igual que compra y stock
  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  IF p_precio IS NULL OR p_precio <= 0 THEN
    RAISE EXCEPTION 'El precio de venta tiene que ser mayor que 0';
  END IF;

  -- Cobros: al menos uno, cada monto > 0, sin cuentas repetidas, cuentas activas y suma exacta
  IF p_cobros IS NULL OR jsonb_typeof(p_cobros) <> 'array' OR jsonb_array_length(p_cobros) = 0 THEN
    RAISE EXCEPTION 'Tiene que haber al menos un cobro';
  END IF;

  FOR v_cobro IN SELECT value FROM jsonb_array_elements(p_cobros) LOOP
    v_cuenta_id := (v_cobro->>'cuenta_id')::UUID;
    v_monto := (v_cobro->>'monto')::BIGINT;

    IF v_monto IS NULL OR v_monto <= 0 THEN
      RAISE EXCEPTION 'Cada cobro tiene que ser mayor que 0';
    END IF;
    IF v_cuenta_id = ANY(v_cuentas_usadas) THEN
      RAISE EXCEPTION 'No podés repetir una cuenta en los cobros';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = v_cuenta_id AND c.activa) THEN
      RAISE EXCEPTION 'Una de las cuentas no existe o está inactiva';
    END IF;

    v_cuentas_usadas := pg_catalog.array_append(v_cuentas_usadas, v_cuenta_id);
    v_suma := v_suma + v_monto;
  END LOOP;

  IF v_suma <> p_precio THEN
    RAISE EXCEPTION 'La suma de los cobros ($ %) no coincide con el precio ($ %)', v_suma, p_precio;
  END IF;

  -- Bloquea la fila del vehículo: dos ventas simultáneas no pueden pasar ambas el chequeo
  SELECT v.estado, v.codigo, v.anulado INTO v_estado, v_codigo, v_anulado
  FROM public.vehiculos v
  WHERE v.id = p_vehiculo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el vehículo';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION '% está anulado', v_codigo;
  END IF;
  IF v_estado = 'vendido' THEN
    RAISE EXCEPTION '% ya está vendido', v_codigo;
  END IF;
  IF v_estado <> 'en_stock' THEN
    RAISE EXCEPTION '% no está en stock', v_codigo;
  END IF;

  -- Venta
  INSERT INTO public.ventas (vehiculo_id, comprador_texto, fecha, precio_total, created_by)
  VALUES (
    p_vehiculo_id,
    pg_catalog.nullif(pg_catalog.btrim(p_comprador), ''),
    v_fecha,
    p_precio,
    v_user_id
  )
  RETURNING id INTO v_venta_id;

  -- Un movimiento 'venta_cobro' positivo por cada cobro, ligado a la venta y al vehículo
  FOR v_cobro IN SELECT value FROM jsonb_array_elements(p_cobros) LOOP
    INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, vehiculo_id, venta_id)
    VALUES (
      v_fecha,
      (v_cobro->>'cuenta_id')::UUID,
      (v_cobro->>'monto')::BIGINT,
      'venta_cobro',
      'Venta ' || v_codigo,
      v_user_id,
      p_vehiculo_id,
      v_venta_id
    );
  END LOOP;

  -- El vehículo pasa a vendido
  UPDATE public.vehiculos SET estado = 'vendido' WHERE id = p_vehiculo_id;

  SELECT g.ganancia INTO v_ganancia FROM public.v_ganancia_venta g WHERE g.venta_id = v_venta_id;

  RETURN jsonb_build_object(
    'venta_id', v_venta_id,
    'codigo', v_codigo,
    'fecha', v_fecha,
    'ganancia', v_ganancia
  );
END;
$function$;
