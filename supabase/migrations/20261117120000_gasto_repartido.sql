-- Migración E2-05: Gasto repartido
-- 1. asignaciones_gasto: columnas de anulación, para "quitar" una parte sin borrarla.
-- 2. v_costo_vehiculo: suma solo asignaciones vigentes de gastos vigentes (security_invoker se mantiene).
-- 3. registrar_gasto_repartido: gasto con asignaciones parciales o vacías, un solo movimiento por el total.
-- 4. anular_vehiculo: un gasto solo de ese auto se anula entero; uno compartido libera solo la parte de ese auto.

-- 1. Columnas de anulación en asignaciones
ALTER TABLE public.asignaciones_gasto
  ADD COLUMN IF NOT EXISTS anulada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anulada_por UUID REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS anulada_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

CREATE INDEX IF NOT EXISTS asignaciones_gasto_anulada_por_idx ON public.asignaciones_gasto (anulada_por);

-- 2. Costo: solo asignaciones vigentes de gastos vigentes
CREATE OR REPLACE VIEW public.v_costo_vehiculo
WITH (security_invoker = true) AS
SELECT
  v.id AS vehiculo_id,
  v.codigo,
  v.valor_ingreso,
  COALESCE(g.total, 0::numeric)::bigint AS gastos_asignados,
  (v.valor_ingreso::numeric + COALESCE(g.total, 0::numeric))::bigint AS costo_real
FROM public.vehiculos v
LEFT JOIN (
  SELECT a.vehiculo_id, SUM(a.monto) AS total
  FROM public.asignaciones_gasto a
  JOIN public.gastos gs ON gs.id = a.gasto_id
  WHERE gs.anulado = false AND a.anulada = false
  GROUP BY a.vehiculo_id
) g ON g.vehiculo_id = v.id;

-- 3. Gasto repartido: asignaciones = [{vehiculo_id, monto}], puede venir vacía
CREATE OR REPLACE FUNCTION public.registrar_gasto_repartido(
  p_monto BIGINT,
  p_categoria_id UUID,
  p_cuenta_id UUID,
  p_descripcion TEXT DEFAULT NULL,
  p_asignaciones JSONB DEFAULT '[]'::jsonb
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
  v_gasto_id UUID;
  v_a JSONB;
  v_vehiculo_id UUID;
  v_monto BIGINT;
  v_codigo TEXT;
  v_anulado BOOLEAN;
  v_suma BIGINT := 0;
  v_vehiculos UUID[] := '{}';
  v_saldo BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

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

  IF p_asignaciones IS NULL OR jsonb_typeof(p_asignaciones) <> 'array' THEN
    RAISE EXCEPTION 'Las asignaciones tienen que ser una lista';
  END IF;

  -- Validación de cada asignación: monto > 0, vehículo existente y no anulado, sin repetidos
  FOR v_a IN SELECT value FROM jsonb_array_elements(p_asignaciones) LOOP
    v_vehiculo_id := (v_a->>'vehiculo_id')::UUID;
    v_monto := (v_a->>'monto')::BIGINT;

    IF v_monto IS NULL OR v_monto <= 0 THEN
      RAISE EXCEPTION 'Cada asignación tiene que ser mayor que 0';
    END IF;
    IF v_vehiculo_id = ANY(v_vehiculos) THEN
      RAISE EXCEPTION 'Repetiste un vehículo: cada vehículo va una sola vez';
    END IF;

    SELECT v.codigo, v.anulado INTO v_codigo, v_anulado
    FROM public.vehiculos v
    WHERE v.id = v_vehiculo_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el vehículo';
    END IF;
    IF v_anulado THEN
      RAISE EXCEPTION '% está anulado', v_codigo;
    END IF;

    v_vehiculos := pg_catalog.array_append(v_vehiculos, v_vehiculo_id);
    v_suma := v_suma + v_monto;
  END LOOP;

  IF v_suma > p_monto THEN
    RAISE EXCEPTION 'Sobran % asignados de más', v_suma - p_monto;
  END IF;

  -- Gasto con alcance vehiculos (puede quedar parte o todo sin asignar)
  INSERT INTO public.gastos (fecha, monto_total, categoria_id, descripcion, alcance, created_by)
  VALUES (
    v_fecha,
    p_monto,
    p_categoria_id,
    pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''),
    'vehiculos',
    v_user_id
  )
  RETURNING id INTO v_gasto_id;

  FOR v_a IN SELECT value FROM jsonb_array_elements(p_asignaciones) LOOP
    INSERT INTO public.asignaciones_gasto (gasto_id, vehiculo_id, monto, created_by)
    VALUES (v_gasto_id, (v_a->>'vehiculo_id')::UUID, (v_a->>'monto')::BIGINT, v_user_id);
  END LOOP;

  -- Un solo movimiento de salida por el total, sin vehiculo_id (puede ser de varios)
  INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, gasto_id, categoria_id)
  VALUES (
    v_fecha,
    p_cuenta_id,
    -p_monto,
    'gasto',
    COALESCE(pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''), v_categoria_nombre),
    v_user_id,
    v_gasto_id,
    p_categoria_id
  );

  SELECT COALESCE(SUM(m.monto), 0)::BIGINT INTO v_saldo
  FROM public.movimientos m
  WHERE m.cuenta_id = p_cuenta_id AND m.anulado = false;

  RETURN jsonb_build_object(
    'gasto_id', v_gasto_id,
    'fecha', v_fecha,
    'saldo_cuenta', v_saldo
  );
