-- Migración E2-03: Venta con financiación (sin interés)
-- 1. Tablas financiaciones y cuotas, con RLS y sin borrar. Se anulan con su venta (ventas.anulada).
-- 2. ventas.comprador_telefono (texto opcional) y movimientos.cuota_id (para E2-04).
-- 3. Vistas v_cuotas y v_por_cobrar (security_invoker).
-- 4. registrar_venta con p_financiacion y p_comprador_telefono (DROP + CREATE: cambia la firma).

-- 1. Financiaciones y cuotas
CREATE TABLE IF NOT EXISTS public.financiaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL UNIQUE REFERENCES public.ventas(id),
  monto_total BIGINT NOT NULL CHECK (monto_total > 0),
  cantidad_cuotas INTEGER NOT NULL CHECK (cantidad_cuotas >= 1),
  fecha_primera DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE TABLE IF NOT EXISTS public.cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financiacion_id UUID NOT NULL REFERENCES public.financiaciones(id),
  numero INTEGER NOT NULL CHECK (numero >= 1),
  monto BIGINT NOT NULL CHECK (monto > 0),
  fecha_vencimiento DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  UNIQUE (financiacion_id, numero)
);

ALTER TABLE public.financiaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden leer financiaciones" ON public.financiaciones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden insertar financiaciones" ON public.financiaciones
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autenticados pueden leer cuotas" ON public.cuotas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden insertar cuotas" ON public.cuotas
  FOR INSERT TO authenticated WITH CHECK (true);

REVOKE ALL ON public.financiaciones FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.financiaciones TO authenticated;
REVOKE ALL ON public.cuotas FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.cuotas TO authenticated;

-- 2. Teléfono del comprador y enlace de cobros de cuota
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS comprador_telefono TEXT;

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS cuota_id UUID REFERENCES public.cuotas(id);

CREATE INDEX IF NOT EXISTS movimientos_cuota_id_idx ON public.movimientos (cuota_id);

