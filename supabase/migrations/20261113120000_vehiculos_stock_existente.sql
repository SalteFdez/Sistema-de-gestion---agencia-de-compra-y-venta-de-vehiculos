-- Migración E1-03: Stock existente
-- Crea la secuencia de códigos MC-###, la tabla vehiculos, la vista v_inventario,
-- las políticas RLS y el bucket privado 'vehiculos' con sus políticas de Storage.

-- 1. Secuencia para el código MC-### (nunca se reutiliza, aunque un alta falle)
CREATE SEQUENCE IF NOT EXISTS public.vehiculos_codigo_seq
  START WITH 1
  MINVALUE 1
  NO CYCLE;

GRANT USAGE ON SEQUENCE public.vehiculos_codigo_seq TO authenticated;

-- 2. Tabla vehiculos
CREATE TABLE IF NOT EXISTS public.vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE
    DEFAULT ('MC-' || lpad(nextval('public.vehiculos_codigo_seq')::text, 3, '0')),
  marca TEXT NOT NULL CHECK (length(btrim(marca)) > 0),
  modelo TEXT NOT NULL CHECK (length(btrim(modelo)) > 0),
  -- El cliente valida el rango (1950 hasta el año actual + 1); acá va un límite holgado de seguridad
  anio INTEGER NOT NULL CHECK (anio BETWEEN 1950 AND 2100),
  color TEXT,
  patente TEXT,
  -- Ruta dentro del bucket 'vehiculos' (no una URL)
  foto_url TEXT,
  estado TEXT NOT NULL DEFAULT 'en_stock'
    CHECK (estado IN ('en_stock', 'reservado', 'vendido')),
  origen TEXT NOT NULL DEFAULT 'inventario_inicial'
    CHECK (origen IN ('compra', 'permuta', 'inventario_inicial')),
  -- 0 = costo desconocido. Pesos enteros, igual que cuentas.
  valor_ingreso BIGINT NOT NULL CHECK (valor_ingreso >= 0),
  -- Siempre "hoy" en Buenos Aires; el formulario no la ofrece
  fecha_ingreso DATE NOT NULL
    DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  notas TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Índices: clave foránea y orden del listado
CREATE INDEX IF NOT EXISTS vehiculos_created_by_idx ON public.vehiculos (created_by);
CREATE INDEX IF NOT EXISTS vehiculos_created_at_idx ON public.vehiculos (created_at DESC);

-- 3. Vista v_inventario: cantidad y costo total de lo que está en stock o reservado
-- Con security_invoker = true para que respete RLS del usuario que consulta
CREATE OR REPLACE VIEW public.v_inventario
WITH (security_invoker = true) AS
SELECT
  COUNT(*)::BIGINT AS cantidad,
  COALESCE(SUM(valor_ingreso), 0)::BIGINT AS total
FROM public.vehiculos
WHERE estado IN ('en_stock', 'reservado');

-- 4. Row Level Security: autenticados leen, insertan y actualizan; nadie borra; anónimos nada
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados pueden leer vehiculos" ON public.vehiculos;
CREATE POLICY "Autenticados pueden leer vehiculos" ON public.vehiculos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados pueden insertar vehiculos" ON public.vehiculos;
CREATE POLICY "Autenticados pueden insertar vehiculos" ON public.vehiculos
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Autenticados pueden actualizar vehiculos" ON public.vehiculos;
CREATE POLICY "Autenticados pueden actualizar vehiculos" ON public.vehiculos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Sin política de DELETE: nadie puede borrar vehículos
REVOKE DELETE ON public.vehiculos FROM authenticated, anon;
REVOKE ALL ON public.vehiculos FROM anon;
REVOKE ALL ON public.v_inventario FROM anon;
GRANT SELECT ON public.v_inventario TO authenticated;

-- 5. Bucket privado 'vehiculos': solo JPEG, máximo 2 MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('vehiculos', 'vehiculos', false, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de Storage solo para el bucket 'vehiculos'
-- Autenticados leen (incluye las URLs firmadas) y suben; anónimos nada; no se borra ni se reemplaza
DROP POLICY IF EXISTS "Autenticados pueden leer fotos de vehiculos" ON storage.objects;
CREATE POLICY "Autenticados pueden leer fotos de vehiculos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'vehiculos');

DROP POLICY IF EXISTS "Autenticados pueden subir fotos de vehiculos" ON storage.objects;
CREATE POLICY "Autenticados pueden subir fotos de vehiculos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehiculos');
