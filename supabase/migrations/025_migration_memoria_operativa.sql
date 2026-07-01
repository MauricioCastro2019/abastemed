-- ============================================================
-- MIGRACIÓN: Memoria Operativa del Cuidado — Abastemed
-- Ejecutar en Supabase SQL Editor DESPUÉS de migration_control_pacientes.sql
-- ============================================================

-- ============================================================
-- TABLA: Hallazgos clínicos (estado clínico con ciclo de vida)
-- Distinto de incidencias: un hallazgo se abre, evoluciona y se cierra.
-- ============================================================
CREATE TABLE IF NOT EXISTS hallazgos_clinicos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id        UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  turno_id       UUID REFERENCES turnos(id) ON DELETE SET NULL,
  enfermero_id   UUID REFERENCES enfermeros(id) ON DELETE SET NULL,
  creado_por     UUID REFERENCES perfiles(id) ON DELETE SET NULL,

  -- Clasificación
  categoria      TEXT NOT NULL CHECK (categoria IN (
    'integridad_piel', 'respiratorio', 'neurologico',
    'digestivo', 'dolor', 'movilidad', 'nutricional', 'otro'
  )),
  tipo           TEXT NOT NULL,   -- abrasion, lesion_presion, edema, somnolencia, evacuacion_liquida...
  descripcion    TEXT NOT NULL,

  -- Severidad y estado del hallazgo
  severidad      TEXT NOT NULL DEFAULT 'leve' CHECK (severidad IN ('leve', 'moderada', 'grave')),
  estado         TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_seguimiento', 'resuelto')),

  -- Seguimiento
  requiere_vigilancia    BOOLEAN NOT NULL DEFAULT FALSE,
  requiere_notificacion  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Fotos (array de URLs de Supabase Storage)
  fotos_urls     TEXT[] NOT NULL DEFAULT '{}',

  -- Resolución
  fecha_resolucion   TIMESTAMPTZ,
  notas_resolucion   TEXT,
  resuelto_por       UUID REFERENCES perfiles(id) ON DELETE SET NULL,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Pendientes del caso (sobreviven entre turnos)
-- ============================================================
CREATE TABLE IF NOT EXISTS pendientes_caso (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id                 UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  turno_origen_id         UUID REFERENCES turnos(id) ON DELETE SET NULL,
  enfermero_creador_id    UUID REFERENCES perfiles(id) ON DELETE SET NULL,

  -- Contenido
  titulo       TEXT NOT NULL,
  descripcion  TEXT,
  prioridad    TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('urgente', 'alta', 'normal', 'baja')),

  -- Estado
  estado       TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'resuelto', 'cancelado')),

  -- Trazabilidad de origen
  origen       TEXT DEFAULT 'manual' CHECK (origen IN (
    'manual', 'hallazgo', 'medicamento_omitido', 'entrega_turno', 'alerta', 'automatico'
  )),
  origen_id    UUID,  -- ID del hallazgo, incidencia, etc. que lo generó

  -- Resolución
  turno_resolucion_id     UUID REFERENCES turnos(id) ON DELETE SET NULL,
  enfermero_resolucion_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  fecha_resolucion        TIMESTAMPTZ,
  notas_resolucion        TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Alertas activas del caso (flags persistentes)
