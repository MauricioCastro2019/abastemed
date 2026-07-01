-- ============================================================
-- ABASTEMED — Reset del entorno demo
-- Ejecutar ANTES de volver a correr supabase/seeds/seed_demo.sql
-- Cada DELETE está en su propio bloque para que si una tabla
-- no existe (o ya fue vaciada), el error se ignore y continúe.
-- ============================================================

-- Tablas hijas primero (referenciadas por caso_id / turno_id)
DO $$ BEGIN DELETE FROM entregas_turno_guiadas WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM vigilancias_especiales  WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM alertas_activas         WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM pendientes_caso         WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM hallazgos_clinicos      WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM incidencias             WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DELETE FROM administraciones_medicamento
    WHERE kardex_id IN (
      SELECT id FROM kardex_medicamentos
      WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN DELETE FROM reportes_turno   WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM cobranza_items   WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM kardex_medicamentos WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM indicaciones     WHERE paciente_id = 'dddddddd-0000-0000-0002-000000000030'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- entregas_turno referencia turnos con ON DELETE RESTRICT — borrar primero
DO $$ BEGIN
  DELETE FROM entregas_turno
    WHERE turno_saliente_id IN (
      SELECT id FROM turnos WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid
    );
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN DELETE FROM turnos           WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM familiar_paciente WHERE paciente_id = 'dddddddd-0000-0000-0002-000000000030'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM casos            WHERE id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM pacientes        WHERE id = 'dddddddd-0000-0000-0002-000000000030'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Perfiles y enfermeros
DO $$ BEGIN
  DELETE FROM perfiles WHERE id = ANY(ARRAY[
    'dddddddd-0000-0000-0000-000000000010',
    'dddddddd-0000-0000-0000-000000000011',
    'dddddddd-0000-0000-0000-000000000012',
    'dddddddd-0000-0000-0000-000000000013',
    'dddddddd-0000-0000-0000-000000000014'
  ]::uuid[]);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DELETE FROM enfermeros WHERE id = ANY(ARRAY[
    'dddddddd-0000-0000-0001-000000000021',
    'dddddddd-0000-0000-0001-000000000022',
    'dddddddd-0000-0000-0001-000000000023'
  ]::uuid[]);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Auth (requiere acceso postgres)
DO $$ BEGIN
  DELETE FROM auth.identities WHERE user_id = ANY(ARRAY[
    'dddddddd-0000-0000-0000-000000000010',
    'dddddddd-0000-0000-0000-000000000011',
    'dddddddd-0000-0000-0000-000000000012',
    'dddddddd-0000-0000-0000-000000000013',
    'dddddddd-0000-0000-0000-000000000014'
  ]::uuid[]);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DELETE FROM auth.users WHERE id = ANY(ARRAY[
    'dddddddd-0000-0000-0000-000000000010',
    'dddddddd-0000-0000-0000-000000000011',
    'dddddddd-0000-0000-0000-000000000012',
    'dddddddd-0000-0000-0000-000000000013',
    'dddddddd-0000-0000-0000-000000000014'
  ]::uuid[]);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Finanzas
DO $$ BEGIN DELETE FROM financial_incomes  WHERE organization_id = 'dddddddd-0000-0000-0000-000000000002'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM financial_expenses WHERE organization_id = 'dddddddd-0000-0000-0000-000000000002'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM recibos            WHERE organization_id = 'dddddddd-0000-0000-0000-000000000002'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Organización demo
DO $$ BEGIN DELETE FROM organizations WHERE id = 'dddddddd-0000-0000-0000-000000000002'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  RAISE NOTICE '✓ Reset demo completado. Ahora corre supabase/seeds/seed_demo.sql.';
END $$;
