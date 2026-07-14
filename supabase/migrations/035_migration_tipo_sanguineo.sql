-- ============================================================
-- MIGRACIÓN: Tipo sanguíneo del paciente
--
-- Agrega el tipo sanguíneo como dato clínico del paciente.
-- Nullable: los pacientes existentes quedan sin valor hasta que
-- se capture (se refleja como "falta capturar" en el dashboard).
--
-- Ejecutar en Supabase SQL Editor (idempotente).
-- ============================================================

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS tipo_sanguineo TEXT;

ALTER TABLE pacientes
  DROP CONSTRAINT IF EXISTS pacientes_tipo_sanguineo_check;

ALTER TABLE pacientes
  ADD CONSTRAINT pacientes_tipo_sanguineo_check
  CHECK (tipo_sanguineo IS NULL OR tipo_sanguineo IN (
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  ));

-- ============================================================
-- FIN MIGRACIÓN: tipo_sanguineo
-- ============================================================