-- No son eventos — son estados que permanecen activos.
-- ============================================================
CREATE TABLE IF NOT EXISTS alertas_activas (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id                 UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  turno_activacion_id     UUID REFERENCES turnos(id) ON DELETE SET NULL,
  activado_por            UUID REFERENCES perfiles(id) ON DELETE SET NULL,

  -- Tipo y nivel
  tipo         TEXT NOT NULL CHECK (tipo IN (
    'riesgo_caida', 'riesgo_lesion_cutanea', 'riesgo_broncoaspiracion',
    'riesgo_deshidratacion', 'riesgo_sepsis', 'dolor_no_controlado', 'otro'
  )),
  descripcion  TEXT,
  nivel        TEXT NOT NULL DEFAULT 'moderado' CHECK (nivel IN ('bajo', 'moderado', 'alto', 'critico')),

  -- Estado
  activa       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Desactivación
  turno_desactivacion_id  UUID REFERENCES turnos(id) ON DELETE SET NULL,
  desactivado_por         UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  fecha_desactivacion     TIMESTAMPTZ,
  motivo_desactivacion    TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Vigilancias especiales (monitoreo continuo por caso)
-- Instrucción clínica que aplica a todos los turnos futuros.
-- ============================================================
CREATE TABLE IF NOT EXISTS vigilancias_especiales (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id      UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  creado_por   UUID REFERENCES perfiles(id) ON DELETE SET NULL,

  -- Qué vigilar
  parametro    TEXT NOT NULL CHECK (parametro IN (
    'saturacion', 'integridad_piel', 'hidratacion', 'evacuaciones',
    'presion_arterial', 'glucosa', 'dolor', 'frecuencia_cardiaca',
    'temperatura', 'peso', 'otro'
  )),
  descripcion  TEXT,
  frecuencia   TEXT CHECK (frecuencia IN (
    'continua', 'cada_hora', 'cada_2_horas', 'cada_4_horas',
    'cada_turno', 'cada_12_horas', 'diario', 'segun_necesidad'
  )),
  instrucciones TEXT,

  -- Estado
  activa       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Desactivación
  desactivado_por  UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  fecha_desactivacion TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: Entrega guiada de turno
-- Reemplaza texto libre con preguntas estructuradas.
-- Auto-genera resumen para siguiente turno, coordinación y familia.
-- ============================================================
CREATE TABLE IF NOT EXISTS entregas_turno_guiadas (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turno_id             UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  caso_id              UUID NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  enfermero_saliente_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,

  -- Evaluación del turno (preguntas guiadas)
  estado_paciente         TEXT NOT NULL CHECK (estado_paciente IN ('mejor', 'igual', 'peor')),
  cambios_relevantes      TEXT,
  pendientes_siguiente    TEXT,
  vigilancia_especial     TEXT,
  notificar_coordinacion  BOOLEAN NOT NULL DEFAULT FALSE,
  notas_coordinacion      TEXT,

  -- Resúmenes auto-generados (poblados por server action)
  resumen_turno    TEXT,   -- para la siguiente enfermera
  resumen_familiar TEXT,   -- versión sin jerga clínica

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_hallazgos_caso      ON hallazgos_clinicos(caso_id);
CREATE INDEX IF NOT EXISTS idx_hallazgos_estado    ON hallazgos_clinicos(estado);
CREATE INDEX IF NOT EXISTS idx_hallazgos_created   ON hallazgos_clinicos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pendientes_caso     ON pendientes_caso(caso_id);
CREATE INDEX IF NOT EXISTS idx_pendientes_estado   ON pendientes_caso(estado);
CREATE INDEX IF NOT EXISTS idx_pendientes_created  ON pendientes_caso(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alertas_caso        ON alertas_activas(caso_id);
CREATE INDEX IF NOT EXISTS idx_alertas_activa      ON alertas_activas(activa);

CREATE INDEX IF NOT EXISTS idx_vigilancias_caso    ON vigilancias_especiales(caso_id);
CREATE INDEX IF NOT EXISTS idx_vigilancias_activa  ON vigilancias_especiales(activa);

CREATE INDEX IF NOT EXISTS idx_entregas_guiadas_turno ON entregas_turno_guiadas(turno_id);
CREATE INDEX IF NOT EXISTS idx_entregas_guiadas_caso  ON entregas_turno_guiadas(caso_id);

-- ============================================================
-- VISTA: Línea de tiempo unificada por caso
-- Agrega todos los eventos clínicos en orden cronológico.
-- ============================================================
CREATE OR REPLACE VIEW v_timeline_caso AS
  SELECT
    caso_id,
    created_at,
    'hallazgo'       AS tipo_evento,
    id               AS origen_id,
    categoria        AS subtipo,
    descripcion      AS texto,
    severidad        AS nivel,
    estado
  FROM hallazgos_clinicos

  UNION ALL

  SELECT
    caso_id,
    fecha_hora       AS created_at,
    'incidencia'     AS tipo_evento,
    id               AS origen_id,
    tipo             AS subtipo,
    descripcion      AS texto,
    gravedad         AS nivel,
    'registrada'     AS estado
  FROM incidencias

  UNION ALL

  SELECT
    caso_id,
    created_at,
    'pendiente'      AS tipo_evento,
    id               AS origen_id,
    prioridad        AS subtipo,
    titulo           AS texto,
    prioridad        AS nivel,
    estado
  FROM pendientes_caso

  UNION ALL

  SELECT
    caso_id,
    created_at,
    'alerta'         AS tipo_evento,
    id               AS origen_id,
    tipo             AS subtipo,
    COALESCE(descripcion, tipo) AS texto,
    nivel,
    CASE WHEN activa THEN 'activa' ELSE 'desactivada' END AS estado
  FROM alertas_activas

  UNION ALL

  SELECT
    caso_id,
    created_at,
    'reporte_turno'  AS tipo_evento,
    id               AS origen_id,
    COALESCE(estado_general, 'reporte') AS subtipo,
    COALESCE(observaciones, 'Reporte de turno registrado') AS texto,
    'normal'         AS nivel,
    'registrado'     AS estado
  FROM reportes_turno

  UNION ALL

  SELECT
    caso_id,
    created_at,
    'entrega_turno'  AS tipo_evento,
    id               AS origen_id,
    estado_paciente  AS subtipo,
    COALESCE(resumen_turno, 'Entrega de turno registrada') AS texto,
    'normal'         AS nivel,
    'registrada'     AS estado
  FROM entregas_turno_guiadas;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE hallazgos_clinicos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendientes_caso      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_activas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vigilancias_especiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas_turno_guiadas ENABLE ROW LEVEL SECURITY;

-- Política para admin y coordinador: acceso total
CREATE POLICY "admin_coordinador_all_hallazgos" ON hallazgos_clinicos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador'))
  );

CREATE POLICY "admin_coordinador_all_pendientes" ON pendientes_caso
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador'))
  );

CREATE POLICY "admin_coordinador_all_alertas" ON alertas_activas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador'))
  );

CREATE POLICY "admin_coordinador_all_vigilancias" ON vigilancias_especiales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador'))
  );

