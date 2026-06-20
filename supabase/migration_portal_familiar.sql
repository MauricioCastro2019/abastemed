-- ============================================================
-- MIGRACIÓN: Portal Familiar Integral
-- Ejecutar en Supabase SQL Editor (una sola vez, es idempotente)
-- Orden: ejecutar completo, no por partes
-- ============================================================

-- ============================================================
-- 1. EXTENDER TABLA perfiles (campos de familiar)
-- ============================================================

ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS parentesco             TEXT,
  ADD COLUMN IF NOT EXISTS telefono_whatsapp      TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_igual_tel     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS es_contacto_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS es_contacto_emergencia BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS es_responsable_pagos   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS activo_familiar        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS estado_invitacion      TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS fecha_invitacion       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultimo_acceso_familiar TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS direccion_familiar     TEXT,
  ADD COLUMN IF NOT EXISTS observaciones_familiar TEXT;

-- ============================================================
-- 2. TABLA familiar_paciente (relación M:M con permisos)
-- ============================================================

CREATE TABLE IF NOT EXISTS familiar_paciente (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familiar_id        UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  paciente_id        UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  paciente_principal BOOLEAN NOT NULL DEFAULT FALSE,
  parentesco         TEXT,
  permisos           JSONB NOT NULL DEFAULT '{
    "puede_ver_resumen_salud":         true,
    "puede_ver_reportes_resumidos":    true,
    "puede_ver_detalle_clinico":       false,
    "puede_ver_expediente":            false,
    "puede_ver_medicamentos":          true,
    "puede_ver_administraciones":      true,
    "puede_ver_existencia":            true,
    "puede_ver_agenda":                true,
    "puede_ver_citas":                 true,
    "puede_ver_estudios":              false,
    "puede_descargar_documentos":      false,
    "puede_ver_cobranza":              true,
    "puede_ver_recibos":               true,
    "puede_reportar_pagos":            false,
    "recibe_alertas":                  true,
    "recibe_resumen_semanal":          false,
    "puede_comunicarse":               true
  }'::jsonb,
  activo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(familiar_id, paciente_id)
);

-- ============================================================
-- 3. MIGRAR DATOS EXISTENTES perfiles.paciente_id → familiar_paciente
-- ============================================================

INSERT INTO familiar_paciente (familiar_id, paciente_id, paciente_principal, parentesco, activo, permisos)
SELECT
  p.id,
  p.paciente_id,
  TRUE,
  p.parentesco,
  TRUE,
  '{
    "puede_ver_resumen_salud":         true,
    "puede_ver_reportes_resumidos":    true,
    "puede_ver_detalle_clinico":       false,
    "puede_ver_expediente":            false,
    "puede_ver_medicamentos":          true,
    "puede_ver_administraciones":      true,
    "puede_ver_existencia":            true,
    "puede_ver_agenda":                true,
    "puede_ver_citas":                 true,
    "puede_ver_estudios":              false,
    "puede_descargar_documentos":      false,
    "puede_ver_cobranza":              true,
    "puede_ver_recibos":               true,
    "puede_reportar_pagos":            false,
    "recibe_alertas":                  true,
    "recibe_resumen_semanal":          false,
    "puede_comunicarse":               true
  }'::jsonb
FROM perfiles p
WHERE p.rol = 'familiar'
  AND p.paciente_id IS NOT NULL
ON CONFLICT (familiar_id, paciente_id) DO NOTHING;

-- ============================================================
-- 4. FUNCIÓN HELPER: verificar acceso familiar a paciente
-- ============================================================

CREATE OR REPLACE FUNCTION familiar_tiene_acceso_paciente(uid UUID, p_paciente_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM familiar_paciente fp
    WHERE fp.familiar_id = uid
      AND fp.paciente_id = p_paciente_id
      AND fp.activo = TRUE
  )
  OR EXISTS (
    SELECT 1 FROM perfiles p
    WHERE p.id = uid
      AND p.paciente_id = p_paciente_id
      AND p.rol = 'familiar'
  );
