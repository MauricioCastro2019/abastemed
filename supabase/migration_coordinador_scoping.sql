-- ============================================================
-- MIGRACIÓN: Scoping de datos por coordinador
-- Ejecutar en Supabase SQL editor después de migration_fase1_fix_rls.sql
-- ============================================================

-- 1. Columna coordinador_id en casos
ALTER TABLE casos
  ADD COLUMN IF NOT EXISTS coordinador_id UUID REFERENCES perfiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_casos_coordinador ON casos(coordinador_id);

-- 2. Funciones SECURITY DEFINER para el scoping del coordinador
--    (SECURITY DEFINER necesario para evitar recursión RLS al consultar casos desde
--     otras políticas que también tienen RLS activo)

CREATE OR REPLACE FUNCTION coordinador_tiene_caso(uid uuid, caso_id_param uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM casos
    WHERE id = caso_id_param AND coordinador_id = uid
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION coordinador_tiene_paciente(uid uuid, paciente_id_param uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM casos
    WHERE paciente_id = paciente_id_param AND coordinador_id = uid
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 3. Actualizar casos_select:
--    Coordinador solo ve sus casos asignados (coordinador_id = auth.uid())
DROP POLICY IF EXISTS "casos_select" ON casos;
CREATE POLICY "casos_select" ON casos
  FOR SELECT USING (
    auth_rol() = 'admin'
    OR (auth_rol() = 'coordinador' AND coordinador_id = auth.uid())
    OR (auth_rol() = 'enfermero' AND enfermero_tiene_turno_en_caso(auth.uid(), casos.id))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = casos.paciente_id
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM familiar_paciente fp
      WHERE fp.familiar_id = auth.uid() AND fp.paciente_id = casos.paciente_id
    ))
  );

-- 4. Actualizar turnos_select:
--    Coordinador solo ve turnos de sus casos asignados
DROP POLICY IF EXISTS "turnos_select" ON turnos;
CREATE POLICY "turnos_select" ON turnos
  FOR SELECT USING (
    auth_rol() = 'admin'
    OR (auth_rol() = 'coordinador' AND coordinador_tiene_caso(auth.uid(), turnos.caso_id))
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
    ))
    OR (auth_rol() = 'familiar' AND familiar_puede_ver_turno(auth.uid(), turnos.caso_id))
  );

-- NOTA: pacientes_select se deja sin scoping por coordinador intencionalmente.
-- El coordinador necesita ver todos los pacientes para crear nuevos casos.
-- Si en el futuro se requiere scoping de pacientes, usar coordinador_tiene_paciente().

-- ============================================================
-- FIN MIGRACIÓN: Coordinador scoping
-- ============================================================
