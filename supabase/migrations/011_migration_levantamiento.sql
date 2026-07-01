-- ============================================================
-- MIGRACIÓN: Módulo de Levantamiento de Paciente — Abastemed
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla principal
CREATE TABLE IF NOT EXISTS levantamientos_paciente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Datos del paciente
  paciente_nombre            TEXT NOT NULL DEFAULT '',
  paciente_apellido          TEXT NOT NULL DEFAULT '',
  paciente_fecha_nacimiento  DATE,
  paciente_sexo              TEXT,
  paciente_telefono          TEXT,
  paciente_domicilio         TEXT,
  paciente_referencias       TEXT,
  paciente_ciudad            TEXT,
  paciente_estado_geo        TEXT,
  paciente_cp                TEXT,
  paciente_obs_ubicacion     TEXT,

  -- Responsable / contacto
  responsable_nombre          TEXT,
  responsable_parentesco      TEXT,
  responsable_tel_principal   TEXT,
  responsable_tel_alternativo TEXT,
  responsable_email           TEXT,
  responsable_es_pagador      BOOLEAN NOT NULL DEFAULT FALSE,
  responsable_obs             TEXT,

  -- Origen de la solicitud
  fecha_solicitud      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  medio_contacto       TEXT,
  persona_solicita     TEXT,
  relacion_solicitante TEXT,
  motivo_general       TEXT,
  urgencia_percibida   TEXT NOT NULL DEFAULT 'media',

  -- Tipo de servicio
  tipos_servicio        TEXT[] NOT NULL DEFAULT '{}',
  descripcion_necesidad TEXT,
  expectativa_familia   TEXT,
  obs_servicio          TEXT,

  -- Valoración clínica
  diagnostico_principal    TEXT,
  diagnosticos_secundarios TEXT,
  medico_tratante          TEXT,
  hospital_referencia      TEXT,
  fecha_evento_reciente    DATE,
  estado_conciencia        TEXT,
  orientacion              TEXT[] NOT NULL DEFAULT '{}',
  comunicacion             TEXT,
  movilidad                TEXT,
  riesgo_caida             TEXT,
  tiene_dolor              BOOLEAN NOT NULL DEFAULT FALSE,
  escala_dolor             SMALLINT CHECK (escala_dolor IS NULL OR (escala_dolor >= 0 AND escala_dolor <= 10)),
  ubicacion_dolor          TEXT,
  tiene_heridas            BOOLEAN NOT NULL DEFAULT FALSE,
  descripcion_heridas      TEXT,
  usa_oxigeno              BOOLEAN NOT NULL DEFAULT FALSE,
  litros_oxigeno           TEXT,
  dispositivo_oxigeno      TEXT,
  usa_sonda                BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_sonda               TEXT,
  usa_cateter              BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_cateter             TEXT,
  usa_panal                BOOLEAN NOT NULL DEFAULT FALSE,
  alimentacion             TEXT,
  evacuacion               TEXT,
  obs_clinicas             TEXT,

  -- Signos vitales iniciales (JSONB para flexibilidad)
  signos_vitales JSONB NOT NULL DEFAULT '{}',

  -- Medicamentos y alergias
  alergias                TEXT,
  alergias_medicamentos   TEXT,
  reacciones_previas      TEXT,
  medicamentos_suspendidos TEXT,
  obs_farmacologicas      TEXT,

  -- Actividades de enfermería
  actividades_enfermeria TEXT[] NOT NULL DEFAULT '{}',
  obs_actividades        TEXT,

  -- Evaluación del entorno (JSONB)
  entorno JSONB NOT NULL DEFAULT '{}',

  -- Plan de servicio
  fecha_inicio_estimada   DATE,
  fecha_termino_estimada  DATE,
  tipo_turno              TEXT,
  horario_requerido       TEXT,
  frecuencia_servicio     TEXT,
  num_personas_requeridas SMALLINT NOT NULL DEFAULT 1,
  nivel_personal          TEXT,
  requiere_supervision    BOOLEAN NOT NULL DEFAULT FALSE,
  prioridad               TEXT NOT NULL DEFAULT 'media',

  -- Riesgo (calculado automáticamente, editable por usuario)
  riesgo_sugerido          TEXT NOT NULL DEFAULT 'bajo',
  riesgo_final             TEXT NOT NULL DEFAULT 'bajo',
  riesgo_modificado_manual BOOLEAN NOT NULL DEFAULT FALSE,

  -- Costos y pago
  costo_estimado     NUMERIC(10,2),
  costo_autorizado   NUMERIC(10,2),
  forma_pago         TEXT,
  responsable_pago   TEXT,
  material_incluido  TEXT,
  material_no_incluido TEXT,
  obs_administrativas TEXT,

  -- Consentimiento (JSONB)
  consentimiento JSONB NOT NULL DEFAULT '{}',

  -- Control operativo
  estado        TEXT NOT NULL DEFAULT 'borrador',
  levantado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medicamentos por levantamiento
CREATE TABLE IF NOT EXISTS levantamiento_medicamentos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  levantamiento_id UUID NOT NULL REFERENCES levantamientos_paciente(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  dosis            TEXT,
  frecuencia       TEXT,
  via              TEXT,
  horario          TEXT,
  indicado_por     TEXT,
  observaciones    TEXT,
  orden            SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Materiales e insumos por levantamiento
CREATE TABLE IF NOT EXISTS levantamiento_materiales (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  levantamiento_id UUID NOT NULL REFERENCES levantamientos_paciente(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL,
  cantidad         TEXT,
  proporciona      TEXT NOT NULL DEFAULT 'pendiente',
  costo_estimado   NUMERIC(10,2),
  observaciones    TEXT,
  orden            SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_levantamientos_estado    ON levantamientos_paciente(estado);
CREATE INDEX IF NOT EXISTS idx_levantamientos_prioridad ON levantamientos_paciente(prioridad);
CREATE INDEX IF NOT EXISTS idx_levantamientos_riesgo    ON levantamientos_paciente(riesgo_final);
CREATE INDEX IF NOT EXISTS idx_levantamientos_created   ON levantamientos_paciente(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lev_meds_lev             ON levantamiento_medicamentos(levantamiento_id);
CREATE INDEX IF NOT EXISTS idx_lev_mats_lev             ON levantamiento_materiales(levantamiento_id);

-- ============================================================
-- TRIGGER: auto-actualizar updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_levantamiento_ts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lev_update_ts
  BEFORE UPDATE ON levantamientos_paciente
  FOR EACH ROW EXECUTE FUNCTION update_levantamiento_ts();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE levantamientos_paciente    ENABLE ROW LEVEL SECURITY;
ALTER TABLE levantamiento_medicamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE levantamiento_materiales   ENABLE ROW LEVEL SECURITY;

-- levantamientos_paciente
CREATE POLICY "levantamientos_select" ON levantamientos_paciente
  FOR SELECT USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

CREATE POLICY "levantamientos_insert" ON levantamientos_paciente
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

CREATE POLICY "levantamientos_update" ON levantamientos_paciente
  FOR UPDATE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

CREATE POLICY "levantamientos_delete" ON levantamientos_paciente
  FOR DELETE USING (auth_rol() = 'admin');

-- levantamiento_medicamentos
CREATE POLICY "lev_meds_all" ON levantamiento_medicamentos
  FOR ALL USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

-- levantamiento_materiales
CREATE POLICY "lev_mats_all" ON levantamiento_materiales
  FOR ALL USING (auth_rol() IN ('admin', 'jefe_enfermeros'));
