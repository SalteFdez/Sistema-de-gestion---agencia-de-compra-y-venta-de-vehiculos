-- Migración E1-02: Cuentas y dinero disponible
-- Crea usuarios (ligados a auth.users), cuentas, movimientos, vistas v_saldo_cuentas y v_dinero_disponible,
-- políticas RLS y la función RPC atómica crear_cuenta.

-- 1. Tabla usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Cargar los 3 socios buscando por email interno en auth.users
-- Falla si no encuentra a los 3 socios previamente creados en Auth
DO $$
DECLARE
  v_agustin_id UUID;
  v_lautaro_id UUID;
  v_antonio_id UUID;
BEGIN
  SELECT id INTO v_agustin_id FROM auth.users WHERE email = 'agustin@machoman.local';
  SELECT id INTO v_lautaro_id FROM auth.users WHERE email = 'lautaro@machoman.local';
  SELECT id INTO v_antonio_id FROM auth.users WHERE email = 'antonio@machoman.local';

  IF v_agustin_id IS NULL OR v_lautaro_id IS NULL OR v_antonio_id IS NULL THEN
    RAISE EXCEPTION 'No se encontraron los 3 socios en auth.users (agustin@, lautaro@, antonio@machoman.local)';
  END IF;

  INSERT INTO public.usuarios (id, nombre)
  VALUES
    (v_agustin_id, 'Agustín Fernandez'),
    (v_lautaro_id, 'Lautaro'),
    (v_antonio_id, 'Antonio')
  ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
END $$;

-- 2. Tabla cuentas
CREATE TABLE IF NOT EXISTS public.cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('efectivo', 'banco', 'billetera')),
  activa BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Índice único insensible a mayúsculas sobre nombre de cuenta
CREATE UNIQUE INDEX IF NOT EXISTS cuentas_nombre_lower_idx ON public.cuentas (lower(nombre));

-- 3. Tabla movimientos
CREATE TABLE IF NOT EXISTS public.movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cuenta_id UUID NOT NULL REFERENCES public.cuentas(id) ON DELETE RESTRICT,
  monto BIGINT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'saldo_inicial', 'compra', 'venta_cobro', 'cuota_cobro',
    'gasto', 'ingreso_otro', 'transferencia_salida', 'transferencia_entrada',
    'aporte_socio', 'retiro_socio'
  )),
  descripcion TEXT,
  created_by UUID NOT NULL REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  anulado BOOLEAN NOT NULL DEFAULT false,
  anulado_por UUID REFERENCES public.usuarios(id),
  anulado_at TIMESTAMPTZ,
  motivo_anulacion TEXT,
  CONSTRAINT chk_saldo_inicial_no_negativo CHECK (tipo <> 'saldo_inicial' OR monto >= 0)
);

CREATE INDEX IF NOT EXISTS movimientos_cuenta_id_idx ON public.movimientos(cuenta_id);
CREATE INDEX IF NOT EXISTS movimientos_fecha_idx ON public.movimientos(fecha);

-- 4. Vistas: v_saldo_cuentas y v_dinero_disponible
-- Con security_invoker = true para que respeten RLS del usuario que consulta
CREATE OR REPLACE VIEW public.v_saldo_cuentas
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.nombre,
  c.tipo,
  c.activa,
  c.created_at,
  COALESCE(SUM(m.monto), 0)::BIGINT AS saldo
FROM public.cuentas c
LEFT JOIN public.movimientos m ON m.cuenta_id = c.id AND m.anulado = false
GROUP BY c.id, c.nombre, c.tipo, c.activa, c.created_at;

CREATE OR REPLACE VIEW public.v_dinero_disponible
WITH (security_invoker = true) AS
SELECT
  COALESCE(SUM(monto), 0)::BIGINT AS total
FROM public.movimientos
WHERE anulado = false;

-- 5. Row Level Security (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;

-- usuarios: autenticados leen; nadie anónimo
DROP POLICY IF EXISTS "Autenticados pueden leer usuarios" ON public.usuarios;
CREATE POLICY "Autenticados pueden leer usuarios" ON public.usuarios
  FOR SELECT TO authenticated USING (true);

-- cuentas: autenticados leen, insertan y actualizan; no se borra
DROP POLICY IF EXISTS "Autenticados pueden leer cuentas" ON public.cuentas;
CREATE POLICY "Autenticados pueden leer cuentas" ON public.cuentas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados pueden insertar cuentas" ON public.cuentas;
CREATE POLICY "Autenticados pueden insertar cuentas" ON public.cuentas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Autenticados pueden actualizar cuentas" ON public.cuentas;
CREATE POLICY "Autenticados pueden actualizar cuentas" ON public.cuentas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- movimientos: autenticados leen, insertan y actualizan; no se borra
DROP POLICY IF EXISTS "Autenticados pueden leer movimientos" ON public.movimientos;
CREATE POLICY "Autenticados pueden leer movimientos" ON public.movimientos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados pueden insertar movimientos" ON public.movimientos;
CREATE POLICY "Autenticados pueden insertar movimientos" ON public.movimientos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Autenticados pueden actualizar movimientos" ON public.movimientos;
CREATE POLICY "Autenticados pueden actualizar movimientos" ON public.movimientos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 6. Función RPC atómica para crear cuenta con su saldo inicial
CREATE OR REPLACE FUNCTION public.crear_cuenta(
  p_nombre TEXT,
  p_tipo TEXT,
  p_saldo_inicial BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
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

  v_nombre_limpio := trim(p_nombre);
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
  IF EXISTS (SELECT 1 FROM public.cuentas WHERE lower(nombre) = lower(v_nombre_limpio)) THEN
    RAISE EXCEPTION 'Ya hay una cuenta con ese nombre';
  END IF;

  -- Insertar cuenta
  INSERT INTO public.cuentas (nombre, tipo, created_by)
  VALUES (v_nombre_limpio, p_tipo, v_user_id)
  RETURNING id INTO v_cuenta_id;

  -- Si tiene saldo inicial > 0, crear movimiento saldo_inicial
  IF p_saldo_inicial > 0 THEN
    INSERT INTO public.movimientos (fecha, cuenta_id, monto, tipo, descripcion, created_by)
    VALUES (CURRENT_DATE, v_cuenta_id, p_saldo_inicial, 'saldo_inicial', 'Saldo inicial al crear cuenta', v_user_id);
  END IF;

  SELECT json_build_object(
    'id', c.id,
    'nombre', c.nombre,
    'tipo', c.tipo,
    'saldo', COALESCE(SUM(m.monto), 0)::BIGINT
  ) INTO v_resultado
  FROM public.cuentas c
  LEFT JOIN public.movimientos m ON m.cuenta_id = c.id AND m.anulado = false
  WHERE c.id = v_cuenta_id
  GROUP BY c.id, c.nombre, c.tipo;

  RETURN v_resultado;
END;
$$;
