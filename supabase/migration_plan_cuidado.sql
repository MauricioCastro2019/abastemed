-- ============================================================
-- ABASTEMED — Plan de Cuidado
-- Módulo de indicaciones y eventos programados de cuidado
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE tipo_indicacion AS ENUM (
  'medicamento_oral',
  'aplicacion_medicamento',
  'curacion',
  'signos_vitales',
  'terapia',
  'otra'
);

CREATE TYPE via_administracion AS ENUM (
  'oral',
  'intravenosa',
  'intramuscular',
  'subcutanea',
  'topica',
  'inhalatoria',
  'sublingual',
  'nasal',
  'otra'
);

CREATE TYPE frecuencia_indicacion AS ENUM (
  'cada_4h',
  'cada_6h',
  'cada_8h',
  'cada_12h',
  'cada_24h',
  'lunes_miercoles_viernes',
  'una_vez',
  'segun_necesidad'
);

CREATE TYPE status_evento AS ENUM (
  'pendiente',
  'confirmado',
  'omitido',
  'reprogramado',
  'cancelado'
);

-- ============================================================
-- TABLA: indicaciones
-- Una indicación es un medicamento, curación, terapia, etc.
-- que se registra en el plan de cuidado de un paciente.
-- ============================================================

CREATE TABLE IF NOT EXISTS indicaciones (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id  UUID    NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  caso_id      UUID    REFERENCES casos(id) ON DELETE SET NULL,
  tipo         tipo_indicacion    NOT NULL,
  nombre       TEXT    NOT NULL,
  dosis        TEXT,
  via          via_administracion,
  frecuencia   frecuencia_indicacion NOT NULL,
  horarios     TEXT[]  NOT NULL DEFAULT '{}',   -- ['08:00', '14:00', '20:00']
  fecha_inicio DATE    NOT NULL,
  fecha_fin    DATE,
  responsable  TEXT,
  notas        TEXT,
  activa       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: eventos_indicacion
-- Cada evento es una toma/aplicación/curación programada.
-- Se generan automáticamente al crear la indicación.
-- ============================================================

CREATE TABLE IF NOT EXISTS eventos_indicacion (
  id                    UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  indicacion_id         UUID  NOT NULL REFERENCES indicaciones(id) ON DELETE CASCADE,
  paciente_id           UUID  NOT NULL REFERENCES pacientes(id)   ON DELETE CASCADE,
  fecha_hora_programada TIMESTAMPTZ NOT NULL,
  status                status_evento NOT NULL DEFAULT 'pendiente',
  fecha_hora_real       TIMESTAMPTZ,
  notas                 TEXT,
  atendido_por          UUID  REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_indicaciones_paciente ON indicaciones(paciente_id);
CREATE INDEX idx_indicaciones_caso     ON indicaciones(caso_id);
CREATE INDEX idx_indicaciones_activa   ON indicaciones(activa);

CREATE INDEX idx_eventos_indicacion    ON eventos_indicacion(indicacion_id);
CREATE INDEX idx_eventos_paciente      ON eventos_indicacion(paciente_id);
CREATE INDEX idx_eventos_fecha         ON eventos_indicacion(fecha_hora_programada);
CREATE INDEX idx_eventos_status        ON eventos_indicacion(status);

-- Índice compuesto para la consulta de agenda diaria
CREATE INDEX idx_eventos_fecha_paciente
  ON eventos_indicacion(fecha_hora_programada, paciente_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE indicaciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_indicacion ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- POLÍTICAS: indicaciones
-- ----------------------------------------------------------------

-- Admin y jefe ven todo; enfermero ve todos; familiar ve las de su paciente
CREATE POLICY "indicaciones_select" ON indicaciones
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = indicaciones.paciente_id
    )
  );

CREATE POLICY "indicaciones_insert" ON indicaciones
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

CREATE POLICY "indicaciones_update" ON indicaciones
  FOR UPDATE USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

CREATE POLICY "indicaciones_delete" ON indicaciones
  FOR DELETE USING (auth_rol() = 'admin');

-- ----------------------------------------------------------------
-- POLÍTICAS: eventos_indicacion
-- ----------------------------------------------------------------

CREATE POLICY "eventos_select" ON eventos_indicacion
  FOR SELECT USING (
    auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero')
    OR EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND paciente_id = eventos_indicacion.paciente_id
    )
  );

-- Solo admin/jefe pueden crear eventos (se generan automáticamente)
CREATE POLICY "eventos_insert" ON eventos_indicacion
  FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

-- Admin, jefe y enfermero pueden actualizar el estado del evento
CREATE POLICY "eventos_update" ON eventos_indicacion
  FOR UPDATE USING (
    auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero')
  );