CREATE POLICY "admin_coordinador_all_entregas_guiadas" ON entregas_turno_guiadas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador'))
  );

-- Política para enfermeros: solo sus casos asignados
CREATE POLICY "enfermero_hallazgos" ON hallazgos_clinicos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM turnos t
      JOIN enfermeros e ON e.id = t.enfermero_id
      JOIN perfiles p ON p.enfermero_id = e.id
      WHERE t.caso_id = hallazgos_clinicos.caso_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "enfermero_pendientes" ON pendientes_caso
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM turnos t
      JOIN enfermeros e ON e.id = t.enfermero_id
      JOIN perfiles p ON p.enfermero_id = e.id
      WHERE t.caso_id = pendientes_caso.caso_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "enfermero_alertas" ON alertas_activas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM turnos t
      JOIN enfermeros e ON e.id = t.enfermero_id
      JOIN perfiles p ON p.enfermero_id = e.id
      WHERE t.caso_id = alertas_activas.caso_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "enfermero_vigilancias" ON vigilancias_especiales
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM turnos t
      JOIN enfermeros e ON e.id = t.enfermero_id
      JOIN perfiles p ON p.enfermero_id = e.id
      WHERE t.caso_id = vigilancias_especiales.caso_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "enfermero_entregas_guiadas" ON entregas_turno_guiadas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM turnos t
      JOIN enfermeros e ON e.id = t.enfermero_id
      JOIN perfiles p ON p.enfermero_id = e.id
      WHERE t.caso_id = entregas_turno_guiadas.caso_id AND p.id = auth.uid()
    )
  );
