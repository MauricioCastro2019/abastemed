-- ============================================================
-- MIGRACIÓN: soporte completo para rol jefe_enfermeros
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Añadir el valor al enum (IF NOT EXISTS requiere Postgres 12+)
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'jefe_enfermeros';

-- IMPORTANTE: después de ADD VALUE hay que hacer COMMIT implícito.
-- Las policies que siguen lo usan en el mismo script. En el SQL
-- Editor de Supabase esto funciona correctamente.

-- ============================================================
-- 2. Actualizar la función helper auth_rol()
-- ============================================================

CREATE OR REPLACE FUNCTION auth_rol()
RETURNS TEXT AS $$
  SELECT rol::TEXT FROM perfiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- 3. Políticas: pacientes (jefe puede leer pero no modificar)
-- ============================================================

DROP POLICY IF EXISTS "pacientes_select" ON pacientes;
CREATE POLICY "pacientes_select" ON pacientes
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = pacientes.id
    )
  );

-- Solo admin puede insertar/actualizar/eliminar pacientes
DROP POLICY IF EXISTS "pacientes_insert" ON pacientes;
CREATE POLICY "pacientes_insert" ON pacientes
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "pacientes_update" ON pacientes;
CREATE POLICY "pacientes_update" ON pacientes
  FOR UPDATE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "pacientes_delete" ON pacientes;
CREATE POLICY "pacientes_delete" ON pacientes
  FOR DELETE USING (auth_rol() = 'admin');

-- ============================================================
-- 4. Políticas: enfermeros
-- ============================================================

DROP POLICY IF EXISTS "enfermeros_insert" ON enfermeros;
CREATE POLICY "enfermeros_insert" ON enfermeros
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "enfermeros_update" ON enfermeros;
CREATE POLICY "enfermeros_update" ON enfermeros
  FOR UPDATE USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = enfermeros.id
    )
  );

DROP POLICY IF EXISTS "enfermeros_delete" ON enfermeros;
CREATE POLICY "enfermeros_delete" ON enfermeros
  FOR DELETE USING (auth_rol() = 'admin');

-- ============================================================
-- 5. Políticas: casos
-- ============================================================

DROP POLICY IF EXISTS "casos_select" ON casos;
CREATE POLICY "casos_select" ON casos
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM turnos t
      JOIN perfiles p ON p.enfermero_id = t.enfermero_id
      WHERE t.caso_id = casos.id AND p.id = auth.uid()
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = casos.paciente_id
    ))
  );

DROP POLICY IF EXISTS "casos_insert" ON casos;
CREATE POLICY "casos_insert" ON casos
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "casos_update" ON casos;
CREATE POLICY "casos_update" ON casos
  FOR UPDATE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "casos_delete" ON casos;
CREATE POLICY "casos_delete" ON casos
  FOR DELETE USING (auth_rol() = 'admin');

-- ============================================================
-- 6. Políticas: turnos
-- ============================================================

DROP POLICY IF EXISTS "turnos_select" ON turnos;
CREATE POLICY "turnos_select" ON turnos
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
    ))
    OR (auth_rol() = 'familiar' AND EXISTS (
      SELECT 1 FROM casos c
      JOIN perfiles p ON p.paciente_id = c.paciente_id
      WHERE c.id = turnos.caso_id AND p.id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "turnos_insert" ON turnos;
CREATE POLICY "turnos_insert" ON turnos
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "turnos_update" ON turnos;
CREATE POLICY "turnos_update" ON turnos
  FOR UPDATE USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR (auth_rol() = 'enfermero' AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND enfermero_id = turnos.enfermero_id
    ))
  );

DROP POLICY IF EXISTS "turnos_delete" ON turnos;
CREATE POLICY "turnos_delete" ON turnos
  FOR DELETE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

-- ============================================================
-- 7. Políticas: cobranza_items
-- ============================================================

DROP POLICY IF EXISTS "cobranza_select" ON cobranza_items;
CREATE POLICY "cobranza_select" ON cobranza_items
  FOR SELECT USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "cobranza_insert" ON cobranza_items;
CREATE POLICY "cobranza_insert" ON cobranza_items
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "cobranza_update" ON cobranza_items;
CREATE POLICY "cobranza_update" ON cobranza_items
  FOR UPDATE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

-- ============================================================
-- 8. Políticas: perfiles (jefe puede ver todos)
-- ============================================================

DROP POLICY IF EXISTS "perfiles_select" ON perfiles;
CREATE POLICY "perfiles_select" ON perfiles
  FOR SELECT USING (
    id = auth.uid()
    OR auth_rol() IN ('admin', 'jefe_enfermeros')
  );

DROP POLICY IF EXISTS "perfiles_update" ON perfiles;
CREATE POLICY "perfiles_update" ON perfiles
  FOR UPDATE USING (
    id = auth.uid()
    OR auth_rol() IN ('admin', 'jefe_enfermeros')
  );