$$;

-- ============================================================
-- 5. RLS PARA familiar_paciente
-- ============================================================

ALTER TABLE familiar_paciente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fp_select" ON familiar_paciente;
CREATE POLICY "fp_select"
  ON familiar_paciente FOR SELECT
  USING (
    auth.uid() = familiar_id
    OR auth_rol() IN ('admin', 'jefe_enfermeros')
  );

DROP POLICY IF EXISTS "fp_insert" ON familiar_paciente;
CREATE POLICY "fp_insert"
  ON familiar_paciente FOR INSERT
  WITH CHECK (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "fp_update" ON familiar_paciente;
CREATE POLICY "fp_update"
  ON familiar_paciente FOR UPDATE
  USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "fp_delete" ON familiar_paciente;
CREATE POLICY "fp_delete"
  ON familiar_paciente FOR DELETE
  USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

-- ============================================================
-- 6. CAMPOS DE VISIBILIDAD EN reportes_turno
-- ============================================================

ALTER TABLE reportes_turno
  ADD COLUMN IF NOT EXISTS resumen_para_familia      TEXT,
  ADD COLUMN IF NOT EXISTS visible_para_familia      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS publicado_para_familia_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publicado_por             UUID REFERENCES perfiles(id);

-- Activar visibilidad en reportes ya existentes
-- (ya eran visibles vía entregas_turno, así que esto es seguro)
UPDATE reportes_turno
SET visible_para_familia = TRUE
WHERE visible_para_familia = FALSE
  OR visible_para_familia IS NULL;

-- RLS para reportes_turno — agregar acceso familiar
-- Primero verificar si ya existe una política con ese nombre
DROP POLICY IF EXISTS "reportes_turno_familiar_select" ON reportes_turno;
CREATE POLICY "reportes_turno_familiar_select"
  ON reportes_turno FOR SELECT
  USING (
    auth_rol() IN ('admin', 'jefe_enfermeros')
    OR (
      auth_rol() = 'enfermero'
      AND enfermero_id IN (
        SELECT e.id FROM enfermeros e
        JOIN perfiles p ON p.enfermero_id = e.id
        WHERE p.id = auth.uid()
      )
    )
    OR (
      auth_rol() = 'familiar'
      AND visible_para_familia = TRUE
      AND familiar_tiene_acceso_paciente(
        auth.uid(),
        (SELECT c.paciente_id FROM casos c WHERE c.id = caso_id LIMIT 1)
      )
    )
  );

-- ============================================================
-- 7. CAMPOS DE VISIBILIDAD EN incidencias
-- ============================================================

ALTER TABLE incidencias
  ADD COLUMN IF NOT EXISTS visible_para_familia      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS comunicado_a_familia_at   TIMESTAMPTZ;

-- No activamos incidencias existentes automáticamente (requiere revisión clínica)

-- RLS para incidencias — agregar acceso familiar
DROP POLICY IF EXISTS "incidencias_familiar_select" ON incidencias;
CREATE POLICY "incidencias_familiar_select"
  ON incidencias FOR SELECT
  USING (
    auth_rol() IN ('admin', 'jefe_enfermeros', 'enfermero')
    OR (
      auth_rol() = 'familiar'
      AND visible_para_familia = TRUE
      AND familiar_tiene_acceso_paciente(
        auth.uid(),
        (SELECT c.paciente_id FROM casos c WHERE c.id = caso_id LIMIT 1)
      )
    )
  );

-- ============================================================
-- 8. TABLA citas_medicas
-- ============================================================

CREATE TABLE IF NOT EXISTS citas_medicas (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id                     UUID REFERENCES casos(id) ON DELETE SET NULL,
  paciente_id                 UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_nombre               TEXT,
  especialidad                TEXT,
  medico_telefono             TEXT,
  fecha                       DATE NOT NULL,
  hora                        TIME,
  ubicacion                   TEXT,
  modalidad                   TEXT NOT NULL DEFAULT 'presencial',
  motivo                      TEXT,
  preparacion                 TEXT,
  responsable_acompanamiento  TEXT,
  estado                      TEXT NOT NULL DEFAULT 'programada',
  resultado                   TEXT,
  seguimiento                 TEXT,
  proxima_cita_sugerida       DATE,
  visible_para_familia        BOOLEAN NOT NULL DEFAULT TRUE,
  registrado_por              UUID REFERENCES perfiles(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE citas_medicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "citas_admin_all" ON citas_medicas;
CREATE POLICY "citas_admin_all"
  ON citas_medicas FOR ALL
  USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "citas_enfermero_select" ON citas_medicas;
CREATE POLICY "citas_enfermero_select"
  ON citas_medicas FOR SELECT
  USING (
    auth_rol() = 'enfermero'
    AND familiar_tiene_acceso_paciente(auth.uid(), paciente_id) -- reutiliza helper (enfermero tiene caso)
  );

DROP POLICY IF EXISTS "citas_familiar_select" ON citas_medicas;
CREATE POLICY "citas_familiar_select"
  ON citas_medicas FOR SELECT
  USING (
    auth_rol() = 'familiar'
    AND visible_para_familia = TRUE
    AND familiar_tiene_acceso_paciente(auth.uid(), paciente_id)
  );

-- ============================================================
-- 9. TABLA solicitudes_familia (contacto / mensajes)
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitudes_familia (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  familiar_id   UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  paciente_id   UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  tipo          TEXT NOT NULL DEFAULT 'otro',
  asunto        TEXT,
  mensaje       TEXT,
  estado        TEXT NOT NULL DEFAULT 'pendiente',
  atendido_por  UUID REFERENCES perfiles(id),
  atendido_at   TIMESTAMPTZ,
  respuesta     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE solicitudes_familia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sf_familiar_ops" ON solicitudes_familia;
CREATE POLICY "sf_familiar_ops"
  ON solicitudes_familia FOR SELECT
  USING (auth.uid() = familiar_id OR auth_rol() IN ('admin', 'jefe_enfermeros'));

DROP POLICY IF EXISTS "sf_familiar_insert" ON solicitudes_familia;
CREATE POLICY "sf_familiar_insert"
  ON solicitudes_familia FOR INSERT
  WITH CHECK (auth.uid() = familiar_id AND auth_rol() = 'familiar');

DROP POLICY IF EXISTS "sf_admin_update" ON solicitudes_familia;
CREATE POLICY "sf_admin_update"
  ON solicitudes_familia FOR UPDATE
  USING (auth_rol() IN ('admin', 'jefe_enfermeros'));

-- ============================================================
-- 10. ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_familiar_paciente_familiar_id ON familiar_paciente(familiar_id);
CREATE INDEX IF NOT EXISTS idx_familiar_paciente_paciente_id ON familiar_paciente(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_medicas_paciente_id     ON citas_medicas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_medicas_fecha           ON citas_medicas(fecha);
CREATE INDEX IF NOT EXISTS idx_solicitudes_familiar_id       ON solicitudes_familia(familiar_id);
CREATE INDEX IF NOT EXISTS idx_reportes_turno_visible        ON reportes_turno(caso_id, visible_para_familia);

-- ============================================================
-- ROLLBACK (ejecutar solo si necesitas deshacer):
-- DROP TABLE IF EXISTS solicitudes_familia;
-- DROP TABLE IF EXISTS citas_medicas;
-- DROP TABLE IF EXISTS familiar_paciente;
-- DROP FUNCTION IF EXISTS familiar_tiene_acceso_paciente(UUID, UUID);
-- ALTER TABLE perfiles DROP COLUMN IF EXISTS parentesco;
-- ALTER TABLE perfiles DROP COLUMN IF EXISTS telefono_whatsapp;
-- [etc.]
-- ============================================================
