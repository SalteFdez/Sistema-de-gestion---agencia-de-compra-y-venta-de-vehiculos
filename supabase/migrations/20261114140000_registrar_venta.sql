-- Migración E1-06: Venta simple
-- 1. Tabla ventas, con una sola venta no anulada por vehículo (índice único parcial).
-- 2. movimientos.venta_id liga los cobros con su venta.
-- 3. Vista v_ganancia_venta: precio de venta menos costo real.
-- 4. RPC registrar_venta: en una sola transacción crea la venta, un movimiento 'venta_cobro' positivo por cuenta
--    y pasa el vehículo a 'vendido'.

-- 1. Tabla ventas
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id) ON DELETE RESTRICT,
  comprador_texto TEXT,
  fecha DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  precio_total BIGINT NOT NULL CHECK (precio_total > 0),
  notas TEXT,
  anulada BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS ventas_vehiculo_id_idx ON public.ventas (vehiculo_id);
CREATE INDEX IF NOT EXISTS ventas_created_by_idx ON public.ventas (created_by);

-- Garantía en la base: una sola venta no anulada por vehículo (no se puede vender dos veces)
CREATE UNIQUE INDEX IF NOT EXISTS ventas_vehiculo_activa_idx
  ON public.ventas (vehiculo_id) WHERE anulada = false;

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados pueden leer ventas" ON public.ventas;
CREATE POLICY "Autenticados pueden leer ventas" ON public.ventas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados pueden insertar ventas" ON public.ventas;
CREATE POLICY "Autenticados pueden insertar ventas" ON public.ventas
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Autenticados pueden actualizar ventas" ON public.ventas;
CREATE POLICY "Autenticados pueden actualizar ventas" ON public.ventas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Sin política de DELETE: nadie puede borrar ventas; anónimos nada
REVOKE DELETE ON public.ventas FROM authenticated, anon;
REVOKE ALL ON public.ventas FROM anon;

-- 2. Vínculo cobro -> venta
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS venta_id UUID REFERENCES public.ventas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS movimientos_venta_id_idx ON public.movimientos (venta_id);

-- 3. Vista de ganancia por venta (security_invoker: respeta RLS; solo lectura para authenticated)
CREATE OR REPLACE VIEW public.v_ganancia_venta
WITH (security_invoker = true) AS
SELECT
  vt.id AS venta_id,
  vt.vehiculo_id,
  vt.precio_total,
  c.costo_real,
  (vt.precio_total - c.costo_real)::BIGINT AS ganancia
FROM public.ventas vt
JOIN public.v_costo_vehiculo c ON c.vehiculo_id = vt.vehiculo_id
WHERE vt.anulada = false;

REVOKE ALL ON public.v_ganancia_venta FROM PUBLIC, anon;
GRANT SELECT ON public.v_ganancia_venta TO authenticated;

-- 4. RPC registrar_venta
-- p_cobros: [{"cuenta_id": "<uuid>", "monto": 4000000}, ...]
-- Si algo no cierra, se lanza un error y no se guarda nada (la función corre en una sola transacción).
CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_vehiculo_id UUID,
  p_precio BIGINT,
  p_comprador TEXT DEFAULT NULL,
  p_cobros JSONB DEFAULT '[]'::jsonb
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
  v_venta_id UUID;
  v_cobro JSONB;
  v_cuenta_id UUID;
  v_monto BIGINT;
  v_suma BIGINT := 0;
  v_cuentas_usadas UUID[] := '{}';
  v_ganancia BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Fecha de hoy en Buenos Aires, igual que compra y stock
  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  IF p_precio IS NULL OR p_precio <= 0 THEN
    RAISE EXCEPTION 'El precio de venta tiene que ser mayor que 0';
  END IF;

  -- Cobros: al menos uno, cada monto > 0, sin cuentas repetidas, cuentas activas y suma exacta
  IF p_cobros IS NULL OR jsonb_typeof(p_cobros) <> 'array' OR jsonb_array_length(p_cobros) = 0 THEN
    RAISE EXCEPTION 'Tiene que haber al menos un cobro';
  END IF;

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
    v_suma := v_suma + v_monto;
  END LOOP;

  IF v_suma <> p_precio THEN
    RAISE EXCEPTION 'La suma de los cobros ($ %) no coincide con el precio ($ %)', v_suma, p_precio;
  END IF;

  -- Bloquea la fila del vehículo: dos ventas simultáneas no pueden pasar ambas el chequeo
  SELECT v.estado, v.codigo INTO v_estado, v_codigo
  FROM public.vehiculos v
  WHERE v.id = p_vehiculo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el vehículo';
  END IF;
  IF v_estado = 'vendido' THEN
    RAISE EXCEPTION '% ya está vendido', v_codigo;
  END IF;
  IF v_estado <> 'en_stock' THEN
    RAISE EXCEPTION '% no está en stock', v_codigo;
  END IF;

  -- Venta
  INSERT INTO public.ventas (vehiculo_id, comprador_texto, fecha, precio_total, created_by)
  VALUES (
    p_vehiculo_id,
    pg_catalog.nullif(pg_catalog.btrim(p_comprador), ''),
    v_fecha,
    p_precio,
    v_user_id
  )
  RETURNING id INTO v_venta_id;

  -- Un movimiento 'venta_cobro' positivo por cada cobro, ligado a la venta y al vehículo
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

  -- El vehículo pasa a vendido
  UPDATE public.vehiculos SET estado = 'vendido' WHERE id = p_vehiculo_id;

  SELECT g.ganancia INTO v_ganancia FROM public.v_ganancia_venta g WHERE g.venta_id = v_venta_id;

  RETURN jsonb_build_object(
    'venta_id', v_venta_id,
    'codigo', v_codigo,
    'fecha', v_fecha,
    'ganancia', v_ganancia
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_venta(UUID, BIGINT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta(UUID, BIGINT, TEXT, JSONB) TO authenticated;
