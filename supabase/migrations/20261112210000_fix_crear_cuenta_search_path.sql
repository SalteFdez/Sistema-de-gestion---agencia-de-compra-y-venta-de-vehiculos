-- Migración de seguridad: fijar search_path en crear_cuenta
-- Corrige Supabase lint: 0011_function_search_path_mutable

CREATE OR REPLACE FUNCTION public.crear_cuenta(
  p_nombre TEXT,
  p_tipo TEXT,
  p_saldo_inicial BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cuenta_id UUID;
  v_nombre_limpio TEXT;
  v_resultado JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  v_nombre_limpio := pg_catalog.trim(p_nombre);
  IF v_nombre_limpio IS NULL OR v_nombre_limpio = '' THEN
    RAISE EXCEPTION 'El nombre de la cuenta no puede estar vacío';
  END IF;

  IF p_tipo NOT IN ('efectivo', 'banco', 'billetera') THEN
    RAISE EXCEPTION 'Tipo de cuenta inválido: %', p_tipo;
  END IF;

  IF p_saldo_inicial < 0 THEN
    RAISE EXCEPTION 'El saldo inicial no puede ser negativo';
  END IF;

  -- Comprobar duplicado insensible a mayúsculas
  IF EXISTS (SELECT 1 FROM public.cuentas WHERE pg_catalog.lower(nombre) = pg_catalog.lower(v_nombre_limpio)) THEN
    RAISE EXCEPTION 'Ya hay una cuenta con ese nombre';
  END IF;

  -- Insertar cuenta
  INSERT INTO public.cuentas (nombre, tipo, created_by)
  VALUES (v_nombre_limpio, p_tipo, v_user_id)
  RETURNING id INTO v_cuenta_id;

  -- Si tiene saldo inicial > 0, crear movimiento saldo_inicial
  -- Se usa zona horaria de Argentina para evitar desfasaje UTC después de las 21:00 hs
  IF p_saldo_inicial > 0 THEN
    INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by)
    VALUES (
      (pg_catalog.timezone('America/Argentina/Buenos_Aires', pg_catalog.now()))::date,
      v_cuenta_id,
      p_saldo_inicial,
      'saldo_inicial',
      'Saldo inicial al crear cuenta',
      v_user_id
    );
  END IF;

  SELECT json_build_object(
    'id', c.id,
    'nombre', c.nombre,
    'tipo', c.tipo,
    'saldo', pg_catalog.coalesce(pg_catalog.sum(m.monto), 0)::BIGINT
  ) INTO v_resultado
  FROM public.cuentas c
  LEFT JOIN public.movimientos m ON m.cuenta_id = c.id AND m.anulado = false
  WHERE c.id = v_cuenta_id
  GROUP BY c.id, c.nombre, c.tipo;

  RETURN v_resultado;
END;
$$;