END;
$$;

-- 4. Anular un vehículo: cascada por gasto
-- Gasto solo de este auto que cubre el total: se anula entero (como E1-07).
-- Gasto compartido: se anula solo la asignación de este auto; esa parte queda sin asignar.
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
  v_suma BIGINT;
  v_ajenas BOOLEAN;
  v_liberado BIGINT;
  v_gastos_anulados INTEGER := 0;
  v_total_gastos BIGINT := 0;
  v_partes_liberadas INTEGER := 0;
  v_monto_liberado BIGINT := 0;
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

  -- Cascada: gastos vigentes con asignación vigente de este auto
  FOR v_gasto IN
    SELECT g.id, g.monto_total
    FROM public.gastos g
    JOIN public.asignaciones_gasto a ON a.gasto_id = g.id
    WHERE a.vehiculo_id = p_vehiculo_id AND a.anulada = false AND g.anulado = false
    FOR UPDATE OF g
  LOOP
    SELECT COALESCE(SUM(x.monto), 0) INTO v_suma
    FROM public.asignaciones_gasto x
    WHERE x.gasto_id = v_gasto.id AND x.anulada = false;

    SELECT EXISTS (
      SELECT 1 FROM public.asignaciones_gasto x
      WHERE x.gasto_id = v_gasto.id AND x.anulada = false AND x.vehiculo_id <> p_vehiculo_id
    ) INTO v_ajenas;

    IF NOT v_ajenas AND v_suma = v_gasto.monto_total THEN
      -- Gasto solo de este auto: se anula entero, con su movimiento
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
    ELSE
      -- Gasto compartido: se libera solo la parte de este auto; el gasto sigue para los otros
      SELECT COALESCE(SUM(x.monto), 0) INTO v_liberado
      FROM public.asignaciones_gasto x
      WHERE x.gasto_id = v_gasto.id AND x.vehiculo_id = p_vehiculo_id AND x.anulada = false;

      UPDATE public.asignaciones_gasto
      SET anulada = true,
          anulada_por = v_user_id,
          anulada_at = pg_catalog.now(),
          motivo_anulacion = v_motivo
      WHERE gasto_id = v_gasto.id AND vehiculo_id = p_vehiculo_id AND anulada = false;

      v_partes_liberadas := v_partes_liberadas + 1;
      v_monto_liberado := v_monto_liberado + v_liberado;
    END IF;
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
    'total_gastos', v_total_gastos,
    'partes_liberadas', v_partes_liberadas,
    'monto_liberado', v_monto_liberado
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_gasto_repartido(BIGINT, UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_gasto_repartido(BIGINT, UUID, UUID, TEXT, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.anular_vehiculo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_vehiculo(UUID, TEXT) TO authenticated;
