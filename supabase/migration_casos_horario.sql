-- ============================================================
-- MIGRACIÓN: horario de atención y modelo costo-por-guardia en casos
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Nuevos campos en casos
ALTER TABLE casos ADD COLUMN IF NOT EXISTS costo_guardia   NUMERIC(10,2);
ALTER TABLE casos ADD COLUMN IF NOT EXISTS horas_turno     INTEGER DEFAULT 8;
ALTER TABLE casos ADD COLUMN IF NOT EXISTS dias_semana     TEXT[]  DEFAULT '{}';
ALTER TABLE casos ADD COLUMN IF NOT EXISTS horario_inicio  TEXT;
ALTER TABLE casos ADD COLUMN IF NOT EXISTS horario_fin     TEXT;

-- Backfill: estimar costo_guardia = tarifa_hora * horas_turno (asumiendo 8h)
UPDATE casos
SET costo_guardia = ROUND(tarifa_hora * 8, 2),
    horas_turno   = 8
WHERE costo_guardia IS NULL AND tarifa_hora > 0;
