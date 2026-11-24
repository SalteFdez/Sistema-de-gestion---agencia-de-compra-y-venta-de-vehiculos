-- Corrige siguiente_codigo_vehiculo: pg_catalog.greatest(...) no existe como función
-- (GREATEST es una expresión de Postgres), por eso cargar stock fallaba con
-- "function pg_catalog.greatest(integer, integer) does not exist".
-- Misma firma (sin argumentos, devuelve text) y search_path vacío; CREATE OR REPLACE conserva los permisos.

CREATE OR REPLACE FUNCTION public.siguiente_codigo_vehiculo()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_numero BIGINT;
BEGIN
  v_numero := nextval('public.vehiculos_codigo_seq');
  RETURN 'MC-' || pg_catalog.lpad(v_numero::text, GREATEST(3, pg_catalog.length(v_numero::text)), '0');
END;
$function$;
