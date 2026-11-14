-- Migración de corrección: código MC-### y rendimiento de RLS / claves foráneas
-- 1. El default de vehiculos.codigo pasa a una función que llama nextval una sola vez y no trunca al pasar de 999.
-- 2. Las políticas de INSERT de cuentas y movimientos evalúan auth.uid() una sola vez (advisor auth_rls_initplan).
-- 3. Índices en las claves foráneas created_by y anulado_por (advisor unindexed_foreign_keys).

-- 1. Función del código de vehículo
-- Con lpad(n, 3) un número de 4 dígitos quedaba truncado (1000 -> '100'); acá el ancho es el mínimo entre 3 y la longitud real.
CREATE OR REPLACE FUNCTION public.siguiente_codigo_vehiculo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_numero BIGINT;
BEGIN
  v_numero := nextval('public.vehiculos_codigo_seq');
  RETURN 'MC-' || pg_catalog.lpad(v_numero::text, pg_catalog.greatest(3, pg_catalog.length(v_numero::text)), '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.siguiente_codigo_vehiculo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.siguiente_codigo_vehiculo() TO authenticated;

ALTER TABLE public.vehiculos
  ALTER COLUMN codigo SET DEFAULT public.siguiente_codigo_vehiculo();

-- 2. Políticas de INSERT con (select auth.uid())
DROP POLICY IF EXISTS "Autenticados pueden insertar cuentas" ON public.cuentas;
CREATE POLICY "Autenticados pueden insertar cuentas" ON public.cuentas
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Autenticados pueden insertar movimientos" ON public.movimientos;
CREATE POLICY "Autenticados pueden insertar movimientos" ON public.movimientos
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by);

-- 3. Índices de claves foráneas
CREATE INDEX IF NOT EXISTS cuentas_created_by_idx ON public.cuentas (created_by);
CREATE INDEX IF NOT EXISTS movimientos_created_by_idx ON public.movimientos (created_by);
CREATE INDEX IF NOT EXISTS movimientos_anulado_por_idx ON public.movimientos (anulado_por);
