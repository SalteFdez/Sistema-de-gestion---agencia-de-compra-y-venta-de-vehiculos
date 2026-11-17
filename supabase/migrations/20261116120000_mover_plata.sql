-- Migración E2-07: Mover plata (pases entre cuentas, aportes y retiros de socios)
-- 1. Columnas transferencia_id y socio_id en movimientos, con índices.
-- 2. CHECKs de coherencia (tipos que exigen columna) y de signos.
-- 3. RPC: transferir, registrar_aporte, registrar_retiro, anular_transferencia.
-- 4. anular_movimiento acepta aporte_socio y retiro_socio y rechaza los pases con su mensaje.

-- 1. Columnas e índices
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS transferencia_id UUID,
  ADD COLUMN IF NOT EXISTS socio_id UUID REFERENCES public.usuarios(id);

CREATE INDEX IF NOT EXISTS movimientos_transferencia_id_idx ON public.movimientos (transferencia_id);
CREATE INDEX IF NOT EXISTS movimientos_socio_id_idx ON public.movimientos (socio_id);

-- 2. Coherencia: la base no acepta datos que no cierran aunque se escriba por fuera de la app
ALTER TABLE public.movimientos
  ADD CONSTRAINT movimientos_transferencia_requiere_id
    CHECK (tipo NOT IN ('transferencia_salida', 'transferencia_entrada') OR transferencia_id IS NOT NULL),
  ADD CONSTRAINT movimientos_socio_requiere_id
    CHECK (tipo NOT IN ('aporte_socio', 'retiro_socio') OR socio_id IS NOT NULL),
  ADD CONSTRAINT movimientos_salida_negativa
    CHECK (tipo NOT IN ('transferencia_salida', 'retiro_socio') OR monto < 0),
  ADD CONSTRAINT movimientos_entrada_positiva
    CHECK (tipo NOT IN ('transferencia_entrada', 'aporte_socio') OR monto > 0);

-- 3. RPC nuevas
-- Pase entre cuentas: dos patas con el mismo transferencia_id, en una transacción
CREATE OR REPLACE FUNCTION public.transferir(
  p_origen_id UUID,
  p_destino_id UUID,
  p_monto BIGINT,
  p_descripcion TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_transferencia_id UUID;
  v_descripcion TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto tiene que ser mayor que 0';
  END IF;
  IF p_origen_id = p_destino_id THEN
    RAISE EXCEPTION 'Elegí dos cuentas distintas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = p_origen_id AND c.activa) THEN
    RAISE EXCEPTION 'La cuenta de origen no existe o está inactiva';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = p_destino_id AND c.activa) THEN
    RAISE EXCEPTION 'La cuenta de destino no existe o está inactiva';
  END IF;

  v_transferencia_id := pg_catalog.gen_random_uuid();
  v_descripcion := COALESCE(pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''), 'Pase entre cuentas');

  INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, transferencia_id)
  VALUES
    (v_fecha, p_origen_id, -p_monto, 'transferencia_salida', v_descripcion, v_user_id, v_transferencia_id),
    (v_fecha, p_destino_id, p_monto, 'transferencia_entrada', v_descripcion, v_user_id, v_transferencia_id);

  RETURN jsonb_build_object('transferencia_id', v_transferencia_id, 'fecha', v_fecha);
END;
$$;

-- Aporte de un socio: entra plata a la cuenta
CREATE OR REPLACE FUNCTION public.registrar_aporte(
  p_socio_id UUID,
  p_cuenta_id UUID,
  p_monto BIGINT,
  p_descripcion TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_movimiento_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto tiene que ser mayor que 0';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = p_socio_id) THEN
    RAISE EXCEPTION 'No se encontró el socio';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = p_cuenta_id AND c.activa) THEN
    RAISE EXCEPTION 'La cuenta no existe o está inactiva';
  END IF;

  INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, socio_id)
  VALUES (
    v_fecha, p_cuenta_id, p_monto, 'aporte_socio',
    COALESCE(pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''), 'Aporte de socio'),
    v_user_id, p_socio_id
  )
  RETURNING id INTO v_movimiento_id;

  RETURN jsonb_build_object('movimiento_id', v_movimiento_id, 'fecha', v_fecha);
END;
$$;

