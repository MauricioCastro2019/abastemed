-- ============================================================
-- COMPETENCIAS ESPECIALIZADAS + GATE DE ASIGNACIÓN
-- Extiende el Centro Profesional (027) con:
--   • Ciclo de vida de competencia (vigente/caducada/revocada)
--   • Otorgamiento manual auditable y revocación con motivo
--   • Requisitos de competencia por paciente
--   • Publicación controlada de competencias (firma clínica)
--
-- No crea tablas nuevas de "competencias" ni "capacitaciones":
-- extiende `competencias`, `enfermero_competencias` y
-- `modulos_capacitacion` ya existentes (027). No refactoriza
-- nada del motor de aprobación actual.
--
-- Ejecutar en Supabase SQL Editor (idempotente).
-- ============================================================

-- ── 1. EXTENSIÓN DE `competencias` ───────────────────────────

ALTER TABLE competencias
  ADD COLUMN IF NOT EXISTS codigo             TEXT,
  ADD COLUMN IF NOT EXISTS vigencia_meses     INT,
  ADD COLUMN IF NOT EXISTS version            INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS firmada_por        TEXT,
  ADD COLUMN IF NOT EXISTS cedula_responsable TEXT,
  ADD COLUMN IF NOT EXISTS fecha_firma        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notas              TEXT;

-- Unicidad de `codigo` (nullable — las competencias existentes
-- del seed de 027 no tienen código y eso es válido: NULL no
-- colisiona consigo mismo en una constraint UNIQUE de Postgres).
DO $$ BEGIN
  ALTER TABLE competencias ADD CONSTRAINT competencias_codigo_key UNIQUE (codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. EXTENSIÓN DE `modulos_capacitacion` ───────────────────
-- Umbral de aprobación configurable por módulo. Default 70
-- preserva el comportamiento exacto de los 8 módulos existentes.

ALTER TABLE modulos_capacitacion
  ADD COLUMN IF NOT EXISTS evaluacion_minima INT NOT NULL DEFAULT 70;

-- ── 3. EXTENSIÓN DE `enfermero_competencias` ─────────────────
-- Ciclo de vida de la competencia otorgada, independiente del
-- progreso de aprendizaje (columna `estado` ya existente).

ALTER TABLE enfermero_competencias
  ADD COLUMN IF NOT EXISTS origen            TEXT NOT NULL DEFAULT 'curso',
  ADD COLUMN IF NOT EXISTS modulo_id_origen  UUID REFERENCES modulos_capacitacion(id),
  ADD COLUMN IF NOT EXISTS fecha_otorgada    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_caducidad   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estado_vigencia   TEXT NOT NULL DEFAULT 'vigente',
  ADD COLUMN IF NOT EXISTS certificado_url   TEXT,
  ADD COLUMN IF NOT EXISTS otorgada_por      UUID REFERENCES perfiles(id),
  ADD COLUMN IF NOT EXISTS justificacion     TEXT,
  ADD COLUMN IF NOT EXISTS version_otorgada  INT;

DO $$ BEGIN
  ALTER TABLE enfermero_competencias
    ADD CONSTRAINT enfermero_competencias_origen_check
    CHECK (origen IN ('curso', 'manual', 'externa'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE enfermero_competencias
    ADD CONSTRAINT enfermero_competencias_estado_vigencia_check
    CHECK (estado_vigencia IN ('vigente', 'caducada', 'revocada'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE enfermero_competencias
    ADD CONSTRAINT enfermero_competencias_justificacion_manual_check
    CHECK (origen != 'manual' OR justificacion IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. HISTÓRICO DE REVOCACIONES ─────────────────────────────

CREATE TABLE IF NOT EXISTS competencia_revocaciones (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfermero_competencia_id  UUID NOT NULL REFERENCES enfermero_competencias(id) ON DELETE CASCADE,
  revocada_por              UUID REFERENCES perfiles(id),
  fecha                     TIMESTAMPTZ DEFAULT NOW(),
  motivo                    TEXT NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. COMPETENCIAS REQUERIDAS POR PACIENTE ──────────────────

CREATE TABLE IF NOT EXISTS paciente_competencias_requeridas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id     UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  competencia_id  UUID NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  agregado_por    UUID REFERENCES perfiles(id),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paciente_id, competencia_id)
);

-- ── 6. ÍNDICES ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_enfermero_competencias_enfermero_vigencia
  ON enfermero_competencias(enfermero_id, estado_vigencia);

CREATE INDEX IF NOT EXISTS idx_enfermero_competencias_competencia_vigencia
  ON enfermero_competencias(competencia_id, estado_vigencia);

CREATE INDEX IF NOT EXISTS idx_enfermero_competencias_fecha_caducidad
  ON enfermero_competencias(fecha_caducidad);

CREATE INDEX IF NOT EXISTS idx_paciente_competencias_requeridas_paciente
  ON paciente_competencias_requeridas(paciente_id);

CREATE INDEX IF NOT EXISTS idx_paciente_competencias_requeridas_competencia
  ON paciente_competencias_requeridas(competencia_id);

CREATE INDEX IF NOT EXISTS idx_competencia_revocaciones_enfermero_competencia
  ON competencia_revocaciones(enfermero_competencia_id);

-- ── 7. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE competencia_revocaciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE paciente_competencias_requeridas   ENABLE ROW LEVEL SECURITY;

-- paciente_competencias_requeridas: roles internos leen (sin
-- familiar — es información de staffing clínico interno), solo
-- admin/coordinador/superadmin escriben.
DROP POLICY IF EXISTS "pcr_read" ON paciente_competencias_requeridas;
CREATE POLICY "pcr_read" ON paciente_competencias_requeridas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid()
        AND rol IN ('admin', 'superadmin', 'coordinador', 'enfermero', 'administrativo', 'auditor')
    )
  );

DROP POLICY IF EXISTS "pcr_admin_write" ON paciente_competencias_requeridas;
CREATE POLICY "pcr_admin_write" ON paciente_competencias_requeridas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador')));

-- competencia_revocaciones: admin/coord/superadmin leen y
-- escriben todo; el enfermero afectado puede leer las suyas.
DROP POLICY IF EXISTS "cr_read" ON competencia_revocaciones;
CREATE POLICY "cr_read" ON competencia_revocaciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador'))
    OR EXISTS (
      SELECT 1 FROM enfermero_competencias ec
      JOIN perfiles p ON p.enfermero_id = ec.enfermero_id
      WHERE ec.id = competencia_revocaciones.enfermero_competencia_id
        AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cr_admin_write" ON competencia_revocaciones;
CREATE POLICY "cr_admin_write" ON competencia_revocaciones
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador')));

-- ── 8. FIX RLS 027: coordinador puede gestionar competencias ──
-- Las policies originales de 027 solo permitían admin/superadmin
-- escribir en `competencias` y `modulos_capacitacion`. Coordinación
-- también debe poder gestionar competencias especializadas.

DROP POLICY IF EXISTS "competencias_admin_write" ON competencias;
CREATE POLICY "competencias_admin_write" ON competencias
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador')));

DROP POLICY IF EXISTS "mc_admin_write" ON modulos_capacitacion;
CREATE POLICY "mc_admin_write" ON modulos_capacitacion
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin', 'superadmin', 'coordinador')));

-- ============================================================
-- FIN MIGRACIÓN: competencias_especializadas
-- ============================================================
