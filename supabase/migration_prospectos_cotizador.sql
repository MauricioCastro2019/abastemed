-- ============================================================
-- MIGRACIÓN: Evaluación Inicial de Cuidado y Cotizador Inteligente — Abastemed
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- TABLA: Prospectos / Solicitudes de servicio
-- ============================================================
CREATE TABLE IF NOT EXISTS prospects (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_name             TEXT NOT NULL,
  requester_phone            TEXT NOT NULL,
  requester_whatsapp         TEXT,
  requester_email            TEXT,
  relationship_to_patient    TEXT NOT NULL DEFAULT 'otro',
  -- Responsable de autorización
  is_authorizer              BOOLEAN NOT NULL DEFAULT TRUE,
  authorization_responsible_name TEXT,
  -- Responsable de pago
  is_payer                   BOOLEAN NOT NULL DEFAULT TRUE,
  payment_responsible_name   TEXT,
  payment_responsible_phone  TEXT,
  -- Comercial
  source                     TEXT NOT NULL DEFAULT 'otro',
  urgency                    TEXT NOT NULL DEFAULT 'sin_fecha',
  is_urgent                  BOOLEAN NOT NULL DEFAULT FALSE,
  status                     TEXT NOT NULL DEFAULT 'nuevo',
  initial_observations       TEXT,
  created_by                 UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Pre-levantamiento del paciente
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_preassessments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id             UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  patient_name            TEXT NOT NULL,
  patient_age             INTEGER,
  patient_gender          TEXT,
  service_address         TEXT,
  neighborhood            TEXT,
  city                    TEXT,
  approximate_weight      INTEGER,
  diagnosis               TEXT,
  doctor_name             TEXT,
  hospital_reference      TEXT,
  currently_hospitalized  BOOLEAN NOT NULL DEFAULT FALSE,
  current_location        TEXT DEFAULT 'casa',
  general_observations    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Evaluación física
-- ============================================================
CREATE TABLE IF NOT EXISTS physical_assessments (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preassessment_id         UUID NOT NULL REFERENCES patient_preassessments(id) ON DELETE CASCADE,
  -- Respuestas (puntaje por pregunta)
  mobility_status          SMALLINT NOT NULL DEFAULT 0,
  fall_risk                SMALLINT NOT NULL DEFAULT 0,
  bed_status               SMALLINT NOT NULL DEFAULT 0,
  position_changes         SMALLINT NOT NULL DEFAULT 0,
  diaper_or_bathroom       SMALLINT NOT NULL DEFAULT 0,
  hygiene_support          SMALLINT NOT NULL DEFAULT 0,
  feeding_status           SMALLINT NOT NULL DEFAULT 0,
  hydration_support        SMALLINT NOT NULL DEFAULT 0,
  night_watch_status       SMALLINT NOT NULL DEFAULT 0,
  daily_life_support       SMALLINT NOT NULL DEFAULT 0,
  -- Calculado
  physical_score           SMALLINT NOT NULL DEFAULT 0,
  physical_level           TEXT NOT NULL DEFAULT 'apoyo_ligero',
  physical_alerts          TEXT[] NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Evaluación clínica
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_assessments (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preassessment_id           UUID NOT NULL REFERENCES patient_preassessments(id) ON DELETE CASCADE,
  -- Respuestas
  medication_status          SMALLINT NOT NULL DEFAULT 0,
  injectable_medications     SMALLINT NOT NULL DEFAULT 0,
  vital_signs_frequency      SMALLINT NOT NULL DEFAULT 0,
  glucose_control            SMALLINT NOT NULL DEFAULT 0,
  oxygen_use                 SMALLINT NOT NULL DEFAULT 0,
  nebulizations              SMALLINT NOT NULL DEFAULT 0,
  devices_score              SMALLINT NOT NULL DEFAULT 0,
  devices_list               TEXT[] NOT NULL DEFAULT '{}',
  wound_care                 SMALLINT NOT NULL DEFAULT 0,
  pain_status                SMALLINT NOT NULL DEFAULT 0,
  postoperative_status       SMALLINT NOT NULL DEFAULT 0,
  postoperative_notes        JSONB,
  neurological_events        SMALLINT NOT NULL DEFAULT 0,
  secretion_aspiration       SMALLINT NOT NULL DEFAULT 0,
  fluid_output_record        SMALLINT NOT NULL DEFAULT 0,
  medical_indications_status SMALLINT NOT NULL DEFAULT 0,
  emergency_contact_status   SMALLINT NOT NULL DEFAULT 0,
  -- Calculado
  clinical_score             SMALLINT NOT NULL DEFAULT 0,
  clinical_level             TEXT NOT NULL DEFAULT 'sin_necesidades',
  clinical_alert_level       TEXT NOT NULL DEFAULT 'verde',
  clinical_alerts            TEXT[] NOT NULL DEFAULT '{}',
  minimum_clinical_profile   TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Evaluación operativa / conductual / familiar
-- ============================================================
CREATE TABLE IF NOT EXISTS operational_risk_assessments (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preassessment_id            UUID NOT NULL REFERENCES patient_preassessments(id) ON DELETE CASCADE,
  -- Respuestas
  orientation_status          SMALLINT NOT NULL DEFAULT 0,
  cognitive_impairment        SMALLINT NOT NULL DEFAULT 0,
  agitation_or_aggression     SMALLINT NOT NULL DEFAULT 0,
  device_removal_risk         SMALLINT NOT NULL DEFAULT 0,
  communication_ability       SMALLINT NOT NULL DEFAULT 0,
  emotional_state             SMALLINT NOT NULL DEFAULT 0,
  family_decision_structure   SMALLINT NOT NULL DEFAULT 0,
  payment_clarity             SMALLINT NOT NULL DEFAULT 0,
  family_conflict_level       SMALLINT NOT NULL DEFAULT 0,
  service_expectations        SMALLINT NOT NULL DEFAULT 0,
  supplies_availability       SMALLINT NOT NULL DEFAULT 0,
  home_safety                 SMALLINT NOT NULL DEFAULT 0,
  -- Calculado
  operational_score           SMALLINT NOT NULL DEFAULT 0,
  operational_level           TEXT NOT NULL DEFAULT 'claro_manejable',
  operational_alerts          TEXT[] NOT NULL DEFAULT '{}',
  requires_written_agreements BOOLEAN NOT NULL DEFAULT FALSE,
  requires_payment_before     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Datos comerciales del servicio
-- ============================================================
CREATE TABLE IF NOT EXISTS service_requests (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id              UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  preassessment_id         UUID REFERENCES patient_preassessments(id) ON DELETE SET NULL,
  requested_service_type   TEXT DEFAULT 'no_sabe',
  recommended_service_type TEXT,
  shift_duration_hours     INTEGER DEFAULT 8,
  shift_schedule           TEXT DEFAULT 'por_definir',
  frequency                TEXT DEFAULT 'por_definir',
  requested_start_date     TEXT DEFAULT 'sin_fecha',
  estimated_duration       TEXT DEFAULT 'no_se_sabe',
  staff_preference         TEXT[] NOT NULL DEFAULT '{}',
  report_type              TEXT DEFAULT 'reporte_breve',
  supervision_type         TEXT DEFAULT 'ninguna',
  medication_control_type  TEXT DEFAULT 'ninguno',
  supplies_handling        TEXT DEFAULT 'familia_provee',
  payment_method           TEXT DEFAULT 'por_definir',
  payment_frequency        TEXT DEFAULT 'por_definir',
  location_type            TEXT DEFAULT 'normal',
  commercial_notes         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Resultado del motor de score
-- ============================================================
CREATE TABLE IF NOT EXISTS assessment_results (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  preassessment_id              UUID NOT NULL REFERENCES patient_preassessments(id) ON DELETE CASCADE,
  prospect_id                   UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  physical_score                SMALLINT NOT NULL DEFAULT 0,
  clinical_score                SMALLINT NOT NULL DEFAULT 0,
  operational_score             SMALLINT NOT NULL DEFAULT 0,
  total_score                   SMALLINT NOT NULL DEFAULT 0,
  general_complexity_level      TEXT NOT NULL DEFAULT 'bajo',
  risk_color                    TEXT NOT NULL DEFAULT 'verde',
  recommended_profile           TEXT NOT NULL DEFAULT 'cuidador',
  requires_in_person_assessment BOOLEAN NOT NULL DEFAULT FALSE,
  requires_formal_proposal      BOOLEAN NOT NULL DEFAULT FALSE,
  requires_clinical_supervision BOOLEAN NOT NULL DEFAULT FALSE,
  requires_mandatory_log        BOOLEAN NOT NULL DEFAULT FALSE,
  requires_advance_payment      BOOLEAN NOT NULL DEFAULT FALSE,
  blocking_flags                TEXT[] NOT NULL DEFAULT '{}',
  warning_flags                 TEXT[] NOT NULL DEFAULT '{}',
  internal_recommendation       TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Cotización / Motor de precio
-- ============================================================
CREATE TABLE IF NOT EXISTS care_quotes (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id              UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  preassessment_id         UUID REFERENCES patient_preassessments(id) ON DELETE SET NULL,
  service_request_id       UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  assessment_result_id     UUID REFERENCES assessment_results(id) ON DELETE SET NULL,
  -- Tarifa base
  base_rate                NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Ajustes porcentuales (monto calculado)
  physical_adjustment      NUMERIC(10,2) NOT NULL DEFAULT 0,
  clinical_adjustment      NUMERIC(10,2) NOT NULL DEFAULT 0,
  operational_adjustment   NUMERIC(10,2) NOT NULL DEFAULT 0,
  schedule_adjustment      NUMERIC(10,2) NOT NULL DEFAULT 0,
  urgency_adjustment       NUMERIC(10,2) NOT NULL DEFAULT 0,
  location_adjustment      NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Extras fijos
  supervision_fee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  report_fee               NUMERIC(10,2) NOT NULL DEFAULT 0,
  medication_control_fee   NUMERIC(10,2) NOT NULL DEFAULT 0,
  supplies_management_fee  NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Precios
  calculated_price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  suggested_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_recommended_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_price              NUMERIC(10,2),
  adjustment_reason        TEXT,
  authorized_by            UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  deposit_required         NUMERIC(10,2),
  payment_terms            TEXT,
  quote_valid_until        DATE,
  status                   TEXT NOT NULL DEFAULT 'borrador',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Desglose de ajustes de cotización
-- ============================================================
CREATE TABLE IF NOT EXISTS quote_adjustments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_quote_id     UUID NOT NULL REFERENCES care_quotes(id) ON DELETE CASCADE,
  adjustment_type   TEXT NOT NULL,
  description       TEXT NOT NULL,
  percentage        NUMERIC(6,4),
  fixed_amount      NUMERIC(10,2),
  calculated_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Documentos generados (propuestas, mensajes)
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id    UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  care_quote_id  UUID REFERENCES care_quotes(id) ON DELETE SET NULL,
  document_type  TEXT NOT NULL,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'borrador',
  sent_at        TIMESTAMPTZ,
  accepted_at    TIMESTAMPTZ,
  created_by     UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Checklist de activación
-- ============================================================
CREATE TABLE IF NOT EXISTS activation_checklists (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id                     UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  preassessment_id                UUID REFERENCES patient_preassessments(id) ON DELETE SET NULL,
  care_quote_id                   UUID REFERENCES care_quotes(id) ON DELETE SET NULL,
  patient_data_complete           BOOLEAN NOT NULL DEFAULT FALSE,
  address_confirmed               BOOLEAN NOT NULL DEFAULT FALSE,
  payment_responsible_confirmed   BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_contact_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
  final_price_authorized          BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_registered              BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted                  BOOLEAN NOT NULL DEFAULT FALSE,
  medical_indications_available   BOOLEAN NOT NULL DEFAULT FALSE,
  medication_list_available       BOOLEAN NOT NULL DEFAULT FALSE,
  supplies_ready                  BOOLEAN NOT NULL DEFAULT FALSE,
  assessment_completed_if_required BOOLEAN NOT NULL DEFAULT TRUE,
  staff_profile_confirmed         BOOLEAN NOT NULL DEFAULT FALSE,
  start_date_confirmed            BOOLEAN NOT NULL DEFAULT FALSE,
  is_ready_to_activate            BOOLEAN NOT NULL DEFAULT FALSE,
  missing_items                   TEXT[] NOT NULL DEFAULT '{}',
  validated_by                    UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  validated_at                    TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Plan inicial de cuidado (si no existe)
-- ============================================================
CREATE TABLE IF NOT EXISTS care_plans (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id              UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  prospect_id             UUID REFERENCES prospects(id) ON DELETE SET NULL,
  preassessment_id        UUID REFERENCES patient_preassessments(id) ON DELETE SET NULL,
  plan_type               TEXT NOT NULL DEFAULT 'inicial',
  service_type            TEXT,
  shift_duration_hours    INTEGER,
  shift_schedule          TEXT,
  frequency               TEXT,
  required_profile        TEXT,
  main_needs              TEXT[] NOT NULL DEFAULT '{}',
  care_instructions       TEXT,
  medication_instructions TEXT,
  monitoring_instructions TEXT,
  reporting_instructions  TEXT,
  restrictions            TEXT,
  alerts                  TEXT[] NOT NULL DEFAULT '{}',
  emergency_plan          TEXT,
  status                  TEXT NOT NULL DEFAULT 'activo',
  created_by              UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COLUMNAS EXTRA en pacientes (origen del prospecto)
-- ============================================================
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS source_prospect_id      UUID REFERENCES prospects(id) ON DELETE SET NULL;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS source_preassessment_id UUID REFERENCES patient_preassessments(id) ON DELETE SET NULL;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prospects_status      ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at  ON prospects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preassessments_prospect ON patient_preassessments(prospect_id);
CREATE INDEX IF NOT EXISTS idx_physical_preassessment  ON physical_assessments(preassessment_id);
CREATE INDEX IF NOT EXISTS idx_clinical_preassessment  ON clinical_assessments(preassessment_id);
CREATE INDEX IF NOT EXISTS idx_operational_preassessment ON operational_risk_assessments(preassessment_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_prospect ON service_requests(prospect_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_prospect ON assessment_results(prospect_id);
CREATE INDEX IF NOT EXISTS idx_care_quotes_prospect    ON care_quotes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_care_quotes_status      ON care_quotes(status);
CREATE INDEX IF NOT EXISTS idx_generated_docs_prospect ON generated_documents(prospect_id);
CREATE INDEX IF NOT EXISTS idx_activation_prospect     ON activation_checklists(prospect_id);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'prospects','patient_preassessments','physical_assessments',
    'clinical_assessments','operational_risk_assessments','service_requests',
    'assessment_results','care_quotes','generated_documents',
    'activation_checklists','care_plans'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;
      CREATE TRIGGER trg_%1$s_updated_at
        BEFORE UPDATE ON %1$s
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', tbl);
  END LOOP;
END;
$$;

-- ============================================================
-- RLS (Row Level Security) — solo admin y jefe pueden ver/editar
-- ============================================================
ALTER TABLE prospects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_preassessments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_assessments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_assessments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results          ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_quotes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_adjustments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_checklists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_plans                  ENABLE ROW LEVEL SECURITY;

-- Política: solo perfiles con rol admin o jefe_enfermeros
CREATE OR REPLACE FUNCTION is_admin_or_jefe()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles
    WHERE id = auth.uid()
      AND rol IN ('admin', 'jefe_enfermeros')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'prospects','patient_preassessments','physical_assessments',
    'clinical_assessments','operational_risk_assessments','service_requests',
    'assessment_results','care_quotes','quote_adjustments','generated_documents',
    'activation_checklists','care_plans'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS policy_%1$s_admin ON %1$s;
      CREATE POLICY policy_%1$s_admin ON %1$s
        FOR ALL
        USING (is_admin_or_jefe())
        WITH CHECK (is_admin_or_jefe());
    ', tbl);
  END LOOP;
END;
$$;
