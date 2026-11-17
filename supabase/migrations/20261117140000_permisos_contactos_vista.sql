-- Migración correctiva de E2-06: privilegios mínimos.
-- Supabase da por defecto todos los privilegios a authenticated en tablas y vistas nuevas.
-- contactos: sin borrar (la historia no lo pide); v_gastos_sin_asignar: solo lectura.

REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.contactos FROM authenticated;
REVOKE ALL ON public.contactos FROM anon;

REVOKE ALL ON public.v_gastos_sin_asignar FROM authenticated;
GRANT SELECT ON public.v_gastos_sin_asignar TO authenticated;