-- 3. Vistas: cada cuota de una venta no anulada, con lo cobrado y su estado
CREATE OR REPLACE VIEW public.v_cuotas
WITH (security_invoker = true) AS
SELECT
  c.id AS cuota_id,
  f.venta_id,
  c.numero,
  c.monto,
  c.fecha_vencimiento,
  COALESCE(p.cobrado, 0)::BIGINT AS cobrado,
  (c.monto - COALESCE(p.cobrado, 0))::BIGINT AS saldo,
  CASE
    WHEN c.monto - COALESCE(p.cobrado, 0) = 0 THEN 'cobrada'
    WHEN c.fecha_vencimiento < (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN 'vencida'
    WHEN COALESCE(p.cobrado, 0) > 0 THEN 'parcial'
    ELSE 'pendiente'
  END AS estado,
  v.codigo AS vehiculo_codigo,
  vt.comprador_texto AS comprador,
  vt.comprador_telefono AS comprador_telefono,
  f.cantidad_cuotas AS total_cuotas
FROM public.cuotas c
JOIN public.financiaciones f ON f.id = c.financiacion_id
JOIN public.ventas vt ON vt.id = f.venta_id
JOIN public.vehiculos v ON v.id = vt.vehiculo_id
LEFT JOIN (
  SELECT m.cuota_id, SUM(m.monto) AS cobrado
  FROM public.movimientos m
  WHERE m.tipo = 'cuota_cobro' AND m.anulado = false AND m.cuota_id IS NOT NULL
  GROUP BY m.cuota_id
) p ON p.cuota_id = c.id
WHERE vt.anulada = false;

CREATE OR REPLACE VIEW public.v_por_cobrar
WITH (security_invoker = true) AS
SELECT COALESCE(SUM(saldo), 0)::BIGINT AS total
FROM public.v_cuotas;

REVOKE ALL ON public.v_cuotas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_cuotas TO authenticated;
REVOKE ALL ON public.v_por_cobrar FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_por_cobrar TO authenticated;

-- 4. registrar_venta con financiación (DROP + CREATE: cambia la firma)
DROP FUNCTION IF EXISTS public.registrar_venta(UUID, BIGINT, TEXT, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_vehiculo_id UUID,
  p_precio BIGINT,
  p_comprador TEXT DEFAULT NULL,
  p_cobros JSONB DEFAULT '[]'::jsonb,
  p_permutas JSONB DEFAULT '[]'::jsonb,
  p_financiacion JSONB DEFAULT NULL,
  p_comprador_telefono TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_estado TEXT;
  v_codigo TEXT;
  v_anulado BOOLEAN;
  v_venta_id UUID;
  v_cobro JSONB;
  v_p JSONB;
  v_cuenta_id UUID;
  v_monto BIGINT;
  v_suma_cobros BIGINT := 0;
  v_suma_permutas BIGINT := 0;
  v_financiado BIGINT := 0;
  v_cantidad_cuotas INTEGER := 0;
  v_fecha_primera DATE;
  v_financiacion_id UUID;
  v_cuota_base BIGINT;
  v_cuota_monto BIGINT;
  v_n INTEGER;
  v_cuentas_usadas UUID[] := '{}';
  v_recibido_id UUID;
  v_recibido_codigo TEXT;
  v_recibidos JSONB := '[]'::jsonb;
  v_ganancia BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  IF p_precio IS NULL OR p_precio <= 0 THEN
    RAISE EXCEPTION 'El precio de venta tiene que ser mayor que 0';
  END IF;

  IF p_cobros IS NULL OR jsonb_typeof(p_cobros) <> 'array' THEN
    RAISE EXCEPTION 'Los cobros tienen que ser una lista';
  END IF;
  IF p_permutas IS NULL OR jsonb_typeof(p_permutas) <> 'array' THEN
    RAISE EXCEPTION 'Las permutas tienen que ser una lista';
  END IF;

  -- Cobros: cada monto > 0, sin cuentas repetidas, cuentas activas
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
    v_suma_cobros := v_suma_cobros + v_monto;
  END LOOP;

  -- Permutas: datos mínimos y valor > 0; Σ permutas ≤ precio
  FOR v_p IN SELECT value FROM jsonb_array_elements(p_permutas) LOOP
    IF pg_catalog.btrim(COALESCE(v_p->>'marca', '')) = ''
       OR pg_catalog.btrim(COALESCE(v_p->>'modelo', '')) = ''
       OR (v_p->>'anio') IS NULL THEN
      RAISE EXCEPTION 'Faltan datos del vehículo recibido: marca, modelo y año';
    END IF;
    IF (v_p->>'valor_pactado')::BIGINT IS NULL OR (v_p->>'valor_pactado')::BIGINT <= 0 THEN
      RAISE EXCEPTION 'El valor pactado tiene que ser mayor que 0';
    END IF;
    v_suma_permutas := v_suma_permutas + (v_p->>'valor_pactado')::BIGINT;
  END LOOP;

  IF v_suma_permutas > p_precio THEN
    RAISE EXCEPTION 'Las permutas superan el precio. Sobran $ %', v_suma_permutas - p_precio;
  END IF;

  -- Financiación (sin interés): financiado ≤ lo que queda tras permutas; cuotas ≥ 1; primera cuota no anterior a hoy
  IF p_financiacion IS NOT NULL AND jsonb_typeof(p_financiacion) = 'object' THEN
    v_financiado := (p_financiacion->>'monto')::BIGINT;
    v_cantidad_cuotas := (p_financiacion->>'cantidad_cuotas')::INTEGER;
    v_fecha_primera := (p_financiacion->>'fecha_primera')::DATE;

    IF v_financiado IS NULL OR v_financiado <= 0 THEN
      RAISE EXCEPTION 'El monto financiado tiene que ser mayor que 0';
    END IF;
    IF v_cantidad_cuotas IS NULL OR v_cantidad_cuotas < 1 THEN
      RAISE EXCEPTION 'La cantidad de cuotas tiene que ser al menos 1';
    END IF;
    IF v_financiado > p_precio - v_suma_permutas THEN
      RAISE EXCEPTION 'El financiado supera lo que queda después de las permutas. Sobran $ %', v_financiado - (p_precio - v_suma_permutas);
    END IF;
    IF v_fecha_primera IS NULL OR v_fecha_primera < v_fecha THEN
      RAISE EXCEPTION 'La primera cuota no puede ser anterior a hoy';
    END IF;
  END IF;

  IF v_suma_cobros + v_suma_permutas + v_financiado <> p_precio THEN
    RAISE EXCEPTION 'Precio, cobros, permutas y financiado no cierran. Faltan $ %', p_precio - (v_suma_cobros + v_suma_permutas + v_financiado);
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
  INSERT INTO public.ventas (vehiculo_id, comprador_texto, comprador_telefono, fecha, precio_total, created_by)
  VALUES (
    p_vehiculo_id,
    pg_catalog.nullif(pg_catalog.btrim(p_comprador), ''),
    pg_catalog.nullif(pg_catalog.btrim(p_comprador_telefono), ''),
    v_fecha,
    p_precio,
    v_user_id
  )
  RETURNING id INTO v_venta_id;

  -- Un movimiento 'venta_cobro' positivo por cada cobro
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

  -- Financiación: cuotas iguales en entero, la diferencia en la última.
  -- El vencimiento de la cuota n es la primera + (n − 1) meses, siempre calculado desde la primera.
  IF v_financiado > 0 THEN
    INSERT INTO public.financiaciones (venta_id, monto_total, cantidad_cuotas, fecha_primera)
    VALUES (v_venta_id, v_financiado, v_cantidad_cuotas, v_fecha_primera)
    RETURNING id INTO v_financiacion_id;

    v_cuota_base := v_financiado / v_cantidad_cuotas;
    FOR v_n IN 1..v_cantidad_cuotas LOOP
      v_cuota_monto := CASE WHEN v_n = v_cantidad_cuotas
        THEN v_financiado - v_cuota_base * (v_cantidad_cuotas - 1)
        ELSE v_cuota_base END;

      INSERT INTO public.cuotas (financiacion_id, numero, monto, fecha_vencimiento)
      VALUES (
        v_financiacion_id,
        v_n,
        v_cuota_monto,
        (v_fecha_primera + ((v_n - 1) * interval '1 month'))::date
      );
    END LOOP;
  END IF;

  -- Cada auto recibido entra al stock con su valor pactado, con su propio código, en el orden cargado
  FOR v_p IN SELECT value FROM jsonb_array_elements(p_permutas) LOOP
    INSERT INTO public.vehiculos (marca, modelo, anio, color, patente, estado, origen, valor_ingreso, vendedor_texto, created_by)
    VALUES (
      pg_catalog.btrim(v_p->>'marca'),
      pg_catalog.btrim(v_p->>'modelo'),
      (v_p->>'anio')::INTEGER,
      pg_catalog.nullif(pg_catalog.btrim(v_p->>'color'), ''),
      pg_catalog.nullif(pg_catalog.btrim(v_p->>'patente'), ''),
      'en_stock',
      'permuta',
      (v_p->>'valor_pactado')::BIGINT,
      pg_catalog.nullif(pg_catalog.btrim(p_comprador), ''),
      v_user_id
    )
    RETURNING id, codigo INTO v_recibido_id, v_recibido_codigo;

    INSERT INTO public.venta_permutas (venta_id, vehiculo_recibido_id, valor_pactado)
    VALUES (v_venta_id, v_recibido_id, (v_p->>'valor_pactado')::BIGINT);

    v_recibidos := v_recibidos || jsonb_build_array(jsonb_build_object('vehiculo_id', v_recibido_id, 'codigo', v_recibido_codigo));
  END LOOP;

  -- El vehículo vendido pasa a vendido
  UPDATE public.vehiculos SET estado = 'vendido' WHERE id = p_vehiculo_id;

  SELECT g.ganancia INTO v_ganancia FROM public.v_ganancia_venta g WHERE g.venta_id = v_venta_id;

  RETURN jsonb_build_object(
    'venta_id', v_venta_id,
    'codigo', v_codigo,
    'fecha', v_fecha,
    'ganancia', v_ganancia,
    'permutas', v_recibidos
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_venta(UUID, BIGINT, TEXT, JSONB, JSONB, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta(UUID, BIGINT, TEXT, JSONB, JSONB, JSONB, TEXT) TO authenticated;
