-- ============================================================
-- MIGRACIÓN FASE 1 — PARTE 1 de 2
-- Ejecutar PRIMERO. Esperar que termine, luego ejecutar Parte 2.
--
-- Por qué dos partes: PostgreSQL no permite usar nuevos valores
-- de ENUM en la misma transacción en que se agregan.
-- ============================================================

ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'coordinador';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'administrativo';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'auditor';
