-- Migración E1-05: Detalle del vehículo
-- Vista v_costo_vehiculo: costo real por vehículo.
-- Hoy no hay gastos: gastos_asignados = 0 y costo_real = valor_ingreso.
-- E1-07 la redefine para sumar las asignaciones de gastos.

CREATE OR REPLACE VIEW public.v_costo_vehiculo
WITH (security_invoker = true) AS
SELECT
  v.id AS vehiculo_id,
  v.codigo,
  v.valor_ingreso,
  0::BIGINT AS gastos_asignados,
  (v.valor_ingreso + 0::BIGINT)::BIGINT AS costo_real
FROM public.vehiculos v;

-- Solo usuarios autenticados pueden leer la vista; anónimos nada
REVOKE ALL ON public.v_costo_vehiculo FROM PUBLIC, anon;
GRANT SELECT ON public.v_costo_vehiculo TO authenticated;
