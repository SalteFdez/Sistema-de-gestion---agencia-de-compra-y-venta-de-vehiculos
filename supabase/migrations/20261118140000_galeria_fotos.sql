-- Migración E3-02: Galería de fotos
-- 1. Tabla vehiculo_fotos (rutas dentro del bucket), sin borrar: quitar una foto es una baja lógica.
-- 2. Carga inicial: una fila por cada vehiculos.foto_url existente (la foto actual pasa a ser la primera).
-- 3. RPC agregar_foto_vehiculo, usar_como_principal y quitar_foto. vehiculos.foto_url sigue siendo la principal.
-- El archivo en Storage no se borra nunca.

-- 1. Tabla de fotos
CREATE TABLE IF NOT EXISTS public.vehiculo_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id),
  ruta TEXT NOT NULL UNIQUE,
  orden INTEGER NOT NULL CHECK (orden >= 1),
  quitada BOOLEAN NOT NULL DEFAULT false,
  quitada_por UUID REFERENCES public.usuarios(id),
  quitada_at TIMESTAMPTZ,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS vehiculo_fotos_vehiculo_id_idx ON public.vehiculo_fotos (vehiculo_id);
CREATE INDEX IF NOT EXISTS vehiculo_fotos_quitada_por_idx ON public.vehiculo_fotos (quitada_por);
CREATE INDEX IF NOT EXISTS vehiculo_fotos_created_by_idx ON public.vehiculo_fotos (created_by);

ALTER TABLE public.vehiculo_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden leer vehiculo_fotos" ON public.vehiculo_fotos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden insertar vehiculo_fotos" ON public.vehiculo_fotos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados pueden actualizar vehiculo_fotos" ON public.vehiculo_fotos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.vehiculo_fotos FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vehiculo_fotos TO authenticated;

-- 2. Carga inicial: las fotos actuales pasan a ser la primera de su galería
INSERT INTO public.vehiculo_fotos (vehiculo_id, ruta, orden, created_by)
SELECT v.id, v.foto_url, 1, v.created_by
FROM public.vehiculos v
WHERE v.foto_url IS NOT NULL
ON CONFLICT (ruta) DO NOTHING;

-- 3. Agregar una foto a la galería: límite de 10 vigentes; si el auto no tenía principal, esta pasa a serlo
CREATE OR REPLACE FUNCTION public.agregar_foto_vehiculo(
  p_vehiculo_id UUID,
  p_ruta TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_codigo TEXT;
  v_anulado BOOLEAN;
  v_foto_url TEXT;
  v_vigentes INTEGER;
  v_orden INTEGER;
  v_foto_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Bloquea el vehículo: dos fotos simultáneas no pueden pasar ambas el límite
  SELECT v.codigo, v.anulado, v.foto_url INTO v_codigo, v_anulado, v_foto_url
  FROM public.vehiculos v
  WHERE v.id = p_vehiculo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el vehículo';
  END IF;
  IF v_anulado THEN
    RAISE EXCEPTION '% está anulado: no se le agregan fotos', v_codigo;
  END IF;

  SELECT COUNT(*), COALESCE(MAX(f.orden), 0) INTO v_vigentes, v_orden
  FROM public.vehiculo_fotos f
  WHERE f.vehiculo_id = p_vehiculo_id AND f.quitada = false;

  IF v_vigentes >= 10 THEN
    RAISE EXCEPTION '% ya tiene 10 fotos', v_codigo;
  END IF;

  INSERT INTO public.vehiculo_fotos (vehiculo_id, ruta, orden, created_by)
  VALUES (p_vehiculo_id, p_ruta, v_orden + 1, v_user_id)
  RETURNING id INTO v_foto_id;

  IF v_foto_url IS NULL THEN
    UPDATE public.vehiculos SET foto_url = p_ruta WHERE id = p_vehiculo_id;
  END IF;

  RETURN jsonb_build_object('foto_id', v_foto_id, 'es_principal', v_foto_url IS NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.agregar_foto_vehiculo(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agregar_foto_vehiculo(UUID, TEXT) TO authenticated;

-- 4. Usar una foto como principal: la del listado y la tarjeta pasan a ser esa
CREATE OR REPLACE FUNCTION public.usar_como_principal(
  p_foto_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_vehiculo_id UUID;
  v_ruta TEXT;
  v_quitada BOOLEAN;
  v_anulado BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT f.vehiculo_id, f.ruta, f.quitada INTO v_vehiculo_id, v_ruta, v_quitada
  FROM public.vehiculo_fotos f
  WHERE f.id = p_foto_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la foto';
  END IF;
  IF v_quitada THEN
    RAISE EXCEPTION 'Esa foto ya fue quitada';
  END IF;

  SELECT v.anulado INTO v_anulado
  FROM public.vehiculos v
  WHERE v.id = v_vehiculo_id
  FOR UPDATE;

  IF v_anulado THEN
    RAISE EXCEPTION 'El vehículo está anulado';
  END IF;

  UPDATE public.vehiculos SET foto_url = v_ruta WHERE id = v_vehiculo_id;

  RETURN jsonb_build_object('vehiculo_id', v_vehiculo_id, 'foto_url', v_ruta);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.usar_como_principal(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usar_como_principal(UUID) TO authenticated;

-- 5. Quitar una foto: baja lógica. Si era la principal, pasa a serlo la siguiente vigente, o el auto queda sin foto.
CREATE OR REPLACE FUNCTION public.quitar_foto(
  p_foto_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_vehiculo_id UUID;
  v_ruta TEXT;
  v_quitada BOOLEAN;
  v_foto_url TEXT;
  v_siguiente TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT f.vehiculo_id, f.ruta, f.quitada INTO v_vehiculo_id, v_ruta, v_quitada
  FROM public.vehiculo_fotos f
  WHERE f.id = p_foto_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la foto';
  END IF;
  IF v_quitada THEN
    RAISE EXCEPTION 'Esa foto ya fue quitada';
  END IF;

  SELECT v.foto_url INTO v_foto_url
  FROM public.vehiculos v
  WHERE v.id = v_vehiculo_id
  FOR UPDATE;

  UPDATE public.vehiculo_fotos
  SET quitada = true,
      quitada_por = v_user_id,
      quitada_at = pg_catalog.now()
  WHERE id = p_foto_id;

  -- Si era la principal, pasa a serlo la siguiente vigente (o queda sin foto). El archivo no se borra.
  IF v_foto_url = v_ruta THEN
    SELECT f.ruta INTO v_siguiente
    FROM public.vehiculo_fotos f
    WHERE f.vehiculo_id = v_vehiculo_id AND f.quitada = false
    ORDER BY f.orden
    LIMIT 1;

    UPDATE public.vehiculos SET foto_url = v_siguiente WHERE id = v_vehiculo_id;
  END IF;

  RETURN jsonb_build_object('vehiculo_id', v_vehiculo_id, 'foto_url', COALESCE(v_siguiente, v_foto_url));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.quitar_foto(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quitar_foto(UUID) TO authenticated;
