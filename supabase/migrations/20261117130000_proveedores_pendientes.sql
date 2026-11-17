-- Migración E2-06: Pendientes de asignar (proveedores y asignación posterior)
-- 1. Tabla contactos mínima (proveedores), con nombre único sin distinguir mayúsculas y RLS.
-- 2. gastos.proveedor_id opcional.
-- 3. Vista v_gastos_sin_asignar (security_invoker).
-- 4. crear_contacto: si ya existe con ese nombre, devuelve el existente y le suma el tipo.
-- 5. registrar_gasto y registrar_gasto_repartido: suman proveedor opcional (solo gastos de vehículo).
-- 6. asignar_gasto: asigna plata pendiente con el gasto bloqueado. No crea movimientos.

-- 1. Contactos
CREATE TABLE IF NOT EXISTS public.contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(nombre)) > 0),
  telefono TEXT,
  tipos TEXT[] NOT NULL DEFAULT '{}' CHECK (tipos <@ ARRAY['comprador', 'vendedor', 'proveedor']::TEXT[]),
  notas TEXT,
  created_by UUID NOT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contactos_nombre_unico ON public.contactos (pg_catalog.lower(nombre));
CREATE INDEX IF NOT EXISTS contactos_created_by_idx ON public.contactos (created_by);

ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden leer contactos" ON public.contactos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden insertar contactos" ON public.contactos
  FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()));
CREATE POLICY "Autenticados pueden actualizar contactos" ON public.contactos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.contactos FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.contactos TO authenticated;

-- 2. Proveedor opcional en gastos
ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES public.contactos(id);

CREATE INDEX IF NOT EXISTS gastos_proveedor_id_idx ON public.gastos (proveedor_id);

-- 3. Gastos con plata sin asignar (solo de vehículos, no anulados)
CREATE OR REPLACE VIEW public.v_gastos_sin_asignar
WITH (security_invoker = true) AS
SELECT
  g.id AS gasto_id,
  g.fecha,
  c.nombre AS categoria_nombre,
  g.descripcion,
  g.monto_total,
  (g.monto_total - COALESCE(a.total, 0))::BIGINT AS pendiente,
  g.proveedor_id,
  p.nombre AS proveedor_nombre
FROM public.gastos g
JOIN public.categorias c ON c.id = g.categoria_id
LEFT JOIN public.contactos p ON p.id = g.proveedor_id
LEFT JOIN (
  SELECT gasto_id, SUM(monto) AS total
  FROM public.asignaciones_gasto
  WHERE anulada = false
  GROUP BY gasto_id
) a ON a.gasto_id = g.id
WHERE g.anulado = false
  AND g.alcance = 'vehiculos'
  AND (g.monto_total - COALESCE(a.total, 0)) > 0;

REVOKE ALL ON public.v_gastos_sin_asignar FROM PUBLIC, anon;
GRANT SELECT ON public.v_gastos_sin_asignar TO authenticated;

