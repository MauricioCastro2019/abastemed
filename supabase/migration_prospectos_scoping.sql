-- ============================================================
-- MIGRACIÓN: Scoping de prospectos por coordinador
-- Ejecutar después de migration_coordinador_scoping.sql
-- ============================================================

-- Función auxiliar para verificar si un coordinador creó un prospecto
CREATE OR REPLACE FUNCTION coordinador_tiene_prospecto(uid uuid, prospect_id_param uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM prospects
    WHERE id = prospect_id_param AND created_by = uid
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- prospects: reemplazar política única por dos separadas
-- ============================================================
DROP POLICY IF EXISTS policy_prospects_admin ON prospects;

CREATE POLICY prospects_admin_all ON prospects
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY prospects_coordinator_own ON prospects
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND created_by = auth.uid()
  );

-- ============================================================
-- patient_preassessments: coordinador solo ve los de sus prospectos
-- ============================================================
DROP POLICY IF EXISTS policy_patient_preassessments_admin ON patient_preassessments;

CREATE POLICY patient_preassessments_admin_all ON patient_preassessments
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY patient_preassessments_coordinator_own ON patient_preassessments
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND coordinador_tiene_prospecto(auth.uid(), prospect_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND coordinador_tiene_prospecto(auth.uid(), prospect_id)
  );

-- ============================================================
-- assessment_results: coordinador solo ve los de sus prospectos
-- ============================================================
DROP POLICY IF EXISTS policy_assessment_results_admin ON assessment_results;

CREATE POLICY assessment_results_admin_all ON assessment_results
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY assessment_results_coordinator_own ON assessment_results
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND coordinador_tiene_prospecto(auth.uid(), prospect_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND coordinador_tiene_prospecto(auth.uid(), prospect_id)
  );

-- ============================================================
-- care_quotes: coordinador solo ve cotizaciones de sus prospectos
-- ============================================================
DROP POLICY IF EXISTS policy_care_quotes_admin ON care_quotes;

CREATE POLICY care_quotes_admin_all ON care_quotes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY care_quotes_coordinator_own ON care_quotes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND coordinador_tiene_prospecto(auth.uid(), prospect_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND coordinador_tiene_prospecto(auth.uid(), prospect_id)
  );

-- ============================================================
-- care_plans: coordinador solo ve planes de sus prospectos
-- ============================================================
DROP POLICY IF EXISTS policy_care_plans_admin ON care_plans;

CREATE POLICY care_plans_admin_all ON care_plans
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY care_plans_coordinator_own ON care_plans
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND coordinador_tiene_prospecto(auth.uid(), prospect_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'coordinador')
    AND coordinador_tiene_prospecto(auth.uid(), prospect_id)
  );

-- ============================================================
-- FIN MIGRACIÓN: Prospectos scoping
-- ============================================================
DO $$ BEGIN
  RAISE NOTICE '✓ Prospectos scoping aplicado: coordinadores solo ven sus propios prospectos.';
END $$;
