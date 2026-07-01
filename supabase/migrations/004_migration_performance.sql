-- ============================================================
-- MIGRACIÓN: performance — índices faltantes
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- NOTA: auth_rol() ya retorna TEXT (aplicado en migration_jefe_enfermeros.sql).
--       No se modifica aquí porque DROP requeriría CASCADE sobre todas las policies.
-- ============================================================

-- ============================================================
-- 1. Extensión para búsqueda de texto (necesaria para índices trgm)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. Índices de rendimiento
-- ============================================================

-- Pacientes
CREATE INDEX IF NOT EXISTS idx_pacientes_status
  ON pacientes(status);

CREATE INDEX IF NOT EXISTS idx_pacientes_nombre_trgm
  ON pacientes USING gin (nombre gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pacientes_apellido_trgm
  ON pacientes USING gin (apellido gin_trgm_ops);

-- Enfermeros: partial index — solo indexa los disponibles
CREATE INDEX IF NOT EXISTS idx_enfermeros_disponible
  ON enfermeros(disponible) WHERE disponible = true;

CREATE INDEX IF NOT EXISTS idx_enfermeros_nombre_trgm
  ON enfermeros USING gin (nombre gin_trgm_ops);

-- Casos
CREATE INDEX IF NOT EXISTS idx_casos_status
  ON casos(status);

CREATE INDEX IF NOT EXISTS idx_casos_paciente_status
  ON casos(paciente_id, status);

CREATE INDEX IF NOT EXISTS idx_casos_titulo_trgm
  ON casos USING gin (titulo gin_trgm_ops);

-- Turnos
CREATE INDEX IF NOT EXISTS idx_turnos_status_fecha
  ON turnos(status, fecha_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_turnos_caso_status
  ON turnos(caso_id, status);

-- Cobranza
CREATE INDEX IF NOT EXISTS idx_cobranza_status_caso
  ON cobranza_items(status, caso_id);

-- Recibos
CREATE INDEX IF NOT EXISTS idx_recibos_fecha_emision
  ON recibos(fecha_emision DESC);

-- Entregas de turno
CREATE INDEX IF NOT EXISTS idx_entregas_turno_saliente
  ON entregas_turno(turno_saliente_id);

CREATE INDEX IF NOT EXISTS idx_entregas_created_at
  ON entregas_turno(created_at DESC);

-- Insumos usados
CREATE INDEX IF NOT EXISTS idx_insumos_usados_caso
  ON insumos_usados(caso_id);

-- Perfiles
CREATE INDEX IF NOT EXISTS idx_perfiles_rol
  ON perfiles(rol);
