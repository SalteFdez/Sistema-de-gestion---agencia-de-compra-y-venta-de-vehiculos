-- Migración E2-02: Venta con permuta
-- 1. Tabla venta_permutas: cada auto recibido en parte de pago, con su valor pactado.
-- 2. Cascada de gastos en una función interna (anular_cascada_gastos), usada por anular_vehiculo y anular_venta.
--    Solo corre sobre un vehículo marcado como anulado en esta misma transacción.
-- 3. registrar_venta con permutas (DROP + CREATE: cambia la firma).
-- 4. anular_vehiculo rechaza autos de permuta; anular_venta anula también los autos recibidos y sus gastos.

-- 1. Permutas
CREATE TABLE IF NOT EXISTS public.venta_permutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES public.ventas(id),
  vehiculo_recibido_id UUID NOT NULL UNIQUE REFERENCES public.vehiculos(id),
  valor_pactado BIGINT NOT NULL CHECK (valor_pactado > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS venta_permutas_venta_id_idx ON public.venta_permutas (venta_id);

ALTER TABLE public.venta_permutas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden leer venta_permutas" ON public.venta_permutas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden insertar venta_permutas" ON public.venta_permutas
  FOR INSERT TO authenticated WITH CHECK (true);

REVOKE ALL ON public.venta_permutas FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.venta_permutas TO authenticated;

-- 2. Cascada de gastos de un vehículo ya marcado como anulado en esta transacción
CREATE OR REPLACE FUNCTION public.anular_cascada_gastos(
  p_vehiculo_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_motivo TEXT;
  v_marcado BOOLEAN;
  v_gasto RECORD;
  v_suma BIGINT;
  v_ajenas BOOLEAN;
  v_liberado BIGINT;
  v_gastos_anulados INTEGER := 0;
  v_total_gastos BIGINT := 0;
  v_partes_liberadas INTEGER := 0;
  v_monto_liberado BIGINT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);

  -- Solo se usa al anular: el vehículo tiene que estar marcado en esta misma transacción
  SELECT (v.anulado AND v.anulado_at = pg_catalog.now() AND v.anulado_por = v_user_id)
  INTO v_marcado
  FROM public.vehiculos v
  WHERE v.id = p_vehiculo_id;

  IF NOT COALESCE(v_marcado, false) THEN
    RAISE EXCEPTION 'La cascada de gastos solo se usa al anular un vehículo';
  END IF;

  FOR v_gasto IN
    SELECT g.id, g.monto_total
    FROM public.gastos g
    JOIN public.asignaciones_gasto a ON a.gasto_id = g.id
    WHERE a.vehiculo_id = p_vehiculo_id AND a.anulada = false AND g.anulado = false
    FOR UPDATE OF g
  LOOP
    SELECT COALESCE(SUM(x.monto), 0) INTO v_suma
    FROM public.asignaciones_gasto x
    WHERE x.gasto_id = v_gasto.id AND x.anulada = false;

    SELECT EXISTS (
      SELECT 1 FROM public.asignaciones_gasto x
      WHERE x.gasto_id = v_gasto.id AND x.anulada = false AND x.vehiculo_id <> p_vehiculo_id
    ) INTO v_ajenas;

    IF NOT v_ajenas AND v_suma = v_gasto.monto_total THEN
      -- Gasto solo de este auto: se anula entero, con su movimiento
      UPDATE public.gastos
      SET anulado = true,
          anulado_por = v_user_id,
          anulado_at = pg_catalog.now(),
          motivo_anulacion = v_motivo
      WHERE id = v_gasto.id;

      UPDATE public.movimientos
      SET anulado = true,
          anulado_por = v_user_id,
          anulado_at = pg_catalog.now(),
          motivo_anulacion = v_motivo
      WHERE gasto_id = v_gasto.id AND anulado = false;

      v_gastos_anulados := v_gastos_anulados + 1;
      v_total_gastos := v_total_gastos + v_gasto.monto_total;
    ELSE
      -- Gasto compartido: se libera solo la parte de este auto; el gasto sigue para los otros
      SELECT COALESCE(SUM(x.monto), 0) INTO v_liberado
      FROM public.asignaciones_gasto x
      WHERE x.gasto_id = v_gasto.id AND x.vehiculo_id = p_vehiculo_id AND x.anulada = false;

      UPDATE public.asignaciones_gasto
      SET anulada = true,
          anulada_por = v_user_id,
          anulada_at = pg_catalog.now(),
          motivo_anulacion = v_motivo
      WHERE gasto_id = v_gasto.id AND vehiculo_id = p_vehiculo_id AND anulada = false;

      v_partes_liberadas := v_partes_liberadas + 1;
      v_monto_liberado := v_monto_liberado + v_liberado;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'gastos_anulados', v_gastos_anulados,
    'total_gastos', v_total_gastos,
    'partes_liberadas', v_partes_liberadas,
    'monto_liberado', v_monto_liberado
  );
