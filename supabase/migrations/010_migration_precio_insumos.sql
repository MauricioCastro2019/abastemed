-- ============================================================
-- ABASTEMED — Agregar columna precio a insumos_catalogo
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

ALTER TABLE insumos_catalogo
  ADD COLUMN IF NOT EXISTS precio NUMERIC(10, 2);

-- Backfill: calcular precio = costo * 1.35 para registros existentes
UPDATE insumos_catalogo
SET precio = ROUND(costo * 1.35, 2)
WHERE precio IS NULL AND costo > 0;
