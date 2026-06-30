-- ============================================================
-- MIGRACIÓN: Sistema de Equipo de Cuidado
-- Relación muchos-a-muchos entre pacientes y enfermeros,
-- independiente de las guardias (turnos/casos).
-- Ejecutar en Supabase SQL Editor (idempotente)
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE rol_equipo AS ENUM (
    'titular',
    'habitual',
    'suplente',
    'coordinador',
    'apoyo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_asignacion AS ENUM (
    'pendiente',
    'activa',
    'pausada',
    'finalizada',
    'rechazada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE horario_equipo AS ENUM (
    'matutino',
    'vespertino',
    'nocturno',
    'mixto',
    'sin_horario_fijo'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. TABLA EQUIPO_CUIDADO ─────────────────────────────────

CREATE TABLE IF NOT EXISTS equipo_cuidado (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id          UUID NOT NULL REFERENCES pacientes(id)  ON DELETE CASCADE,
  enfermero_id         UUID NOT NULL REFERENCES enfermeros(id) ON DELETE CASCADE,
  rol                  rol_equipo      NOT NULL DEFAULT 'habitual',
  estado               estado_asignacion NOT NULL DEFAULT 'activa',
  es_principal         BOOLEAN NOT NULL DEFAULT false,
  horario              horario_equipo  NOT NULL DEFAULT 'sin_horario_fijo',
  acceso_expediente    BOOLEAN NOT NULL DEFAULT true,
  fecha_inicio         DATE    NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin            DATE,
  motivo_asignacion    TEXT,
  motivo_finalizacion  TEXT,
  observaciones        TEXT,
  asignado_por         UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  aceptado_en          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_equipo_cuidado_paciente  ON equipo_cuidado(paciente_id);
CREATE INDEX IF NOT EXISTS idx_equipo_cuidado_enfermero ON equipo_cuidado(enfermero_id);
CREATE INDEX IF NOT EXISTS idx_equipo_cuidado_estado    ON equipo_cuidado(estado);

-- Índice único parcial: evita asignaciones activas duplicadas para el mismo par.
-- Se permite tener historial (múltiples filas finalizadas/rechazadas para el mismo par).
CREATE UNIQUE INDEX IF NOT EXISTS uq_equipo_cuidado_activo
  ON equipo_cuidado(paciente_id, enfermero_id)
  WHERE estado NOT IN ('finalizada', 'rechazada');

-- ── 3. TABLA NOTIFICACIONES ─────────────────────────────────

CREATE TABLE IF NOT EXISTS notificaciones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id  UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  cuerpo     TEXT NOT NULL,
  leida      BOOLEAN NOT NULL DEFAULT false,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_perfil_leida
  ON notificaciones(perfil_id, leida);

-- ── 4. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE equipo_cuidado ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones  ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────
-- EQUIPO_CUIDADO: políticas
-- ────────────────────────────────────

-- Admin/superadmin: acceso total
DROP POLICY IF EXISTS "ec_admin_all" ON equipo_cuidado;
CREATE POLICY "ec_admin_all" ON equipo_cuidado
  FOR ALL TO authenticated
  USING (auth_rol() IN ('admin', 'superadmin'))
  WITH CHECK (auth_rol() IN ('admin', 'superadmin'));

-- Coordinador: acceso total a pacientes de sus casos
DROP POLICY IF EXISTS "ec_coordinador_all" ON equipo_cuidado;
CREATE POLICY "ec_coordinador_all" ON equipo_cuidado
  FOR ALL TO authenticated
  USING (
    auth_rol() = 'coordinador'
    AND coordinador_tiene_paciente(auth.uid(), equipo_cuidado.paciente_id)
  )
  WITH CHECK (
    auth_rol() = 'coordinador'
    AND coordinador_tiene_paciente(auth.uid(), equipo_cuidado.paciente_id)
  );

-- Enfermero: lectura de sus propias asignaciones
DROP POLICY IF EXISTS "ec_enfermero_read" ON equipo_cuidado;
CREATE POLICY "ec_enfermero_read" ON equipo_cuidado
  FOR SELECT TO authenticated
  USING (
    auth_rol() = 'enfermero'
    AND enfermero_id IN (
      SELECT e.id FROM enfermeros e
      INNER JOIN perfiles p ON p.enfermero_id = e.id
      WHERE p.id = auth.uid()
    )
  );

-- Enfermero: puede actualizar solo sus propias asignaciones pendientes (aceptar/rechazar)
DROP POLICY IF EXISTS "ec_enfermero_update" ON equipo_cuidado;
CREATE POLICY "ec_enfermero_update" ON equipo_cuidado
  FOR UPDATE TO authenticated
  USING (
    auth_rol() = 'enfermero'
    AND enfermero_id IN (
      SELECT e.id FROM enfermeros e
      INNER JOIN perfiles p ON p.enfermero_id = e.id
      WHERE p.id = auth.uid()
    )
    AND estado = 'pendiente'
  )
  WITH CHECK (
    auth_rol() = 'enfermero'
    AND enfermero_id IN (
      SELECT e.id FROM enfermeros e
      INNER JOIN perfiles p ON p.enfermero_id = e.id
      WHERE p.id = auth.uid()
    )
  );

-- ────────────────────────────────────
-- NOTIFICACIONES: políticas
-- ────────────────────────────────────

-- Cada usuario solo lee sus propias notificaciones
DROP POLICY IF EXISTS "notif_read_own" ON notificaciones;
CREATE POLICY "notif_read_own" ON notificaciones
  FOR SELECT TO authenticated
  USING (perfil_id = auth.uid());

-- Admin/coordinador pueden insertar notificaciones para cualquier usuario
DROP POLICY IF EXISTS "notif_insert_staff" ON notificaciones;
CREATE POLICY "notif_insert_staff" ON notificaciones
  FOR INSERT TO authenticated
  WITH CHECK (auth_rol() IN ('admin', 'superadmin', 'coordinador'));

-- Cada usuario puede marcar las suyas como leídas
DROP POLICY IF EXISTS "notif_update_own" ON notificaciones;
CREATE POLICY "notif_update_own" ON notificaciones
  FOR UPDATE TO authenticated
  USING (perfil_id = auth.uid())
  WITH CHECK (perfil_id = auth.uid());

-- ── 5. FUNCIÓN: updated_at automático ────────────────────────

CREATE OR REPLACE FUNCTION update_equipo_cuidado_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipo_cuidado_updated_at ON equipo_cuidado;
CREATE TRIGGER trg_equipo_cuidado_updated_at
  BEFORE UPDATE ON equipo_cuidado
  FOR EACH ROW EXECUTE FUNCTION update_equipo_cuidado_updated_at();

-- ── 6. FUNCIÓN: un solo titular por paciente ─────────────────
-- Cuando se marca es_principal = true, desmarca a los demás del mismo paciente.

CREATE OR REPLACE FUNCTION enforce_single_principal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.es_principal = true THEN
    UPDATE equipo_cuidado
    SET es_principal = false
    WHERE paciente_id = NEW.paciente_id
      AND id <> NEW.id
      AND es_principal = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_single_principal ON equipo_cuidado;
CREATE TRIGGER trg_single_principal
  AFTER INSERT OR UPDATE OF es_principal ON equipo_cuidado
  FOR EACH ROW
  WHEN (NEW.es_principal = true)
  EXECUTE FUNCTION enforce_single_principal();

-- ============================================================
-- FIN MIGRACIÓN: equipo_cuidado
-- ============================================================
