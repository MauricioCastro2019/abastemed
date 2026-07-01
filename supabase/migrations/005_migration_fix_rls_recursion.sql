-- ============================================================
-- FIX: Infinite recursion en RLS de casos ↔ turnos
-- El ciclo: casos_select consulta turnos → turnos_select consulta casos
-- Solución: funciones SECURITY DEFINER que bypasean RLS en las subconsultas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Helper functions con SECURITY DEFINER (bypasean RLS)
-- ============================================================

-- Verifica si un enfermero tiene algún turno en un caso
CREATE OR REPLACE FUNCTION enfermero_tiene_turno_en_caso(uid uuid, caso_id_param uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM turnos t
    JOIN perfiles p ON p.enfermero_id = t.enfermero_id
    WHERE t.caso_id = caso_id_param AND p.id = uid
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Verifica si un familiar puede ver un turno (via caso → paciente)
CREATE OR REPLACE FUNCTION familiar_puede_ver_turno(uid uuid, caso_id_param uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM casos c
    JOIN perfiles p ON p.paciente_id = c.paciente_id
    WHERE c.id = caso_id_param AND p.id = uid
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- 2. Reescribir casos_select sin referencia directa a turnos
-- ============================================================

DROP POLICY IF EXISTS "casos_select" ON casos;
CREATE POLICY "casos_select" ON casos
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR (
      auth_rol() = 'enfermero'
      AND enfermero_tiene_turno_en_caso(auth.uid(), casos.id)
    )
    OR (
      auth_rol() = 'familiar'
      AND EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND paciente_id = casos.paciente_id
      )
    )
  );

-- ============================================================
-- 3. Reescribir turnos_select sin referencia directa a casos
-- ============================================================

DROP POLICY IF EXISTS "turnos_select" ON turnos;
CREATE POLICY "turnos_select" ON turnos
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR (
      auth_rol() = 'enfermero'
      AND EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
      )
    )
    OR (
      auth_rol() = 'familiar'
      AND familiar_puede_ver_turno(auth.uid(), turnos.caso_id)
    )
  );

-- ============================================================
-- 4. Fix enfermeros_select: agregar jefe_enfermeros
--    (la política original solo tenía 'admin' y 'enfermero')
-- ============================================================

DROP POLICY IF EXISTS "enfermeros_select" ON enfermeros;
CREATE POLICY "enfermeros_select" ON enfermeros
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = enfermeros.id
    )
  );

-- ============================================================
-- Verificar: estas queries NO deben dar error después del fix
-- SELECT count(*) FROM casos;
-- SELECT count(*) FROM enfermeros;
-- ============================================================