END;
$$;

REVOKE ALL ON FUNCTION public.anular_cascada_gastos(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_cascada_gastos(UUID, TEXT) TO authenticated;

-- 3. registrar_venta con permutas (cambia la firma: DROP + CREATE, y de nuevo REVOKE/GRANT)
DROP FUNCTION IF EXISTS public.registrar_venta(UUID, BIGINT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.registrar_venta(
  p_vehiculo_id UUID,
  p_precio BIGINT,
  p_comprador TEXT DEFAULT NULL,
  p_cobros JSONB DEFAULT '[]'::jsonb,
  p_permutas JSONB DEFAULT '[]'::jsonb
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
  IF v_suma_cobros + v_suma_permutas <> p_precio THEN
    RAISE EXCEPTION 'Precio, cobros y permutas no cierran. Faltan $ %', p_precio - (v_suma_cobros + v_suma_permutas);
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
  INSERT INTO public.ventas (vehiculo_id, comprador_texto, fecha, precio_total, created_by)
  VALUES (
    p_vehiculo_id,
    pg_catalog.nullif(pg_catalog.btrim(p_comprador), ''),
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

REVOKE EXECUTE ON FUNCTION public.registrar_venta(UUID, BIGINT, TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta(UUID, BIGINT, TEXT, JSONB, JSONB) TO authenticated;

-- 4a. anular_vehiculo: marca el auto antes de la cascada, y rechaza los autos de permuta
CREATE OR REPLACE FUNCTION public.anular_vehiculo(
  p_vehiculo_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_motivo TEXT;
  v_codigo TEXT;
  v_anulado BOOLEAN;
  v_estado TEXT;
  v_origen TEXT;
  v_venta_codigo TEXT;
  v_cascada JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);
  IF v_motivo IS NULL OR pg_catalog.length(v_motivo) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  -- Bloquea el vehículo para que dos anulaciones o una venta simultánea no se crucen
  SELECT v.codigo, v.anulado, v.estado, v.origen INTO v_codigo, v_anulado, v_estado, v_origen
  FROM public.vehiculos v
  WHERE v.id = p_vehiculo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el vehículo';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION '% ya está anulado', v_codigo;
  END IF;

  -- Un auto de permuta se anula anulando la venta en la que entró
  IF v_origen = 'permuta' THEN
    SELECT vc.codigo INTO v_venta_codigo
    FROM public.venta_permutas vp
    JOIN public.ventas vt ON vt.id = vp.venta_id
    JOIN public.vehiculos vc ON vc.id = vt.vehiculo_id
    WHERE vp.vehiculo_recibido_id = p_vehiculo_id;
    RAISE EXCEPTION '% entró por permuta: se anula anulando la venta de %', v_codigo, COALESCE(v_venta_codigo, '?');
  END IF;

  IF v_estado = 'vendido' OR EXISTS (
    SELECT 1 FROM public.ventas vt WHERE vt.vehiculo_id = p_vehiculo_id AND vt.anulada = false
  ) THEN
    RAISE EXCEPTION 'Primero anulá la venta de %', v_codigo;
  END IF;

  -- El vehículo queda anulado (su código no se reutiliza) antes de la cascada de gastos
  UPDATE public.vehiculos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE id = p_vehiculo_id;

  v_cascada := public.anular_cascada_gastos(p_vehiculo_id, v_motivo);

  -- Pagos de la compra (las altas de stock existente no tienen pagos)
  UPDATE public.movimientos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE vehiculo_id = p_vehiculo_id AND tipo = 'compra' AND anulado = false;

  RETURN jsonb_build_object(
    'vehiculo_id', p_vehiculo_id,
    'codigo', v_codigo,
    'gastos_anulados', (v_cascada->>'gastos_anulados')::INTEGER,
    'total_gastos', (v_cascada->>'total_gastos')::BIGINT,
    'partes_liberadas', (v_cascada->>'partes_liberadas')::INTEGER,
    'monto_liberado', (v_cascada->>'monto_liberado')::BIGINT
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_vehiculo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_vehiculo(UUID, TEXT) TO authenticated;

-- 4b. anular_venta: anula la venta, sus cobros y todos los autos recibidos con sus gastos
CREATE OR REPLACE FUNCTION public.anular_venta(
  p_venta_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_motivo TEXT;
  v_vehiculo_id UUID;
  v_anulada BOOLEAN;
  v_codigo TEXT;
  v_recibido RECORD;
  v_recibidos JSONB := '[]'::jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);
  IF v_motivo IS NULL OR pg_catalog.length(v_motivo) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  SELECT vt.vehiculo_id, vt.anulada INTO v_vehiculo_id, v_anulada
  FROM public.ventas vt
  WHERE vt.id = p_venta_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la venta';
  END IF;
  IF v_anulada THEN
    RAISE EXCEPTION 'Esta venta ya está anulada';
  END IF;

  -- Bloquea todos los autos recibidos y rechaza si alguno ya se vendió
  FOR v_recibido IN
    SELECT v.id, v.codigo, v.estado, v.anulado
    FROM public.venta_permutas vp
    JOIN public.vehiculos v ON v.id = vp.vehiculo_recibido_id
    WHERE vp.venta_id = p_venta_id
    ORDER BY v.id
    FOR UPDATE OF v
  LOOP
    IF v_recibido.anulado THEN
      RAISE EXCEPTION '% ya está anulado', v_recibido.codigo;
    END IF;
    IF v_recibido.estado = 'vendido' OR EXISTS (
      SELECT 1 FROM public.ventas vt WHERE vt.vehiculo_id = v_recibido.id AND vt.anulada = false
    ) THEN
      RAISE EXCEPTION 'Primero anulá la venta de %', v_recibido.codigo;
    END IF;
  END LOOP;

  UPDATE public.ventas
  SET anulada = true,
      anulada_por = v_user_id,
      anulada_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE id = p_venta_id;

  UPDATE public.movimientos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE venta_id = p_venta_id AND anulado = false;

  -- Los autos recibidos desaparecen del stock, con su cascada de gastos
  FOR v_recibido IN
    SELECT v.id, v.codigo
    FROM public.venta_permutas vp
    JOIN public.vehiculos v ON v.id = vp.vehiculo_recibido_id
    WHERE vp.venta_id = p_venta_id
    ORDER BY v.id
  LOOP
    UPDATE public.vehiculos
    SET anulado = true,
        anulado_por = v_user_id,
        anulado_at = pg_catalog.now(),
        motivo_anulacion = v_motivo
    WHERE id = v_recibido.id;

    PERFORM public.anular_cascada_gastos(v_recibido.id, v_motivo);

    v_recibidos := v_recibidos || jsonb_build_array(v_recibido.codigo);
  END LOOP;

  -- El vehículo vendido vuelve a en_stock y puede volver a venderse
  UPDATE public.vehiculos
  SET estado = 'en_stock'
  WHERE id = v_vehiculo_id AND estado = 'vendido'
  RETURNING codigo INTO v_codigo;

  RETURN jsonb_build_object(
    'venta_id', p_venta_id,
    'vehiculo_id', v_vehiculo_id,
    'codigo', v_codigo,
    'recibidos_anulados', v_recibidos
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_venta(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_venta(UUID, TEXT) TO authenticated;
