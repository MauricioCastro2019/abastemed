-- ============================================================
-- MIGRACIÓN: Flujo Obligatorio Prelevantamiento → Levantamiento
-- Fecha: 2026-06-16
-- Descripción:
--   1. Agrega columnas de trazabilidad y FK a levantamientos_paciente
--   2. Crea índices para las nuevas columnas
--   3. Marca levantamientos existentes como históricos (migracion_historica)
-- Revertir: ver sección ROLLBACK al final
-- ============================================================

-- ── 1. COLUMNAS DE TRAZABILIDAD ──────────────────────────────

ALTER TABLE public.levantamientos_paciente
  -- Origen y FKs al flujo de prospecto
  ADD COLUMN IF NOT EXISTS prospect_id            UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preassessment_id       UUID REFERENCES public.patient_preassessments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cotizacion_id          UUID REFERENCES public.care_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resultado_evaluacion_id UUID REFERENCES public.assessment_results(id) ON DELETE SET NULL,

  -- Clasificación del origen del levantamiento
  ADD COLUMN IF NOT EXISTS levantamiento_origen   TEXT NOT NULL DEFAULT 'migracion_historica',

  -- Scores comparativos (prelevantamiento vs levantamiento presencial)
  ADD COLUMN IF NOT EXISTS score_prelevantamiento INTEGER,
  ADD COLUMN IF NOT EXISTS score_levantamiento    INTEGER,

  -- Diferencias detectadas entre prelevantamiento y levantamiento
  ADD COLUMN IF NOT EXISTS diferencias_detectadas JSONB NOT NULL DEFAULT '[]',

  -- Flags de revisión requerida
  ADD COLUMN IF NOT EXISTS requiere_revision_comercial BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requiere_revision_clinica   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Datos heredados del prelevantamiento que aún no han sido validados presencialmente
  ADD COLUMN IF NOT EXISTS datos_heredados_pendientes BOOLEAN NOT NULL DEFAULT FALSE,

  -- Archivado / sustitución
  ADD COLUMN IF NOT EXISTS motivo_archivo         TEXT,
  ADD COLUMN IF NOT EXISTS archivado_por          UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archivado_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sustituido_por         UUID REFERENCES public.levantamientos_paciente(id) ON DELETE SET NULL,

  -- Ingreso urgente provisional
  ADD COLUMN IF NOT EXISTS urgencia_motivo        TEXT,
  ADD COLUMN IF NOT EXISTS urgencia_autorizado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS urgencia_fecha_limite  DATE,

  -- Costos diferenciados (histórico vs cotizado vs vigente)
  ADD COLUMN IF NOT EXISTS costo_historico        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS costo_cotizado         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS costo_vigente          NUMERIC(10,2);

-- ── 2. MARCAR REGISTROS EXISTENTES COMO HISTÓRICOS ───────────
-- Todos los levantamientos sin prospect_id son previos a esta migración.
-- Se conservan íntegramente pero se marcan como históricos no validados.

UPDATE public.levantamientos_paciente
SET
  levantamiento_origen       = 'migracion_historica',
  datos_heredados_pendientes = TRUE
WHERE prospect_id IS NULL;

-- ── 3. ÍNDICES ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lev_prospect_id    ON public.levantamientos_paciente(prospect_id);
CREATE INDEX IF NOT EXISTS idx_lev_origen         ON public.levantamientos_paciente(levantamiento_origen);
CREATE INDEX IF NOT EXISTS idx_lev_cotizacion_id  ON public.levantamientos_paciente(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_lev_archivado_at   ON public.levantamientos_paciente(archivado_at)
  WHERE archivado_at IS NOT NULL;

-- ── ROLLBACK ─────────────────────────────────────────────────
-- Para revertir esta migración ejecutar:
--
-- ALTER TABLE public.levantamientos_paciente
--   DROP COLUMN IF EXISTS prospect_id,
--   DROP COLUMN IF EXISTS preassessment_id,
--   DROP COLUMN IF EXISTS cotizacion_id,
--   DROP COLUMN IF EXISTS resultado_evaluacion_id,
--   DROP COLUMN IF EXISTS levantamiento_origen,
--   DROP COLUMN IF EXISTS score_prelevantamiento,
--   DROP COLUMN IF EXISTS score_levantamiento,
--   DROP COLUMN IF EXISTS diferencias_detectadas,
--   DROP COLUMN IF EXISTS requiere_revision_comercial,
--   DROP COLUMN IF EXISTS requiere_revision_clinica,
--   DROP COLUMN IF EXISTS datos_heredados_pendientes,
--   DROP COLUMN IF EXISTS motivo_archivo,
--   DROP COLUMN IF EXISTS archivado_por,
--   DROP COLUMN IF EXISTS archivado_at,
--   DROP COLUMN IF EXISTS sustituido_por,
--   DROP COLUMN IF EXISTS urgencia_motivo,
--   DROP COLUMN IF EXISTS urgencia_autorizado_por,
--   DROP COLUMN IF EXISTS urgencia_fecha_limite,
--   DROP COLUMN IF EXISTS costo_historico,
--   DROP COLUMN IF EXISTS costo_cotizado,
--   DROP COLUMN IF EXISTS costo_vigente;
--
-- DROP INDEX IF EXISTS idx_lev_prospect_id;
-- DROP INDEX IF EXISTS idx_lev_origen;
-- DROP INDEX IF EXISTS idx_lev_cotizacion_id;
-- DROP INDEX IF EXISTS idx_lev_archivado_at;
