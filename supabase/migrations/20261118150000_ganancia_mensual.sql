-- Migración E3-01: Ganancia por mes
-- Una vista que agrupa por mes y se recalcula con el estado actual (nada se guarda).
--   ventas: precio completo de las ventas no anuladas, en el mes de la venta.
--   costo_vendido: costo real de esos autos (valor de ingreso + sus gastos asignados), en el mes de la venta.
--   gastos_generales: gastos generales no anulados, en el mes de su fecha.
--   gastos_sin_asignar: lo que hoy está sin asignar de cada gasto de vehículos, en el mes del gasto.
--   ingresos: ingresos generales (ingreso_otro) no anulados, en el mes de su fecha.
--   ganancia = ventas − costo_vendido − gastos_generales − gastos_sin_asignar + ingresos.
-- Compras, cobros, cuotas, pases, aportes y retiros no entran.

CREATE OR REPLACE VIEW public.v_ganancia_mensual
WITH (security_invoker = true) AS
WITH ventas_mes AS (
  SELECT
    date_trunc('month', vt.fecha)::date AS mes,
    SUM(vt.precio_total)::BIGINT AS ventas,
    COUNT(*)::INTEGER AS cantidad_vendidos,
    SUM(g.costo_real)::BIGINT AS costo_vendido
  FROM public.ventas vt
  JOIN public.v_ganancia_venta g ON g.venta_id = vt.id
  GROUP BY 1
),
generales_mes AS (
  SELECT
    date_trunc('month', g.fecha)::date AS mes,
    SUM(g.monto_total)::BIGINT AS gastos_generales
  FROM public.gastos g
  WHERE g.alcance = 'general' AND g.anulado = false
  GROUP BY 1
),
sin_asignar_mes AS (
  SELECT
    date_trunc('month', s.fecha)::date AS mes,
    SUM(s.pendiente)::BIGINT AS gastos_sin_asignar
  FROM public.v_gastos_sin_asignar s
  GROUP BY 1
),
ingresos_mes AS (
  SELECT
    date_trunc('month', m.fecha)::date AS mes,
    SUM(m.monto)::BIGINT AS ingresos
  FROM public.movimientos m
  WHERE m.tipo = 'ingreso_otro' AND m.anulado = false
  GROUP BY 1
),
meses AS (
  SELECT mes FROM ventas_mes
  UNION SELECT mes FROM generales_mes
  UNION SELECT mes FROM sin_asignar_mes
  UNION SELECT mes FROM ingresos_mes
)
SELECT
  m.mes,
  COALESCE(v.ventas, 0)::BIGINT AS ventas,
  COALESCE(v.cantidad_vendidos, 0)::INTEGER AS cantidad_vendidos,
  COALESCE(v.costo_vendido, 0)::BIGINT AS costo_vendido,
  COALESCE(gg.gastos_generales, 0)::BIGINT AS gastos_generales,
  COALESCE(gs.gastos_sin_asignar, 0)::BIGINT AS gastos_sin_asignar,
  COALESCE(i.ingresos, 0)::BIGINT AS ingresos,
  (COALESCE(v.ventas, 0) - COALESCE(v.costo_vendido, 0) - COALESCE(gg.gastos_generales, 0)
    - COALESCE(gs.gastos_sin_asignar, 0) + COALESCE(i.ingresos, 0))::BIGINT AS ganancia
FROM meses m
LEFT JOIN ventas_mes v ON v.mes = m.mes
LEFT JOIN generales_mes gg ON gg.mes = m.mes
LEFT JOIN sin_asignar_mes gs ON gs.mes = m.mes
LEFT JOIN ingresos_mes i ON i.mes = m.mes;

REVOKE ALL ON public.v_ganancia_mensual FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_ganancia_mensual TO authenticated;
