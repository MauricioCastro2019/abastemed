-- ============================================================
-- MIGRACIÓN: Control Integral de Pacientes — Abastemed
-- Ejecutar en Supabase SQL Editor DESPUÉS de migration_levantamiento.sql
-- ============================================================

-- ============================================================
-- TABLA: Reporte completo de turno de enfermería
-- ============================================================
CREATE TABLE IF NOT EXISTS reportes_turno (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turno_id       UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  caso_id        UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  enfermero_id   UUID NOT NULL REFERENCES enfermeros(id) ON DELETE CASCADE,
  registrado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,

  -- Signos vitales completos (JSONB)
  signos_vitales JSONB NOT NULL DEFAULT '{}',

  -- Estado general del paciente
  estado_general     TEXT,
  estado_general_obs TEXT,

  -- Alimentación e hidratación
  tipo_dieta           TEXT,
  porcentaje_ingesta   SMALLINT CHECK (porcentaje_ingesta IS NULL OR (porcentaje_ingesta >= 0 AND porcentaje_ingesta <= 100)),
  liquidos_ingeridos   TEXT,
  nausea               BOOLEAN NOT NULL DEFAULT FALSE,
  vomito               BOOLEAN NOT NULL DEFAULT FALSE,
  dificultad_deglucion BOOLEAN NOT NULL DEFAULT FALSE,
  obs_alimentacion     TEXT,

  -- Eliminación
  diuresis                TEXT,
  caracteristicas_orina   TEXT,
  vol_drenado_sonda       TEXT,
  evacuacion              BOOLEAN NOT NULL DEFAULT FALSE,
  evacuacion_cantidad     TEXT,
  evacuacion_consistencia TEXT,
  evacuacion_color        TEXT,
  uso_panal               BOOLEAN NOT NULL DEFAULT FALSE,
  obs_eliminacion         TEXT,

  -- Cuidados realizados
  cuidados_realizados TEXT[] NOT NULL DEFAULT '{}',
  obs_cuidados        TEXT,

  -- Estado de piel y prevención de lesiones
  estado_piel            TEXT,
  zonas_enrojecidas      TEXT,
  curaciones_realizadas  BOOLEAN NOT NULL DEFAULT FALSE,
  desc_curaciones        TEXT,
  cambios_posturales_num SMALLINT,
  obs_piel               TEXT,

  -- Medicamentos administrados durante el turno (JSONB[])
  medicamentos_administrados JSONB NOT NULL DEFAULT '[]',

  -- Pendientes para siguiente turno
  pendientes TEXT,

  -- Observaciones generales
  observaciones TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Kardex de medicamentos por caso/paciente
-- ============================================================
CREATE TABLE IF NOT EXISTS kardex_medicamentos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id      UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  presentacion TEXT,
  dosis        TEXT,
  via          TEXT,
  frecuencia   TEXT,
  horarios     TEXT[] NOT NULL DEFAULT '{}',
  fecha_inicio DATE,
  fecha_suspension DATE,
  medico       TEXT,
  motivo       TEXT,
  estatus      TEXT NOT NULL DEFAULT 'activo',
  existencia_domicilio BOOLEAN NOT NULL DEFAULT TRUE,
  observaciones TEXT,
  creado_por   UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Registro de administración de medicamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS administraciones_medicamento (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kardex_id               UUID NOT NULL REFERENCES kardex_medicamentos(id) ON DELETE CASCADE,
  reporte_turno_id        UUID REFERENCES reportes_turno(id) ON DELETE SET NULL,
  enfermero_id            UUID REFERENCES enfermeros(id) ON DELETE SET NULL,
  fecha_hora_programada   TIMESTAMPTZ,
  fecha_hora_administrada TIMESTAMPTZ,
  status                  TEXT NOT NULL DEFAULT 'administrado',
  observaciones           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Incidencias por caso/paciente
-- ============================================================
CREATE TABLE IF NOT EXISTS incidencias (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id          UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  turno_id         UUID REFERENCES turnos(id) ON DELETE SET NULL,
  reporte_turno_id UUID REFERENCES reportes_turno(id) ON DELETE SET NULL,
  tipo             TEXT NOT NULL,
  descripcion      TEXT NOT NULL,
  signos_vitales   JSONB NOT NULL DEFAULT '{}',
  intervencion     TEXT,
  a_quien_se_aviso TEXT,
  respuesta        TEXT,
  estado_posterior TEXT,
  gravedad         TEXT NOT NULL DEFAULT 'moderada',
  reportado_por    UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  fecha_hora       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reportes_turno_turno ON reportes_turno(turno_id);
CREATE INDEX IF NOT EXISTS idx_reportes_turno_caso  ON reportes_turno(caso_id);
CREATE INDEX IF NOT EXISTS idx_reportes_created     ON reportes_turno(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kardex_caso          ON kardex_medicamentos(caso_id);
CREATE INDEX IF NOT EXISTS idx_kardex_estatus       ON kardex_medicamentos(estatus);
CREATE INDEX IF NOT EXISTS idx_admin_med_kardex     ON administraciones_medicamento(kardex_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_caso     ON incidencias(caso_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_gravedad ON incidencias(gravedad);
CREATE INDEX IF NOT EXISTS idx_incidencias_created  ON incidencias(created_at DESC);

-- ============================================================
-- TRIGGER: auto-actualizar updated_at en kardex
-- ============================================================
CREATE OR REPLACE FUNCTION update_kardex_ts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kardex_update_ts ON kardex_medicamentos;
CREATE TRIGGER kardex_update_ts
  BEFORE UPDATE ON kardex_medicamentos
  FOR EACH ROW EXECUTE FUNCTION update_kardex_ts();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE reportes_turno               ENABLE ROW LEVEL SECURITY;
ALTER TABLE kardex_medicamentos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE administraciones_medicamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias                  ENABLE ROW LEVEL SECURITY;

-- reportes_turno
CREATE POLICY "reportes_select" ON reportes_turno
  FOR SELECT USING (auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero'));
CREATE POLICY "reportes_insert" ON reportes_turno
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero'));
CREATE POLICY "reportes_update" ON reportes_turno
  FOR UPDATE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

-- kardex_medicamentos
CREATE POLICY "kardex_select" ON kardex_medicamentos
  FOR SELECT USING (auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero'));
CREATE POLICY "kardex_insert" ON kardex_medicamentos
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));
CREATE POLICY "kardex_update" ON kardex_medicamentos
  FOR UPDATE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));
CREATE POLICY "kardex_delete" ON kardex_medicamentos
  FOR DELETE USING (auth_rol() = 'admin');

-- administraciones_medicamento
CREATE POLICY "admin_med_select" ON administraciones_medicamento
  FOR SELECT USING (auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero'));
CREATE POLICY "admin_med_insert" ON administraciones_medicamento
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero'));

-- incidencias
CREATE POLICY "incidencias_select" ON incidencias
  FOR SELECT USING (auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero'));
CREATE POLICY "incidencias_insert" ON incidencias
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero'));
CREATE POLICY "incidencias_update" ON incidencias
  FOR UPDATE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));
CREATE POLICY "incidencias_delete" ON incidencias
  FOR DELETE USING (auth_rol() = 'admin');
