-- ============================================================
-- MIGRACIÓN: NAI — Núcleo de Atención Integral (Fase 1)
--
-- Motor unificado de Plan de Atención + Acciones.
-- Sustituye el kardex de medicamentos y el plan de cuidado
-- fragmentado por un único modelo coherente.
--
-- Nuevas tablas:
--   planes_atencion    — contrato de cuidado del paciente
--   plan_items         — prescripciones del plan (qué debe hacerse)
--   acciones           — instancias de ejecución (qué ocurrió)
--   evidencias_accion  — evidencia adjunta por acción
--
-- Nueva vista:
--   v_nai_timeline     — línea de vida unificada del paciente
--
-- Las tablas kardex_medicamentos, administraciones_medicamento,
-- indicaciones y eventos_indicacion quedan OBSOLETAS (no se
-- eliminan para preservar historial).
--
-- Ejecutar en Supabase SQL Editor (idempotente).
-- ============================================================


-- ── 1. ENUMs ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE tipo_plan_item AS ENUM (
    'medicamento',
    'rutina',
    'monitoreo',
    'procedimiento',
    'nutricion',
    'eliminacion',
    'movilidad',
    'comunicacion'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE frecuencia_plan AS ENUM (
    'unica',
    'diaria',
    'bid',             -- 2 veces al día
    'tid',             -- 3 veces al día
    'qid',             -- 4 veces al día
    'cada_4h',
    'cada_6h',
    'cada_8h',
    'cada_12h',
    'semanal',
    'segun_necesidad', -- no genera acciones automáticas
    'personalizada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_plan_atencion AS ENUM (
    'borrador',
    'activo',
    'suspendido',
    'archivado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prioridad_accion AS ENUM (
    'critica',
    'urgente',
    'alta',
    'normal',
    'baja'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_accion AS ENUM (
    'pendiente',
    'proxima',
    'en_proceso',
    'realizada',
    'omitida',
    'rechazada',
    'verificada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_evidencia_accion AS ENUM (
    'foto',
    'video',
    'audio',
    'pdf',
    'nota',
    'firma'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2. planes_atencion ──────────────────────────────────────
-- El contrato vivo de cuidado de un paciente.
-- Solo puede haber un plan ACTIVO por paciente.
-- Los planes nunca se eliminan — se archivan.

CREATE TABLE IF NOT EXISTS planes_atencion (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id     UUID        NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  caso_id         UUID        REFERENCES casos(id) ON DELETE SET NULL,
  organization_id UUID        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  version         INTEGER     NOT NULL DEFAULT 1,
  estado          estado_plan_atencion NOT NULL DEFAULT 'borrador',
  nombre          TEXT,
  notas_generales TEXT,
  created_by      UUID        REFERENCES perfiles(id) ON DELETE SET NULL,
  activated_at    TIMESTAMPTZ,
  suspended_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 3. plan_items ───────────────────────────────────────────
-- Prescripciones del plan: lo que DEBE hacerse, cuándo y cómo.
-- Cada item activo genera acciones al inicio del turno.
--
-- El campo `configuracion` JSONB contiene campos específicos por tipo:
--   medicamento  → { nombre, presentacion, dosis, via, medico, indicacion, existencia_domicilio }
--   monitoreo    → { parametros: ['ta','fc','spo2','temperatura','glucosa','peso'], instrucciones }
--   procedimiento→ { tipo_procedimiento, checklist: string[], requiere_competencia_id }
--   rutina       → { subtipo: 'bano_completo'|'higiene_bucal'|'cambio_posicion'|..., nivel_asistencia }
--   nutricion    → { tipo_dieta, consistencia, observaciones_alimentacion }
--   eliminacion  → { tipo: 'sonda'|'diuresis'|'evacuacion', instrucciones }
--   movilidad    → { tipo: 'cambio_posicion'|'marcha'|'traslado', frecuencia_posicion_min }
--   comunicacion → { destinatario: 'familia'|'medico'|'coordinacion', template }

CREATE TABLE IF NOT EXISTS plan_items (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id            UUID        NOT NULL REFERENCES planes_atencion(id) ON DELETE CASCADE,
  tipo               tipo_plan_item NOT NULL,
  nombre             TEXT        NOT NULL,
  descripcion        TEXT,
  frecuencia         frecuencia_plan NOT NULL DEFAULT 'diaria',
  horarios           TIME[]      NOT NULL DEFAULT '{}',
  configuracion      JSONB       NOT NULL DEFAULT '{}',
  prioridad          prioridad_accion NOT NULL DEFAULT 'normal',
  requiere_evidencia BOOLEAN     NOT NULL DEFAULT false,
  activo             BOOLEAN     NOT NULL DEFAULT true,
  orden              INTEGER     NOT NULL DEFAULT 0,
  inicio_en          DATE,
  fin_en             DATE,
  creado_por         UUID        REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 4. acciones ─────────────────────────────────────────────
-- Instancias de ejecución: lo que OCURRIÓ (o debe ocurrir).
-- Se generan automáticamente al inicio del turno desde plan_items.
-- También pueden crearse manualmente (acción espontánea sin plan_item).
--
-- El campo `datos` JSONB almacena lo ejecutado (específico por tipo):
--   medicamento  → { administrado, dosis_real, hora_real, via_real, motivo_omision }
--   monitoreo    → { ta_sistolica, ta_diastolica, fc, spo2, temperatura, glucosa, peso, dolor_eva }
--   procedimiento→ { items_completados: string[], dificultades, notificado_a }
--   rutina       → { completado, nivel_asistencia_real, observaciones_piel }
--   nutricion    → { porcentaje_ingesta, tipo_dieta_real, nausea, vomito, dificultad_deglucion }
--   eliminacion  → { vol_orina_ml, color_orina, evacuacion, consistencia }
--   movilidad    → { posicion_inicial, posicion_final, tolerancia, caida_ocurrida }
--   comunicacion → { destinatario, mensaje_enviado, respuesta_recibida }

CREATE TABLE IF NOT EXISTS acciones (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_item_id      UUID        REFERENCES plan_items(id) ON DELETE SET NULL,
  paciente_id       UUID        NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
  caso_id           UUID        REFERENCES casos(id) ON DELETE SET NULL,
  turno_id          UUID        REFERENCES turnos(id) ON DELETE SET NULL,
  organization_id   UUID        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  tipo              tipo_plan_item NOT NULL,
  nombre            TEXT        NOT NULL,
  estado            estado_accion NOT NULL DEFAULT 'pendiente',
  prioridad         prioridad_accion NOT NULL DEFAULT 'normal',
  programada_para   TIMESTAMPTZ,
  iniciada_en       TIMESTAMPTZ,
  completada_en     TIMESTAMPTZ,
  responsable_id    UUID        REFERENCES perfiles(id) ON DELETE SET NULL,
  verificada_por    UUID        REFERENCES perfiles(id) ON DELETE SET NULL,
  verificada_en     TIMESTAMPTZ,
  datos             JSONB       NOT NULL DEFAULT '{}',
  observaciones     TEXT,
  requiere_followup BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 5. evidencias_accion ────────────────────────────────────

CREATE TABLE IF NOT EXISTS evidencias_accion (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  accion_id   UUID        NOT NULL REFERENCES acciones(id) ON DELETE CASCADE,
  tipo        tipo_evidencia_accion NOT NULL DEFAULT 'nota',
  url         TEXT,
  descripcion TEXT,
  subido_por  UUID        REFERENCES perfiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 6. ÍNDICES ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_planes_paciente    ON planes_atencion(paciente_id);
CREATE INDEX IF NOT EXISTS idx_planes_caso        ON planes_atencion(caso_id);
CREATE INDEX IF NOT EXISTS idx_planes_estado      ON planes_atencion(estado);
CREATE INDEX IF NOT EXISTS idx_planes_org         ON planes_atencion(organization_id);

CREATE INDEX IF NOT EXISTS idx_plan_items_plan    ON plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_items_tipo    ON plan_items(tipo);
CREATE INDEX IF NOT EXISTS idx_plan_items_activo  ON plan_items(activo);

CREATE INDEX IF NOT EXISTS idx_acciones_paciente  ON acciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_acciones_turno     ON acciones(turno_id);
CREATE INDEX IF NOT EXISTS idx_acciones_plan_item ON acciones(plan_item_id);
CREATE INDEX IF NOT EXISTS idx_acciones_estado    ON acciones(estado);
CREATE INDEX IF NOT EXISTS idx_acciones_fecha     ON acciones(paciente_id, programada_para DESC);
CREATE INDEX IF NOT EXISTS idx_acciones_tipo      ON acciones(tipo);

CREATE INDEX IF NOT EXISTS idx_evidencias_accion  ON evidencias_accion(accion_id);


-- ── 7. RLS ──────────────────────────────────────────────────

ALTER TABLE planes_atencion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE acciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidencias_accion ENABLE ROW LEVEL SECURITY;

-- planes_atencion
DO $$ BEGIN
  CREATE POLICY "nai_planes_select" ON planes_atencion
    FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nai_planes_insert" ON planes_atencion
    FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nai_planes_update" ON planes_atencion
    FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- plan_items
DO $$ BEGIN
  CREATE POLICY "nai_items_select" ON plan_items
    FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nai_items_insert" ON plan_items
    FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nai_items_update" ON plan_items
    FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- acciones
DO $$ BEGIN
  CREATE POLICY "nai_acciones_select" ON acciones
    FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nai_acciones_insert" ON acciones
    FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador', 'enfermero'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nai_acciones_update" ON acciones
    FOR UPDATE USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- evidencias_accion
DO $$ BEGIN
  CREATE POLICY "nai_evidencias_select" ON evidencias_accion
    FOR SELECT USING (auth_rol() IN ('admin', 'coordinador', 'enfermero'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nai_evidencias_insert" ON evidencias_accion
    FOR INSERT WITH CHECK (auth_rol() IN ('admin', 'coordinador', 'enfermero'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 8. VISTA: v_nai_timeline ────────────────────────────────
-- Línea de vida unificada del paciente.
-- Agrega acciones NAI + incidencias + hallazgos + entregas de turno.
-- Keyed por paciente_id para el hub NAI.

CREATE OR REPLACE VIEW v_nai_timeline AS

  -- Acciones NAI (motor principal del cuidado)
  SELECT
    a.paciente_id,
    COALESCE(a.completada_en, a.programada_para, a.created_at) AS evento_at,
    'accion'         AS tipo_evento,
    a.id             AS origen_id,
    a.tipo::TEXT     AS subtipo,
    a.nombre         AS texto,
    a.prioridad::TEXT AS nivel,
    a.estado::TEXT   AS estado,
    a.observaciones
  FROM acciones a

  UNION ALL

  -- Incidencias (módulo control pacientes)
  SELECT
    c.paciente_id,
    i.fecha_hora     AS evento_at,
    'incidencia'     AS tipo_evento,
    i.id             AS origen_id,
    i.tipo::TEXT     AS subtipo,
    i.descripcion    AS texto,
    i.gravedad::TEXT AS nivel,
    i.gravedad::TEXT AS estado,
    i.intervencion   AS observaciones
  FROM incidencias i
  JOIN casos c ON c.id = i.caso_id

  UNION ALL

  -- Hallazgos clínicos (memoria operativa)
  SELECT
    c.paciente_id,
    hc.created_at      AS evento_at,
    'hallazgo'         AS tipo_evento,
    hc.id              AS origen_id,
    hc.categoria::TEXT AS subtipo,
    hc.descripcion     AS texto,
    hc.severidad::TEXT AS nivel,
    hc.estado::TEXT    AS estado,
    NULL               AS observaciones
  FROM hallazgos_clinicos hc
  JOIN casos c ON c.id = hc.caso_id

  UNION ALL

  -- Entregas de turno guiadas
  SELECT
    c.paciente_id,
    et.created_at              AS evento_at,
    'entrega_turno'            AS tipo_evento,
    et.id                      AS origen_id,
    et.estado_paciente::TEXT   AS subtipo,
    COALESCE(et.resumen_turno, 'Entrega de turno registrada') AS texto,
    et.estado_paciente::TEXT   AS nivel,
    et.estado_paciente::TEXT   AS estado,
    et.cambios_relevantes      AS observaciones
  FROM entregas_turno_guiadas et
  JOIN casos c ON c.id = et.caso_id;

-- ── 9. TRIGGER: updated_at automático ───────────────────────

CREATE OR REPLACE FUNCTION nai_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_planes_updated_at
    BEFORE UPDATE ON planes_atencion
    FOR EACH ROW EXECUTE FUNCTION nai_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_plan_items_updated_at
    BEFORE UPDATE ON plan_items
    FOR EACH ROW EXECUTE FUNCTION nai_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_acciones_updated_at
    BEFORE UPDATE ON acciones
    FOR EACH ROW EXECUTE FUNCTION nai_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- FIN MIGRACIÓN: nai_fase1
-- ============================================================
