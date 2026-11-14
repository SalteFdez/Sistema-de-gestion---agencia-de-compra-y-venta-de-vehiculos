-- Migración E1-04: Comprar vehículo
-- 1. movimientos.vehiculo_id liga los pagos de una compra con su vehículo.
-- 2. vehiculos.vendedor_texto guarda el vendedor (texto libre, opcional).
-- 3. RPC registrar_compra: en una sola transacción crea el vehículo y un movimiento 'compra' negativo por cada pago.

-- 1. Vínculo movimiento -> vehículo
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS vehiculo_id UUID REFERENCES public.vehiculos(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS movimientos_vehiculo_id_idx ON public.movimientos (vehiculo_id);

-- 2. Vendedor como texto libre
ALTER TABLE public.vehiculos
  ADD COLUMN IF NOT EXISTS vendedor_texto TEXT;

-- 3. RPC registrar_compra
-- p_pagos: [{"cuenta_id": "<uuid>", "monto": 3000000}, ...]
-- Si algo no cierra, se lanza un error y no se guarda nada (la función corre en una sola transacción).
CREATE OR REPLACE FUNCTION public.registrar_compra(
  p_marca TEXT,
  p_modelo TEXT,
  p_anio INTEGER,
  p_precio BIGINT,
  p_color TEXT DEFAULT NULL,
  p_patente TEXT DEFAULT NULL,
  p_vendedor TEXT DEFAULT NULL,
  p_pagos JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_vehiculo_id UUID;
  v_codigo TEXT;
  v_pago JSONB;
  v_cuenta_id UUID;
  v_monto BIGINT;
  v_suma BIGINT := 0;
  v_cuentas_usadas UUID[] := '{}';
  v_saldos JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Fecha de hoy en Buenos Aires, igual que crear_cuenta
  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  -- Datos del vehículo
  IF p_marca IS NULL OR pg_catalog.length(pg_catalog.btrim(p_marca)) = 0 THEN
    RAISE EXCEPTION 'La marca es obligatoria';
  END IF;
  IF p_modelo IS NULL OR pg_catalog.length(pg_catalog.btrim(p_modelo)) = 0 THEN
    RAISE EXCEPTION 'El modelo es obligatorio';
  END IF;
  IF p_anio IS NULL OR p_anio < 1950 OR p_anio > 2100 THEN
    RAISE EXCEPTION 'El año tiene que estar entre 1950 y 2100';
  END IF;
  IF p_precio IS NULL OR p_precio <= 0 THEN
    RAISE EXCEPTION 'El precio tiene que ser mayor que 0';
  END IF;

  -- Pagos: al menos uno, cada monto > 0, sin cuentas repetidas, cuentas activas y suma exacta
  IF p_pagos IS NULL OR jsonb_typeof(p_pagos) <> 'array' OR jsonb_array_length(p_pagos) = 0 THEN
    RAISE EXCEPTION 'Tiene que haber al menos un pago';
  END IF;

  FOR v_pago IN SELECT value FROM jsonb_array_elements(p_pagos) LOOP
    v_cuenta_id := (v_pago->>'cuenta_id')::UUID;
    v_monto := (v_pago->>'monto')::BIGINT;

    IF v_monto IS NULL OR v_monto <= 0 THEN
      RAISE EXCEPTION 'Cada pago tiene que ser mayor que 0';
    END IF;
    IF v_cuenta_id = ANY(v_cuentas_usadas) THEN
      RAISE EXCEPTION 'No podés repetir una cuenta en los pagos';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = v_cuenta_id AND c.activa) THEN
      RAISE EXCEPTION 'Una de las cuentas no existe o está inactiva';
    END IF;

    v_cuentas_usadas := pg_catalog.array_append(v_cuentas_usadas, v_cuenta_id);
    v_suma := v_suma + v_monto;
  END LOOP;

  IF v_suma <> p_precio THEN
    RAISE EXCEPTION 'La suma de los pagos ($ %) no coincide con el precio ($ %)', v_suma, p_precio;
  END IF;

  -- Vehículo en stock, con el código que sale del default de la tabla
  INSERT INTO public.vehiculos (
    marca, modelo, anio, color, patente, vendedor_texto,
    origen, valor_ingreso, fecha_ingreso, created_by
  )
  VALUES (
    pg_catalog.btrim(p_marca),
    pg_catalog.btrim(p_modelo),
    p_anio,
    pg_catalog.nullif(pg_catalog.btrim(p_color), ''),
    pg_catalog.nullif(pg_catalog.btrim(p_patente), ''),
    pg_catalog.nullif(pg_catalog.btrim(p_vendedor), ''),
    'compra',
    p_precio,
    v_fecha,
    v_user_id
  )
  RETURNING id, codigo INTO v_vehiculo_id, v_codigo;

  -- Un movimiento 'compra' negativo por cada pago, ligado al vehículo
  FOR v_pago IN SELECT value FROM jsonb_array_elements(p_pagos) LOOP
    INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, vehiculo_id)
    VALUES (
      v_fecha,
      (v_pago->>'cuenta_id')::UUID,
      -((v_pago->>'monto')::BIGINT),
      'compra',
      'Compra ' || v_codigo,
      v_user_id,
      v_vehiculo_id
    );
  END LOOP;

  -- Saldos nuevos de las cuentas usadas (suma de movimientos no anulados)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'cuenta_id', c.id,
      'nombre', c.nombre,
      'saldo', (SELECT COALESCE(SUM(m.monto), 0)::BIGINT FROM public.movimientos m WHERE m.cuenta_id = c.id AND m.anulado = false)
    )
  ), '[]'::jsonb)
  INTO v_saldos
  FROM public.cuentas c
  WHERE c.id = ANY(v_cuentas_usadas);

  RETURN jsonb_build_object(
    'id', v_vehiculo_id,
    'codigo', v_codigo,
    'fecha', v_fecha,
    'saldos', v_saldos
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_compra(TEXT, TEXT, INTEGER, BIGINT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_compra(TEXT, TEXT, INTEGER, BIGINT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
