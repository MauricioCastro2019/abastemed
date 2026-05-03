-- ============================================================
-- MIGRACIÓN: agrega valor 'servicio' al enum categoria_insumo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TYPE categoria_insumo ADD VALUE IF NOT EXISTS 'servicio' BEFORE 'otro';