-- 4. Crear proveedor (o devolver el que ya existe con ese nombre)
CREATE OR REPLACE FUNCTION public.crear_contacto(
  p_nombre TEXT,
  p_telefono TEXT DEFAULT NULL,
  p_tipo TEXT DEFAULT 'proveedor'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_nombre TEXT;
  v_contacto public.contactos;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_nombre := pg_catalog.btrim(p_nombre);
  IF v_nombre IS NULL OR pg_catalog.length(v_nombre) = 0 THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;
  IF p_tipo NOT IN ('comprador', 'vendedor', 'proveedor') THEN
    RAISE EXCEPTION 'Tipo de contacto no válido';
  END IF;

  -- Si ya existe (sin distinguir mayúsculas), no se duplica: se usa el existente
  INSERT INTO public.contactos (nombre, telefono, tipos, created_by)
  VALUES (v_nombre, pg_catalog.nullif(pg_catalog.btrim(p_telefono), ''), ARRAY[p_tipo], v_user_id)
  ON CONFLICT ((pg_catalog.lower(nombre))) DO NOTHING
  RETURNING * INTO v_contacto;

  IF NOT FOUND THEN
    SELECT * INTO v_contacto
    FROM public.contactos c
    WHERE pg_catalog.lower(c.nombre) = pg_catalog.lower(v_nombre);

    -- Le suma el tipo si no lo tenía
    IF NOT (p_tipo = ANY(v_contacto.tipos)) THEN
      UPDATE public.contactos
      SET tipos = pg_catalog.array_append(tipos, p_tipo)
      WHERE id = v_contacto.id
      RETURNING * INTO v_contacto;
    END IF;
  END IF;

  RETURN jsonb_build_object('id', v_contacto.id, 'nombre', v_contacto.nombre, 'telefono', v_contacto.telefono);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_contacto(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crear_contacto(TEXT, TEXT, TEXT) TO authenticated;

-- 5a. registrar_gasto con proveedor opcional (solo gastos de vehículo)
DROP FUNCTION IF EXISTS public.registrar_gasto(BIGINT, UUID, UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.registrar_gasto(
  p_monto BIGINT,
  p_categoria_id UUID,
  p_cuenta_id UUID,
  p_descripcion TEXT DEFAULT NULL,
  p_vehiculo_id UUID DEFAULT NULL,
  p_proveedor_id UUID DEFAULT NULL
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
  v_codigo TEXT;
  v_anulado BOOLEAN;
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

  IF p_vehiculo_id IS NOT NULL THEN
    SELECT v.codigo, v.anulado INTO v_codigo, v_anulado FROM public.vehiculos v WHERE v.id = p_vehiculo_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el vehículo';
    END IF;
    IF v_anulado THEN
      RAISE EXCEPTION '% está anulado', v_codigo;
    END IF;
  END IF;

  -- El proveedor solo va en gastos de vehículo y tiene que ser un proveedor
  IF p_proveedor_id IS NOT NULL THEN
    IF p_vehiculo_id IS NULL THEN
      RAISE EXCEPTION 'Un gasto general no lleva proveedor';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.contactos c WHERE c.id = p_proveedor_id AND 'proveedor' = ANY(c.tipos)) THEN
      RAISE EXCEPTION 'El proveedor no existe';
    END IF;
  END IF;

  INSERT INTO public.gastos (fecha, monto_total, categoria_id, descripcion, alcance, created_by, proveedor_id)
  VALUES (
    v_fecha,
    p_monto,
    p_categoria_id,
    pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''),
    CASE WHEN p_vehiculo_id IS NULL THEN 'general' ELSE 'vehiculos' END,
    v_user_id,
    p_proveedor_id
  )
  RETURNING id INTO v_gasto_id;

  IF p_vehiculo_id IS NOT NULL THEN
    INSERT INTO public.asignaciones_gasto (gasto_id, vehiculo_id, monto, created_by)
    VALUES (v_gasto_id, p_vehiculo_id, p_monto, v_user_id);
  END IF;

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
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_gasto(BIGINT, UUID, UUID, TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_gasto(BIGINT, UUID, UUID, TEXT, UUID, UUID) TO authenticated;

-- 5b. registrar_gasto_repartido con proveedor opcional
DROP FUNCTION IF EXISTS public.registrar_gasto_repartido(BIGINT, UUID, UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.registrar_gasto_repartido(
  p_monto BIGINT,
  p_categoria_id UUID,
  p_cuenta_id UUID,
  p_descripcion TEXT DEFAULT NULL,
  p_asignaciones JSONB DEFAULT '[]'::jsonb,
  p_proveedor_id UUID DEFAULT NULL
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

  IF p_proveedor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contactos c WHERE c.id = p_proveedor_id AND 'proveedor' = ANY(c.tipos)
  ) THEN
    RAISE EXCEPTION 'El proveedor no existe';
  END IF;

  IF p_asignaciones IS NULL OR jsonb_typeof(p_asignaciones) <> 'array' THEN
    RAISE EXCEPTION 'Las asignaciones tienen que ser una lista';
  END IF;

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

  INSERT INTO public.gastos (fecha, monto_total, categoria_id, descripcion, alcance, created_by, proveedor_id)
  VALUES (
    v_fecha,
    p_monto,
    p_categoria_id,
    pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''),
    'vehiculos',
    v_user_id,
    p_proveedor_id
  )
  RETURNING id INTO v_gasto_id;

  FOR v_a IN SELECT value FROM jsonb_array_elements(p_asignaciones) LOOP
    INSERT INTO public.asignaciones_gasto (gasto_id, vehiculo_id, monto, created_by)
    VALUES (v_gasto_id, (v_a->>'vehiculo_id')::UUID, (v_a->>'monto')::BIGINT, v_user_id);
  END LOOP;

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

REVOKE EXECUTE ON FUNCTION public.registrar_gasto_repartido(BIGINT, UUID, UUID, TEXT, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_gasto_repartido(BIGINT, UUID, UUID, TEXT, JSONB, UUID) TO authenticated;

-- 6. Asignar un gasto pendiente. El gasto se bloquea: dos asignaciones simultáneas no pueden superar el pendiente.
CREATE OR REPLACE FUNCTION public.asignar_gasto(
  p_gasto_id UUID,
  p_asignaciones JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_monto_total BIGINT;
  v_anulado BOOLEAN;
  v_alcance TEXT;
  v_ya_asignado BIGINT;
  v_pendiente BIGINT;
  v_a JSONB;
  v_vehiculo_id UUID;
  v_monto BIGINT;
  v_codigo TEXT;
  v_vehanulado BOOLEAN;
  v_suma BIGINT := 0;
  v_vehiculos UUID[] := '{}';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Bloqueo del gasto: lo que se valida abajo no puede cambiar mientras se asigna
  SELECT g.monto_total, g.anulado, g.alcance INTO v_monto_total, v_anulado, v_alcance
  FROM public.gastos g
  WHERE g.id = p_gasto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el gasto';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'Este gasto está anulado';
  END IF;
  IF v_alcance <> 'vehiculos' THEN
    RAISE EXCEPTION 'Este gasto es general: no se asigna a vehículos';
  END IF;

  IF p_asignaciones IS NULL OR jsonb_typeof(p_asignaciones) <> 'array' THEN
    RAISE EXCEPTION 'Las asignaciones tienen que ser una lista';
  END IF;

  FOR v_a IN SELECT value FROM jsonb_array_elements(p_asignaciones) LOOP
    v_vehiculo_id := (v_a->>'vehiculo_id')::UUID;
    v_monto := (v_a->>'monto')::BIGINT;

    IF v_monto IS NULL OR v_monto <= 0 THEN
      RAISE EXCEPTION 'Cada asignación tiene que ser mayor que 0';
    END IF;
    IF v_vehiculo_id = ANY(v_vehiculos) THEN
      RAISE EXCEPTION 'Repetiste un vehículo: cada vehículo va una sola vez';
    END IF;

    SELECT v.codigo, v.anulado INTO v_codigo, v_vehanulado
    FROM public.vehiculos v
    WHERE v.id = v_vehiculo_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el vehículo';
    END IF;
    IF v_vehanulado THEN
      RAISE EXCEPTION '% está anulado', v_codigo;
    END IF;

    v_vehiculos := pg_catalog.array_append(v_vehiculos, v_vehiculo_id);
    v_suma := v_suma + v_monto;
  END LOOP;

  -- Pendiente recalculado con el gasto ya bloqueado
  SELECT COALESCE(SUM(a.monto), 0) INTO v_ya_asignado
  FROM public.asignaciones_gasto a
  WHERE a.gasto_id = p_gasto_id AND a.anulada = false;

  v_pendiente := v_monto_total - v_ya_asignado;
  IF v_pendiente <= 0 THEN
    RAISE EXCEPTION 'Este gasto ya está asignado del todo';
  END IF;
  IF v_suma > v_pendiente THEN
    RAISE EXCEPTION 'Lo asignado supera lo pendiente (queda $ %)', v_pendiente;
  END IF;

  -- Solo asignaciones: no hay movimientos, la plata ya había salido de la cuenta
  FOR v_a IN SELECT value FROM jsonb_array_elements(p_asignaciones) LOOP
    INSERT INTO public.asignaciones_gasto (gasto_id, vehiculo_id, monto, created_by)
    VALUES (p_gasto_id, (v_a->>'vehiculo_id')::UUID, (v_a->>'monto')::BIGINT, v_user_id);
  END LOOP;

  RETURN jsonb_build_object(
    'gasto_id', p_gasto_id,
    'pendiente_restante', v_pendiente - v_suma
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.asignar_gasto(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asignar_gasto(UUID, JSONB) TO authenticated;
