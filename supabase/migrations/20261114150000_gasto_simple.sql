-- Migración E1-07: Registrar un gasto simple
-- 1. categorias (con semilla de gasto e ingreso).
-- 2. gastos y asignaciones_gasto (un gasto puede asignarse a un vehículo o ser general).
-- 3. movimientos.gasto_id y movimientos.categoria_id.
-- 4. v_costo_vehiculo suma las asignaciones de gastos no anulados; v_inventario pasa a costo real.
-- 5. RPC registrar_gasto: en una sola transacción crea el gasto, su asignación (si es de un vehículo)
--    y un movimiento 'gasto' negativo.

-- 1. Categorías
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Nombre único por tipo, sin distinguir mayúsculas
CREATE UNIQUE INDEX IF NOT EXISTS categorias_tipo_nombre_idx ON public.categorias (tipo, lower(nombre));

-- Semilla: gastos e ingresos (la lista se ajusta después cambiando datos)
INSERT INTO public.categorias (nombre, tipo) VALUES
  ('Mecánica', 'gasto'),
  ('Chapa y pintura', 'gasto'),
  ('Repuestos', 'gasto'),
  ('Gestoría / trámites', 'gasto'),
  ('Lavado y preparación', 'gasto'),
  ('Combustible', 'gasto'),
  ('Publicidad', 'gasto'),
  ('Alquiler', 'gasto'),
  ('Servicios (luz, agua, internet)', 'gasto'),
  ('Sueldos', 'gasto'),
  ('Impuestos', 'gasto'),
  ('Otros gastos', 'gasto'),
  ('Comisión', 'ingreso'),
  ('Otros ingresos', 'ingreso')
ON CONFLICT DO NOTHING;

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados pueden leer categorias" ON public.categorias;
CREATE POLICY "Autenticados pueden leer categorias" ON public.categorias
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.categorias FROM anon;

-- 2. Gastos
CREATE TABLE IF NOT EXISTS public.gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  monto_total BIGINT NOT NULL CHECK (monto_total > 0),
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE RESTRICT,
  descripcion TEXT,
  alcance TEXT NOT NULL CHECK (alcance IN ('general', 'vehiculos')),
  anulado BOOLEAN NOT NULL DEFAULT false,
  anulado_por UUID REFERENCES public.usuarios(id),
  anulado_at TIMESTAMPTZ,
  motivo_anulacion TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS gastos_categoria_id_idx ON public.gastos (categoria_id);
CREATE INDEX IF NOT EXISTS gastos_created_by_idx ON public.gastos (created_by);
CREATE INDEX IF NOT EXISTS gastos_anulado_por_idx ON public.gastos (anulado_por);

-- 3. Asignaciones de gasto a vehículos (la fuente del costo)
CREATE TABLE IF NOT EXISTS public.asignaciones_gasto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_id UUID NOT NULL REFERENCES public.gastos(id) ON DELETE RESTRICT,
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  monto BIGINT NOT NULL CHECK (monto > 0),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS asignaciones_gasto_gasto_id_idx ON public.asignaciones_gasto (gasto_id);
CREATE INDEX IF NOT EXISTS asignaciones_gasto_vehiculo_id_idx ON public.asignaciones_gasto (vehiculo_id);
CREATE INDEX IF NOT EXISTS asignaciones_gasto_created_by_idx ON public.asignaciones_gasto (created_by);

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_gasto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados pueden leer gastos" ON public.gastos;
CREATE POLICY "Autenticados pueden leer gastos" ON public.gastos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados pueden insertar gastos" ON public.gastos;
CREATE POLICY "Autenticados pueden insertar gastos" ON public.gastos
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Autenticados pueden actualizar gastos" ON public.gastos;
CREATE POLICY "Autenticados pueden actualizar gastos" ON public.gastos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados pueden leer asignaciones" ON public.asignaciones_gasto;
CREATE POLICY "Autenticados pueden leer asignaciones" ON public.asignaciones_gasto
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados pueden insertar asignaciones" ON public.asignaciones_gasto;
CREATE POLICY "Autenticados pueden insertar asignaciones" ON public.asignaciones_gasto
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by);

-- Sin borrar gastos ni asignaciones; anónimos nada
REVOKE DELETE ON public.gastos FROM authenticated, anon;
REVOKE DELETE ON public.asignaciones_gasto FROM authenticated, anon;
REVOKE ALL ON public.gastos FROM anon;
REVOKE ALL ON public.asignaciones_gasto FROM anon;

-- 3. Vínculos en movimientos
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS gasto_id UUID REFERENCES public.gastos(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS movimientos_gasto_id_idx ON public.movimientos (gasto_id);
CREATE INDEX IF NOT EXISTS movimientos_categoria_id_idx ON public.movimientos (categoria_id);

-- 4. Vistas de costo (security_invoker; mismas columnas que antes)
-- v_costo_vehiculo: gastos asignados = suma de asignaciones de gastos no anulados
CREATE OR REPLACE VIEW public.v_costo_vehiculo
WITH (security_invoker = true) AS
SELECT
  v.id AS vehiculo_id,
  v.codigo,
  v.valor_ingreso,
  COALESCE(g.total, 0)::BIGINT AS gastos_asignados,
  (v.valor_ingreso + COALESCE(g.total, 0))::BIGINT AS costo_real
FROM public.vehiculos v
LEFT JOIN (
  SELECT a.vehiculo_id, SUM(a.monto) AS total
  FROM public.asignaciones_gasto a
  JOIN public.gastos gs ON gs.id = a.gasto_id
  WHERE gs.anulado = false
  GROUP BY a.vehiculo_id
) g ON g.vehiculo_id = v.id;

-- v_inventario: cantidad y costo real (no solo valor de ingreso) de lo que está en stock o reservado
CREATE OR REPLACE VIEW public.v_inventario
WITH (security_invoker = true) AS
SELECT
  COUNT(*)::BIGINT AS cantidad,
  COALESCE(SUM(c.costo_real), 0)::BIGINT AS total
FROM public.vehiculos v
JOIN public.v_costo_vehiculo c ON c.vehiculo_id = v.id
WHERE v.estado IN ('en_stock', 'reservado');

-- 5. RPC registrar_gasto
-- Gasto general: p_vehiculo_id nulo. Gasto de un vehículo: una asignación por el monto total.
CREATE OR REPLACE FUNCTION public.registrar_gasto(
  p_monto BIGINT,
  p_categoria_id UUID,
  p_cuenta_id UUID,
  p_descripcion TEXT DEFAULT NULL,
  p_vehiculo_id UUID DEFAULT NULL
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
    SELECT v.codigo INTO v_codigo FROM public.vehiculos v WHERE v.id = p_vehiculo_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se encontró el vehículo';
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
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_gasto(BIGINT, UUID, UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_gasto(BIGINT, UUID, UUID, TEXT, UUID) TO authenticated;