-- Retiro de un socio: sale plata de la cuenta
CREATE OR REPLACE FUNCTION public.registrar_retiro(
  p_socio_id UUID,
  p_cuenta_id UUID,
  p_monto BIGINT,
  p_descripcion TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_fecha DATE;
  v_movimiento_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_fecha := (pg_catalog.now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto tiene que ser mayor que 0';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = p_socio_id) THEN
    RAISE EXCEPTION 'No se encontró el socio';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cuentas c WHERE c.id = p_cuenta_id AND c.activa) THEN
    RAISE EXCEPTION 'La cuenta no existe o está inactiva';
  END IF;

  INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by, socio_id)
  VALUES (
    v_fecha, p_cuenta_id, -p_monto, 'retiro_socio',
    COALESCE(pg_catalog.nullif(pg_catalog.btrim(p_descripcion), ''), 'Retiro de socio'),
    v_user_id, p_socio_id
  )
  RETURNING id INTO v_movimiento_id;

  RETURN jsonb_build_object('movimiento_id', v_movimiento_id, 'fecha', v_fecha);
END;
$$;

-- Anular un pase: desde cualquiera de las dos patas, se anulan las dos juntas
CREATE OR REPLACE FUNCTION public.anular_transferencia(
  p_movimiento_id UUID,
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
  v_transferencia_id UUID;
  v_anulado BOOLEAN;
  v_patas INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);
  IF v_motivo IS NULL OR pg_catalog.length(v_motivo) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  SELECT m.transferencia_id, m.anulado INTO v_transferencia_id, v_anulado
  FROM public.movimientos m
  WHERE m.id = p_movimiento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el movimiento';
  END IF;
  IF v_transferencia_id IS NULL THEN
    RAISE EXCEPTION 'Este movimiento no es un pase';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'Este pase ya está anulado';
  END IF;

  -- Bloquea las dos patas (en orden de id, para que dos anulaciones no se crucen)
  PERFORM 1 FROM public.movimientos m
  WHERE m.transferencia_id = v_transferencia_id
  ORDER BY m.id
  FOR UPDATE;

  UPDATE public.movimientos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE transferencia_id = v_transferencia_id AND anulado = false;
  GET DIAGNOSTICS v_patas = ROW_COUNT;

  RETURN jsonb_build_object('transferencia_id', v_transferencia_id, 'patas_anuladas', v_patas);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transferir(UUID, UUID, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transferir(UUID, UUID, BIGINT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_aporte(UUID, UUID, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_aporte(UUID, UUID, BIGINT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_retiro(UUID, UUID, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_retiro(UUID, UUID, BIGINT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.anular_transferencia(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_transferencia(UUID, TEXT) TO authenticated;

-- 4. anular_movimiento: además de saldo inicial e ingreso, acepta aporte y retiro de socio.
-- Los pases no se anulan acá: van por anular_transferencia (se anula el pase completo).
CREATE OR REPLACE FUNCTION public.anular_movimiento(p_movimiento_id uuid, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_user_id UUID;
  v_tipo TEXT;
  v_anulado BOOLEAN;
  v_motivo TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_motivo := pg_catalog.btrim(p_motivo);
  IF v_motivo IS NULL OR pg_catalog.length(v_motivo) = 0 THEN
    RAISE EXCEPTION 'El motivo es obligatorio';
  END IF;

  -- Bloquea el movimiento para que dos anulaciones simultáneas no pasen ambas
  SELECT m.tipo, m.anulado INTO v_tipo, v_anulado
  FROM public.movimientos m
  WHERE m.id = p_movimiento_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el movimiento';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION 'Este movimiento ya está anulado';
  END IF;

  IF v_tipo IN ('compra', 'venta_cobro') THEN
    RAISE EXCEPTION 'Este movimiento es parte de una compra o venta: se anula la operación completa';
  END IF;
  IF v_tipo = 'gasto' THEN
    RAISE EXCEPTION 'Este movimiento es un gasto: se anula el gasto completo';
  END IF;
  IF v_tipo IN ('transferencia_salida', 'transferencia_entrada') THEN
    RAISE EXCEPTION 'Este movimiento es parte de un pase: se anula el pase completo';
  END IF;
  IF v_tipo NOT IN ('saldo_inicial', 'ingreso_otro', 'aporte_socio', 'retiro_socio') THEN
    RAISE EXCEPTION 'Este tipo de movimiento no se puede anular todavía';
  END IF;

  UPDATE public.movimientos
  SET anulado = true,
      anulado_por = v_user_id,
      anulado_at = pg_catalog.now(),
      motivo_anulacion = v_motivo
  WHERE id = p_movimiento_id;

  RETURN jsonb_build_object('movimiento_id', p_movimiento_id, 'anulado', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.anular_movimiento(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anular_movimiento(UUID, TEXT) TO authenticated;
