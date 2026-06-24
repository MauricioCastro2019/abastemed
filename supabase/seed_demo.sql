-- ============================================================
-- ABASTEMED — Seed de Demostración
-- Caso ficticio: Elena Ramírez Torres, 78 años
-- Todos los datos son completamente ficticios.
--
-- EJECUTAR EN: Supabase SQL Editor (acceso superadmin/postgres)
-- IDEMPOTENTE: puede re-ejecutarse para resetear la demo
-- REQUIERE: pgcrypto (habilitado por defecto en Supabase)
--
-- UUIDs de referencia (todos comienzan con dddddddd-):
--   Org Demo:          dddddddd-0000-0000-0000-000000000002
--   Coordinadora:      dddddddd-0000-0000-0000-000000000010
--   Enfermera Andrea:  dddddddd-0000-0000-0000-000000000011 (auth) / dddddddd-0000-0000-0001-000000000021 (entity)
--   Enfermero Salvador:dddddddd-0000-0000-0000-000000000012 (auth) / dddddddd-0000-0000-0001-000000000022 (entity)
--   Enfermera Fernanda:dddddddd-0000-0000-0000-000000000013 (auth) / dddddddd-0000-0000-0001-000000000023 (entity)
--   Familiar Laura:    dddddddd-0000-0000-0000-000000000014
--   Paciente Elena:    dddddddd-0000-0000-0002-000000000030
--   Caso:              dddddddd-0000-0000-0003-000000000040
-- ============================================================

-- ============================================================
-- PASO 0: LIMPIEZA PREVIA (orden inverso de dependencias)
-- Cada tabla en su propio bloque: si falla una, las demás siguen.
-- Solo elimina registros demo, no toca datos de producción.
-- ============================================================
DO $$ BEGIN DELETE FROM entregas_turno_guiadas WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM vigilancias_especiales  WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM alertas_activas         WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM pendientes_caso         WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM hallazgos_clinicos      WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM incidencias             WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DELETE FROM administraciones_medicamento
    WHERE kardex_id IN (SELECT id FROM kardex_medicamentos WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM reportes_turno   WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM cobranza_items   WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM kardex_medicamentos WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM indicaciones     WHERE paciente_id = 'dddddddd-0000-0000-0002-000000000030'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  DELETE FROM entregas_turno
    WHERE turno_saliente_id IN (SELECT id FROM turnos WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040'::uuid);
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM turnos           WHERE caso_id   = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM familiar_paciente WHERE paciente_id = 'dddddddd-0000-0000-0002-000000000030'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM financial_incomes  WHERE organization_id = 'dddddddd-0000-0000-0000-000000000002'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM financial_expenses WHERE organization_id = 'dddddddd-0000-0000-0000-000000000002'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM recibos            WHERE organization_id = 'dddddddd-0000-0000-0000-000000000002'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM casos            WHERE id = 'dddddddd-0000-0000-0003-000000000040'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DELETE FROM pacientes        WHERE id = 'dddddddd-0000-0000-0002-000000000030'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;
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
DO $$ BEGIN DELETE FROM organizations WHERE id = 'dddddddd-0000-0000-0000-000000000002'::uuid; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- PASO 1: ORGANIZACIÓN DEMO
-- ============================================================
INSERT INTO organizations (id, nombre, razon_social, plan, config, created_at)
VALUES (
  'dddddddd-0000-0000-0000-000000000002',
  'Abastemed Demo',
  'Abastemed Demo S.A. de C.V.',
  'demo',
  '{"is_demo": true, "demo_version": "1.0"}'::jsonb,
  NOW() - INTERVAL '30 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 2: USUARIOS AUTH + IDENTITIES
-- Contraseña para todos: Demo2024!
-- ============================================================

-- Coordinadora: Daniela Torres Méndez
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-0000-0000-0000-000000000010',
  'authenticated', 'authenticated',
  'coordinadora@demo.abastemed.com',
  crypt('Demo2024!', gen_salt('bf')),
  NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, NOW() - INTERVAL '20 days', NOW(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  created_at, updated_at, last_sign_in_at
) VALUES (
  'coordinadora@demo.abastemed.com',
  'dddddddd-0000-0000-0000-000000000010',
  '{"sub":"dddddddd-0000-0000-0000-000000000010","email":"coordinadora@demo.abastemed.com","email_verified":true}'::jsonb,
  'email', NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- Enfermera Andrea López Vargas
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-0000-0000-0000-000000000011',
  'authenticated', 'authenticated',
  'andrea@demo.abastemed.com',
  crypt('Demo2024!', gen_salt('bf')),
  NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, NOW() - INTERVAL '20 days', NOW(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  created_at, updated_at, last_sign_in_at
) VALUES (
  'andrea@demo.abastemed.com',
  'dddddddd-0000-0000-0000-000000000011',
  '{"sub":"dddddddd-0000-0000-0000-000000000011","email":"andrea@demo.abastemed.com","email_verified":true}'::jsonb,
  'email', NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- Enfermero Salvador Pérez Núñez
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-0000-0000-0000-000000000012',
  'authenticated', 'authenticated',
  'salvador@demo.abastemed.com',
  crypt('Demo2024!', gen_salt('bf')),
  NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, NOW() - INTERVAL '20 days', NOW(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  created_at, updated_at, last_sign_in_at
) VALUES (
  'salvador@demo.abastemed.com',
  'dddddddd-0000-0000-0000-000000000012',
  '{"sub":"dddddddd-0000-0000-0000-000000000012","email":"salvador@demo.abastemed.com","email_verified":true}'::jsonb,
  'email', NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- Enfermera Fernanda Ruiz Campos (cobertura)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-0000-0000-0000-000000000013',
  'authenticated', 'authenticated',
  'fernanda@demo.abastemed.com',
  crypt('Demo2024!', gen_salt('bf')),
  NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, NOW() - INTERVAL '20 days', NOW(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  created_at, updated_at, last_sign_in_at
) VALUES (
  'fernanda@demo.abastemed.com',
  'dddddddd-0000-0000-0000-000000000013',
  '{"sub":"dddddddd-0000-0000-0000-000000000013","email":"fernanda@demo.abastemed.com","email_verified":true}'::jsonb,
  'email', NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- Familiar: Laura Ramírez Herrera (hija de Elena)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dddddddd-0000-0000-0000-000000000014',
  'authenticated', 'authenticated',
  'laura@demo.abastemed.com',
  crypt('Demo2024!', gen_salt('bf')),
  NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, NOW() - INTERVAL '15 days', NOW(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  created_at, updated_at, last_sign_in_at
) VALUES (
  'laura@demo.abastemed.com',
  'dddddddd-0000-0000-0000-000000000014',
  '{"sub":"dddddddd-0000-0000-0000-000000000014","email":"laura@demo.abastemed.com","email_verified":true}'::jsonb,
  'email', NOW(), NOW(), NOW()
) ON CONFLICT (provider_id, provider) DO NOTHING;

-- ============================================================
-- PASO 3: PACIENTE — Elena Ramírez Torres
-- ============================================================
INSERT INTO pacientes (
  id, nombre, apellido, fecha_nacimiento, diagnostico,
  medicamentos, alergias, contacto_familiar, contexto, status,
  organization_id, created_at
) VALUES (
  'dddddddd-0000-0000-0002-000000000030',
  'Elena', 'Ramírez Torres',
  '1948-02-14',
  'Hipertensión arterial sistémica. Movilidad reducida con riesgo de caídas. Episodios ocasionales de desorientación. Post-hospitalización por fractura de cadera (hace 3 semanas).',
  ARRAY['Losartán 50mg c/24h', 'Vitamina D 800 UI c/24h'],
  ARRAY['Penicilina', 'AINE (gastritis previa)'],
  '{"nombre": "Laura Ramírez Herrera", "parentesco": "hija", "telefono": "477-555-0101", "email": "laura@demo.abastemed.com", "es_principal": true}'::jsonb,
  'domicilio',
  'activo',
  'dddddddd-0000-0000-0000-000000000002',
  NOW() - INTERVAL '22 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 4: ENFERMEROS (entidades operativas)
-- ============================================================
INSERT INTO enfermeros (
  id, nombre, apellido, cedula, especialidades, telefono, email,
  bio, disponible, rating, total_casos, organization_id, created_at
) VALUES
(
  'dddddddd-0000-0000-0001-000000000021',
  'Andrea', 'López Vargas',
  'DEM-ENF-001',
  ARRAY['Cuidado general', 'Adulto mayor', 'Rehabilitación'],
  '477-555-0201',
  'andrea.lopez@demo.abastemed.com',
  'Enfermera con 6 años de experiencia en cuidado domiciliario de adultos mayores. Especialista en rehabilitación post-quirúrgica.',
  true, 4.9, 14,
  'dddddddd-0000-0000-0000-000000000002',
  NOW() - INTERVAL '30 days'
),
(
  'dddddddd-0000-0000-0001-000000000022',
  'Salvador', 'Pérez Núñez',
  'DEM-ENF-002',
  ARRAY['Cuidado nocturno', 'Adulto mayor', 'Urgencias'],
  '477-555-0202',
  'salvador.perez@demo.abastemed.com',
  'Enfermero especializado en turnos nocturnos y vigilancia de adultos mayores con alta dependencia. 5 años de experiencia.',
  true, 4.8, 11,
  'dddddddd-0000-0000-0000-000000000002',
  NOW() - INTERVAL '30 days'
),
(
  'dddddddd-0000-0000-0001-000000000023',
  'Fernanda', 'Ruiz Campos',
  'DEM-ENF-003',
  ARRAY['Cuidado general', 'Adulto mayor', 'Cobertura'],
  '477-555-0203',
  'fernanda.ruiz@demo.abastemed.com',
  'Enfermera de cobertura con amplia disponibilidad. Experiencia en múltiples patologías del adulto mayor.',
  true, 4.7, 9,
  'dddddddd-0000-0000-0000-000000000002',
  NOW() - INTERVAL '30 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 5: PERFILES (vinculan auth.users con roles + entidades)
-- ============================================================
INSERT INTO perfiles (
  id, rol, nombre, apellido, email, telefono,
  enfermero_id, paciente_id,
  -- campos portal familiar
  parentesco, es_contacto_principal, es_responsable_pagos,
  activo_familiar, estado_invitacion,
  created_at
) VALUES
-- Coordinadora
(
  'dddddddd-0000-0000-0000-000000000010',
  'coordinador',
  'Daniela', 'Torres Méndez',
  'coordinadora@demo.abastemed.com',
  '477-555-0100',
  NULL, NULL,
  NULL, false, false, true, 'activo',
  NOW() - INTERVAL '20 days'
),
-- Enfermera Andrea
(
  'dddddddd-0000-0000-0000-000000000011',
  'enfermero',
  'Andrea', 'López Vargas',
  'andrea@demo.abastemed.com',
  '477-555-0201',
  'dddddddd-0000-0000-0001-000000000021', NULL,
  NULL, false, false, true, 'activo',
  NOW() - INTERVAL '20 days'
),
-- Enfermero Salvador
(
  'dddddddd-0000-0000-0000-000000000012',
  'enfermero',
  'Salvador', 'Pérez Núñez',
  'salvador@demo.abastemed.com',
  '477-555-0202',
  'dddddddd-0000-0000-0001-000000000022', NULL,
  NULL, false, false, true, 'activo',
  NOW() - INTERVAL '20 days'
),
-- Enfermera Fernanda
(
  'dddddddd-0000-0000-0000-000000000013',
  'enfermero',
  'Fernanda', 'Ruiz Campos',
  'fernanda@demo.abastemed.com',
  '477-555-0203',
  'dddddddd-0000-0000-0001-000000000023', NULL,
  NULL, false, false, true, 'activo',
  NOW() - INTERVAL '20 days'
),
-- Familiar Laura
(
  'dddddddd-0000-0000-0000-000000000014',
  'familiar',
  'Laura', 'Ramírez Herrera',
  'laura@demo.abastemed.com',
  '477-555-0301',
  NULL, 'dddddddd-0000-0000-0002-000000000030',
  'hija', true, true, true, 'activo',
  NOW() - INTERVAL '15 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 6: CASO — Cuidado domiciliario continuo de Elena
-- ============================================================
INSERT INTO casos (
  id, paciente_id, titulo, contexto, direccion,
  fecha_inicio, status,
  tarifa_hora, tarifa_costo_hora, notas,
  coordinador_id, organization_id, created_at
) VALUES (
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0002-000000000030',
  'Cuidado domiciliario continuo — Elena Ramírez Torres',
  'domicilio',
  'Privada de las Magnolias 14, Fraccionamiento Los Olivos, León, Gto. (ficticio)',
  CURRENT_DATE - INTERVAL '20 days',
  'activo',
  130.00,
  90.00,
  'Paciente post-hospitalización por fractura de cadera. Requiere apoyo en movilización, medicamentos antihipertensivos y vigilancia nocturna. Familia en otra ciudad; coordinación es clave. Médica tratante: Dra. Patricia Gómez Salazar (477-555-0500).',
  'dddddddd-0000-0000-0000-000000000010',
  'dddddddd-0000-0000-0000-000000000002',
  NOW() - INTERVAL '20 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 7: FAMILIAR — vincular Laura con Elena
-- ============================================================
INSERT INTO familiar_paciente (
  id, familiar_id, paciente_id, paciente_principal, parentesco,
  permisos, activo, created_at
) VALUES (
  'dddddddd-0000-0000-000f-000000000f00',
  'dddddddd-0000-0000-0000-000000000014',
  'dddddddd-0000-0000-0002-000000000030',
  true,
  'hija',
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
    "recibe_resumen_semanal":          true,
    "puede_comunicarse":               true
  }'::jsonb,
  true,
  NOW() - INTERVAL '15 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 8: KARDEX DE MEDICAMENTOS
-- ============================================================
INSERT INTO kardex_medicamentos (
  id, caso_id, nombre, presentacion, dosis, via, frecuencia,
  horarios, fecha_inicio, medico, motivo, estatus,
  existencia_domicilio, observaciones, creado_por, created_at
) VALUES
(
  'dddddddd-0000-0000-0005-000000000060',
  'dddddddd-0000-0000-0003-000000000040',
  'Losartán',
  'Tableta 50 mg',
  '1 tableta',
  'oral',
  'cada_24h',
  ARRAY['08:00'],
  CURRENT_DATE - INTERVAL '20 days',
  'Dra. Patricia Gómez Salazar',
  'Control de hipertensión arterial sistémica',
  'activo',
  true,
  'Si la presión supera 160/100 mmHg repetida, notificar de inmediato a coordinación. La Dra. Gómez tiene indicación PRN para dosis adicional vespertina en ese caso.',
  'dddddddd-0000-0000-0000-000000000010',
  NOW() - INTERVAL '20 days'
),
(
  'dddddddd-0000-0000-0005-000000000061',
  'dddddddd-0000-0000-0003-000000000040',
  'Vitamina D',
  'Cápsula 800 UI',
  '1 cápsula',
  'oral',
  'cada_24h',
  ARRAY['08:00'],
  CURRENT_DATE - INTERVAL '20 days',
  'Dra. Patricia Gómez Salazar',
  'Prevención de déficit de vitamina D en adulto mayor con movilidad reducida',
  'activo',
  true,
  'Administrar con el desayuno. No requiere precauciones especiales.',
  'dddddddd-0000-0000-0000-000000000010',
  NOW() - INTERVAL '20 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 9: PLAN DE CUIDADO — Indicaciones
-- ============================================================
INSERT INTO indicaciones (
  id, paciente_id, caso_id, tipo, nombre, dosis, via, frecuencia,
  horarios, fecha_inicio, responsable, notas, activa, created_at
) VALUES
(
  'dddddddd-0000-0000-0006-000000000070',
  'dddddddd-0000-0000-0002-000000000030',
  'dddddddd-0000-0000-0003-000000000040',
  'medicamento_oral',
  'Losartán 50mg',
  '1 tableta',
  'oral',
  'cada_24h',
  ARRAY['08:00'],
  CURRENT_DATE - INTERVAL '20 days',
  'Dra. Patricia Gómez Salazar',
  'Indicación PRN en caso de crisis hipertensiva: si TA > 160/100 mmHg en 2 mediciones separadas 15 min, administrar media tableta adicional y notificar.',
  true,
  NOW() - INTERVAL '20 days'
),
(
  'dddddddd-0000-0000-0006-000000000071',
  'dddddddd-0000-0000-0002-000000000030',
  'dddddddd-0000-0000-0003-000000000040',
  'medicamento_oral',
  'Vitamina D 800 UI',
  '1 cápsula',
  'oral',
  'cada_24h',
  ARRAY['08:00'],
  CURRENT_DATE - INTERVAL '20 days',
  'Dra. Patricia Gómez Salazar',
  NULL,
  true,
  NOW() - INTERVAL '20 days'
),
(
  'dddddddd-0000-0000-0006-000000000072',
  'dddddddd-0000-0000-0002-000000000030',
  'dddddddd-0000-0000-0003-000000000040',
  'signos_vitales',
  'Medición de signos vitales',
  NULL, NULL,
  'cada_12h',
  ARRAY['07:30', '19:30'],
  CURRENT_DATE - INTERVAL '20 days',
  'Enfermero/a asignado/a',
  'Incluye: TA, FC, SpO2, temperatura. Registrar en el reporte de turno. Alertar si TA > 150/95 mmHg.',
  true,
  NOW() - INTERVAL '20 days'
),
(
  'dddddddd-0000-0000-0006-000000000073',
  'dddddddd-0000-0000-0002-000000000030',
  'dddddddd-0000-0000-0003-000000000040',
  'otra',
  'Cambios posturales y prevención de lesiones',
  NULL, NULL,
  'cada_4h',
  ARRAY['08:00', '12:00', '16:00', '20:00', '00:00', '04:00'],
  CURRENT_DATE - INTERVAL '20 days',
  'Enfermero/a asignado/a',
  'Elena no puede reposicionarse sola. Documentar en reporte. Especial atención a zonas sacra, talones y caderas.',
  true,
  NOW() - INTERVAL '20 days'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 10: TURNOS — 1 semana (D-6 a D+1)
-- 12 completados, 2 programados (hoy y esta noche)
-- ============================================================

-- Las fechas usan la zona horaria local del servidor.
-- D-6 Diurno: Andrea
INSERT INTO turnos (id, caso_id, enfermero_id, fecha_inicio, fecha_fin, horas_trabajadas, status, validacion_status, created_at) VALUES
(
  'dddddddd-0000-0000-0007-000000000101',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000021',
  (CURRENT_DATE - INTERVAL '6 days')::date + TIME '07:00',
  (CURRENT_DATE - INTERVAL '6 days')::date + TIME '19:00',
  12, 'completado', 'validado', NOW() - INTERVAL '7 days'
),
-- D-6 Nocturno: Salvador
(
  'dddddddd-0000-0000-0007-000000000102',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000022',
  (CURRENT_DATE - INTERVAL '6 days')::date + TIME '19:00',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '07:00',
  12, 'completado', 'validado', NOW() - INTERVAL '7 days'
),
-- D-5 Diurno: Andrea (hallazgo de piel creado en este turno)
(
  'dddddddd-0000-0000-0007-000000000103',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000021',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '07:00',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '19:00',
  12, 'completado', 'validado', NOW() - INTERVAL '6 days'
),
-- D-5 Nocturno: Salvador
(
  'dddddddd-0000-0000-0007-000000000104',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000022',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '19:00',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '07:00',
  12, 'completado', 'validado', NOW() - INTERVAL '6 days'
),
-- D-4 Diurno: Andrea
(
  'dddddddd-0000-0000-0007-000000000105',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000021',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '07:00',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '19:00',
  12, 'completado', 'validado', NOW() - INTERVAL '5 days'
),
-- D-4 Nocturno: Salvador (pendiente de receta creado aquí)
(
  'dddddddd-0000-0000-0007-000000000106',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000022',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '19:00',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '07:00',
  12, 'completado', 'validado', NOW() - INTERVAL '5 days'
),
-- D-3 Diurno: Andrea — INCIDENCIA hipertensión
(
  'dddddddd-0000-0000-0007-000000000107',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000021',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '07:00',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '19:00',
  12, 'completado', 'validado', NOW() - INTERVAL '4 days'
),
-- D-3 Nocturno: Salvador
(
  'dddddddd-0000-0000-0007-000000000108',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000022',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '19:00',
  (CURRENT_DATE - INTERVAL '2 days')::date + TIME '07:00',
  12, 'completado', 'validado', NOW() - INTERVAL '4 days'
),
-- D-2 Diurno: FERNANDA (cobertura — Andrea reportó indisponibilidad)
(
  'dddddddd-0000-0000-0007-000000000109',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000023',
  (CURRENT_DATE - INTERVAL '2 days')::date + TIME '07:00',
  (CURRENT_DATE - INTERVAL '2 days')::date + TIME '19:00',
  12, 'completado', 'en_revision', NOW() - INTERVAL '3 days'
),
-- D-2 Nocturno: Salvador
(
  'dddddddd-0000-0000-0007-000000000110',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000022',
  (CURRENT_DATE - INTERVAL '2 days')::date + TIME '19:00',
  (CURRENT_DATE - INTERVAL '1 day')::date + TIME '07:00',
  12, 'completado', 'validado', NOW() - INTERVAL '3 days'
),
-- D-1 Diurno: Andrea
(
  'dddddddd-0000-0000-0007-000000000111',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000021',
  (CURRENT_DATE - INTERVAL '1 day')::date + TIME '07:00',
  (CURRENT_DATE - INTERVAL '1 day')::date + TIME '19:00',
  12, 'completado', 'pendiente', NOW() - INTERVAL '2 days'
),
-- D-1 Nocturno: Salvador
(
  'dddddddd-0000-0000-0007-000000000112',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000022',
  (CURRENT_DATE - INTERVAL '1 day')::date + TIME '19:00',
  CURRENT_DATE::date + TIME '07:00',
  12, 'completado', 'pendiente', NOW() - INTERVAL '2 days'
),
-- D+0 Diurno: Andrea — PROGRAMADO (hoy)
(
  'dddddddd-0000-0000-0007-000000000113',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000021',
  CURRENT_DATE::date + TIME '07:00',
  CURRENT_DATE::date + TIME '19:00',
  0, 'programado', 'pendiente', NOW()
),
-- D+0 Nocturno: Salvador — PROGRAMADO (hoy)
(
  'dddddddd-0000-0000-0007-000000000114',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0001-000000000022',
  CURRENT_DATE::date + TIME '19:00',
  (CURRENT_DATE + INTERVAL '1 day')::date + TIME '07:00',
  0, 'programado', 'pendiente', NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 11: REPORTES DE TURNO (para los 12 turnos completados)
-- Datos representativos del estado de Elena
-- ============================================================

-- Helper: signos vitales normales
DO $$ BEGIN
  -- T01: D-6 Diurno - Andrea
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general, estado_general_obs,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, estado_piel, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000101',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000021',
    'dddddddd-0000-0000-0000-000000000011',
    '{"ta_sistolica":128,"ta_diastolica":76,"fc":72,"spo2":97,"temperatura":36.4}'::jsonb,
    'estable',
    'Paciente tranquila, orientada en persona y lugar. Descansó bien según reporte nocturno.',
    'Blanda hiposódica',
    80,
    '1200 ml aprox.',
    true, false,
    ARRAY['higiene_parcial','cambio_postura','movilizacion_asistida'],
    'Sin lesiones visibles. Piel hidratada.',
    3,
    '[{"nombre":"Losartán 50mg","hora":"08:05","status":"administrado"},{"nombre":"Vitamina D 800 UI","hora":"08:05","status":"administrado"}]'::jsonb,
    'Primer turno sin novedades. Paciente colaboradora.',
    (CURRENT_DATE - INTERVAL '6 days')::date + TIME '19:00'
  );

  -- T02: D-6 Nocturno - Salvador
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, estado_piel, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000102',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000022',
    'dddddddd-0000-0000-0000-000000000012',
    '{"ta_sistolica":130,"ta_diastolica":78,"fc":70,"spo2":97,"temperatura":36.2}'::jsonb,
    'estable',
    'Blanda hiposódica', 60, '600 ml (cena + hidratación nocturna)',
    false, true,
    ARRAY['vigilancia_nocturna','cambio_postura','acompanamiento'],
    'Sin cambios.',
    3,
    '[]'::jsonb,
    'Noche tranquila. Elena durmió la mayor parte del turno. Sin episodios de desorientación.',
    (CURRENT_DATE - INTERVAL '5 days')::date + TIME '07:00'
  );

  -- T03: D-5 Diurno - Andrea (hallazgo)
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general, estado_general_obs,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, estado_piel, zonas_enrojecidas, obs_piel,
    cambios_posturales_num, medicamentos_administrados,
    observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000103',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000021',
    'dddddddd-0000-0000-0000-000000000011',
    '{"ta_sistolica":132,"ta_diastolica":80,"fc":74,"spo2":97,"temperatura":36.5}'::jsonb,
    'estable', 'Elena algo irritable al inicio del turno, mejoró con el desayuno.',
    'Blanda hiposódica', 75, '1100 ml',
    true, false,
    ARRAY['higiene_completa','cambio_postura','movilizacion_asistida','hidratacion_piel'],
    'Enrojecimiento zona sacra leve detectado.',
    'Zona sacra: enrojecimiento leve (no blanquea al presionar), aproximadamente 2x2 cm.',
    'Se intensificaron cambios posturales. Se aplicó crema barrera. Se registró hallazgo clínico.',
    4,
    '[{"nombre":"Losartán 50mg","hora":"08:10","status":"administrado"},{"nombre":"Vitamina D 800 UI","hora":"08:10","status":"administrado"}]'::jsonb,
    'Hallazgo de integridad de piel registrado. Coordinación notificada. Se incrementan cambios posturales a cada 2 horas durante turno diurno.',
    (CURRENT_DATE - INTERVAL '5 days')::date + TIME '19:00'
  );

  -- T04: D-5 Nocturno - Salvador
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, estado_piel, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000104',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000022',
    'dddddddd-0000-0000-0000-000000000012',
    '{"ta_sistolica":128,"ta_diastolica":76,"fc":71,"spo2":98,"temperatura":36.3}'::jsonb,
    'estable',
    'Blanda hiposódica', 55, '500 ml',
    false, true,
    ARRAY['vigilancia_nocturna','cambio_postura','hidratacion_piel'],
    'Zona sacra vigilada. Sin progresión visible.',
    5,
    '[]'::jsonb,
    'Se continuaron cambios posturales más frecuentes. Aplicación de crema barrera en zona sacra. Elena cooperó bien.',
    (CURRENT_DATE - INTERVAL '4 days')::date + TIME '07:00'
  );

  -- T05: D-4 Diurno - Andrea
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, estado_piel, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000105',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000021',
    'dddddddd-0000-0000-0000-000000000011',
    '{"ta_sistolica":135,"ta_diastolica":82,"fc":73,"spo2":97,"temperatura":36.4}'::jsonb,
    'estable',
    'Blanda hiposódica', 80, '1300 ml',
    true, false,
    ARRAY['higiene_parcial','cambio_postura','movilizacion_asistida','hidratacion_piel'],
    'Zona sacra con leve mejoría. Enrojecimiento más pálido.',
    4,
    '[{"nombre":"Losartán 50mg","hora":"08:00","status":"administrado"},{"nombre":"Vitamina D 800 UI","hora":"08:00","status":"administrado"}]'::jsonb,
    'Mejoría visible en zona sacra. Paciente de buen humor hoy. Llamó por teléfono a su hija Laura.',
    (CURRENT_DATE - INTERVAL '4 days')::date + TIME '19:00'
  );

  -- T06: D-4 Nocturno - Salvador
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, cambios_posturales_num,
    medicamentos_administrados, pendientes, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000106',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000022',
    'dddddddd-0000-0000-0000-000000000012',
    '{"ta_sistolica":126,"ta_diastolica":74,"fc":69,"spo2":98,"temperatura":36.1}'::jsonb,
    'estable',
    'Blanda hiposódica', 60, '550 ml',
    false, true,
    ARRAY['vigilancia_nocturna','cambio_postura'],
    4,
    '[]'::jsonb,
    'Revisar con coordinación el surtimiento del Losartán — quedan solo 5 tabletas en domicilio. Solicitar receta a médica tratante.',
    'Noche tranquila. Elena despertó una vez para ir al baño (con apoyo). Volvió a dormir sin dificultad. Recordatorio: Losartán bajo en existencia.',
    (CURRENT_DATE - INTERVAL '3 days')::date + TIME '07:00'
  );

  -- T07: D-3 Diurno - Andrea — INCIDENCIA hipertensión
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general, estado_general_obs,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, estado_piel, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000107',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000021',
    'dddddddd-0000-0000-0000-000000000011',
    '{"ta_sistolica":140,"ta_diastolica":82,"fc":76,"spo2":97,"temperatura":36.4,"ta_segunda_medicion":{"sistolica":138,"diastolica":80}}'::jsonb,
    'estable', 'Paciente con algo de cefalea leve matutina. Se resolvió antes del mediodía. Episodio hipertensivo a las 16:00 fue manejado y resuelto (ver incidencia registrada).',
    'Blanda hiposódica', 70, '1200 ml',
    true, false,
    ARRAY['higiene_completa','cambio_postura','movilizacion_asistida','hidratacion_piel'],
    'Zona sacra con mejoría notable. Enrojecimiento muy leve.',
    4,
    '[{"nombre":"Losartán 50mg","hora":"08:00","status":"administrado"},{"nombre":"Vitamina D 800 UI","hora":"08:00","status":"administrado"},{"nombre":"Losartán 50mg (PRN)","hora":"16:20","status":"administrado","nota":"Indicación PRN por crisis hipertensiva 160/90 mmHg"}]'::jsonb,
    'Episodio de hipertensión a las 16:00: TA 160/90 mmHg. Confirmada con segunda medición a los 15 min: 162/92 mmHg. Se siguió indicación PRN de la Dra. Gómez. Se notificó a coordinación (Daniela Torres). Familiar (Laura) fue informada por coordinación. A las 18:00: TA 140/70 mmHg — estabilizada. Hallazgo sacro resuelto durante este turno.',
    (CURRENT_DATE - INTERVAL '3 days')::date + TIME '19:00'
  );

  -- T08: D-3 Nocturno - Salvador
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000108',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000022',
    'dddddddd-0000-0000-0000-000000000012',
    '{"ta_sistolica":130,"ta_diastolica":76,"fc":71,"spo2":98,"temperatura":36.2}'::jsonb,
    'estable',
    'Blanda hiposódica', 55, '500 ml',
    false, true,
    ARRAY['vigilancia_nocturna','cambio_postura','monitoreo_ta'],
    4,
    '[]'::jsonb,
    'Monitoreo adicional de TA post-incidencia diurna. Mediciones nocturnas: 22:00 → 132/78 mmHg. 02:00 → 128/74 mmHg. Sin nuevas incidencias. Paciente descansó bien.',
    (CURRENT_DATE - INTERVAL '2 days')::date + TIME '07:00'
  );

  -- T09: D-2 Diurno - FERNANDA (cobertura)
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general, estado_general_obs,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, estado_piel, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000109',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000023',
    'dddddddd-0000-0000-0000-000000000013',
    '{"ta_sistolica":126,"ta_diastolica":74,"fc":70,"spo2":98,"temperatura":36.3}'::jsonb,
    'estable', 'Primera vez con esta paciente. Revisé expediente completo antes del turno. Elena fue amable y colaboradora.',
    'Blanda hiposódica', 75, '1100 ml',
    true, false,
    ARRAY['higiene_parcial','cambio_postura','movilizacion_asistida'],
    'Sin lesiones. Zona sacra sin enrojecimiento visible.',
    3,
    '[{"nombre":"Losartán 50mg","hora":"08:15","status":"administrado"},{"nombre":"Vitamina D 800 UI","hora":"08:15","status":"administrado"}]'::jsonb,
    'Turno de cobertura (Andrea con indisponibilidad). Revisé el expediente y las indicaciones antes de iniciar. Sin novedades. Presión arterial estable. Familia fue informada del cambio de enfermera.',
    (CURRENT_DATE - INTERVAL '2 days')::date + TIME '19:00'
  );

  -- T10: D-2 Nocturno - Salvador
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000110',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000022',
    'dddddddd-0000-0000-0000-000000000012',
    '{"ta_sistolica":128,"ta_diastolica":76,"fc":70,"spo2":98,"temperatura":36.2}'::jsonb,
    'estable',
    'Blanda hiposódica', 50, '480 ml',
    false, true,
    ARRAY['vigilancia_nocturna','cambio_postura'],
    3,
    '[]'::jsonb,
    'Noche sin incidentes. Medicamentos diurnos ya administrados por Fernanda. Elena durmió bien.',
    (CURRENT_DATE - INTERVAL '1 day')::date + TIME '07:00'
  );

  -- T11: D-1 Diurno - Andrea
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, estado_piel, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000111',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000021',
    'dddddddd-0000-0000-0000-000000000011',
    '{"ta_sistolica":124,"ta_diastolica":72,"fc":71,"spo2":98,"temperatura":36.3}'::jsonb,
    'estable',
    'Blanda hiposódica', 85, '1400 ml',
    true, false,
    ARRAY['higiene_completa','cambio_postura','movilizacion_asistida','ejercicio_pasivo'],
    'Piel sin lesiones. Muy buena.',
    4,
    '[{"nombre":"Losartán 50mg","hora":"08:00","status":"administrado"},{"nombre":"Vitamina D 800 UI","hora":"08:00","status":"administrado"}]'::jsonb,
    'Muy buen día para Elena. Realizamos algunos ejercicios pasivos de pierna. Presión arterial excelente. Se ríe y platica bien. La nueva receta de Losartán ya fue surtida.',
    (CURRENT_DATE - INTERVAL '1 day')::date + TIME '19:00'
  );

  -- T12: D-1 Nocturno - Salvador
  INSERT INTO reportes_turno (
    turno_id, caso_id, enfermero_id, registrado_por,
    signos_vitales, estado_general,
    tipo_dieta, porcentaje_ingesta, liquidos_ingeridos,
    evacuacion, uso_panal,
    cuidados_realizados, cambios_posturales_num,
    medicamentos_administrados, observaciones, created_at
  ) VALUES (
    'dddddddd-0000-0000-0007-000000000112',
    'dddddddd-0000-0000-0003-000000000040',
    'dddddddd-0000-0000-0001-000000000022',
    'dddddddd-0000-0000-0000-000000000012',
    '{"ta_sistolica":122,"ta_diastolica":70,"fc":68,"spo2":98,"temperatura":36.1}'::jsonb,
    'estable',
    'Blanda hiposódica', 60, '550 ml',
    false, true,
    ARRAY['vigilancia_nocturna','cambio_postura'],
    3,
    '[]'::jsonb,
    'Noche tranquila. Elena durmió bien. Sin incidencias. Entrega a Andrea mañana sin pendientes urgentes.',
    CURRENT_DATE::date + TIME '07:00'
  );
END $$;

-- ============================================================
-- PASO 12: INCIDENCIA — Crisis hipertensiva (D-3)
-- ============================================================
INSERT INTO incidencias (
  id, caso_id, turno_id,
  tipo, descripcion,
  signos_vitales, intervencion,
  a_quien_se_aviso, respuesta, estado_posterior,
  gravedad, reportado_por, fecha_hora, created_at
) VALUES (
  'dddddddd-0000-0000-0008-000000000080',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0007-000000000107',
  'hipertension',
  'Presión arterial elevada detectada a las 16:00. Primera medición: 160/90 mmHg. Segunda medición (15 min después): 162/92 mmHg. Paciente sin síntomas neurológicos, sin dolor torácico, sin dificultad respiratoria. Refiere cefalea leve que ya tenía desde la mañana.',
  '{"primera_medicion":{"sistolica":160,"diastolica":90,"hora":"16:00"},"segunda_medicion":{"sistolica":162,"diastolica":92,"hora":"16:15"},"tercera_medicion":{"sistolica":140,"diastolica":70,"hora":"18:00"},"fc":78,"spo2":97}'::jsonb,
  'Se aplicó indicación PRN registrada por Dra. Patricia Gómez Salazar: media tableta adicional de Losartán a las 16:20. Reposo absoluto. Vigilancia continua. Medición de control a las 18:00: 140/70 mmHg. Paciente estabilizada.',
  'Coordinación (Daniela Torres Méndez) — vía llamada telefónica a las 16:05. Familiar (Laura Ramírez) notificada por coordinación a las 16:30.',
  'Coordinación confirmó la indicación PRN. Familiar agradeció la comunicación y solicitó actualización en 2 horas. Médica Dra. Gómez fue informada por coordinación.',
  'Presión arterial normalizada a las 18:00 (140/70 mmHg). Paciente estable. Sin nuevas crisis en turno nocturno ni al día siguiente.',
  'moderada',
  'dddddddd-0000-0000-0000-000000000011',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '16:00',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '16:05'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 13: HALLAZGO CLÍNICO — Riesgo integridad de piel (D-5, resuelto D-3)
-- ============================================================
INSERT INTO hallazgos_clinicos (
  id, caso_id, turno_id, enfermero_id, creado_por,
  categoria, tipo, descripcion,
  severidad, estado,
  requiere_vigilancia, requiere_notificacion,
  fotos_urls,
  fecha_resolucion, notas_resolucion, resuelto_por,
  created_at, updated_at
) VALUES (
  'dddddddd-0000-0000-0009-000000000090',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0007-000000000103',
  'dddddddd-0000-0000-0001-000000000021',
  'dddddddd-0000-0000-0000-000000000011',
  'integridad_piel',
  'lesion_presion',
  'Enrojecimiento leve en zona sacra detectado durante higiene completa. Área aproximada 2x2 cm. La piel no blanquea a la presión digital (categoría I de lesión por presión). Sin solución de continuidad. Sin exudado. Piel íntegra pero en riesgo.',
  'leve',
  'resuelto',
  true, true,
  ARRAY[]::TEXT[],
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '18:00',
  'Zona sacra sin enrojecimiento visible. Intervención oportuna con cambios posturales frecuentes y crema barrera fue efectiva. Sin progresión de la lesión.',
  'dddddddd-0000-0000-0000-000000000011',
  (CURRENT_DATE - INTERVAL '5 days')::date + TIME '14:00',
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '18:00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 14: PENDIENTE — Surtimiento de medicamento
-- ============================================================
INSERT INTO pendientes_caso (
  id, caso_id, turno_origen_id, enfermero_creador_id,
  titulo, descripcion, prioridad, estado, origen,
  turno_resolucion_id, enfermero_resolucion_id,
  fecha_resolucion, notas_resolucion,
  created_at, updated_at
) VALUES (
  'dddddddd-0000-0000-000a-0000000000a0',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0007-000000000106',
  'dddddddd-0000-0000-0000-000000000012',
  'Surtir Losartán — existencia baja',
  'Quedan aproximadamente 5 tabletas de Losartán 50mg. Solicitar nueva receta a Dra. Gómez Salazar y coordinar surtimiento. No debe interrumpirse este medicamento.',
  'alta',
  'resuelto',
  'manual',
  'dddddddd-0000-0000-0007-000000000111',
  'dddddddd-0000-0000-0000-000000000011',
  (CURRENT_DATE - INTERVAL '1 day')::date + TIME '10:00',
  'Receta renovada y medicamento surtido. Existencia actual: 30 tabletas.',
  (CURRENT_DATE - INTERVAL '4 days')::date + TIME '07:10',
  (CURRENT_DATE - INTERVAL '1 day')::date + TIME '10:00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 15: ALERTA ACTIVA — Riesgo de caída
-- ============================================================
INSERT INTO alertas_activas (
  id, caso_id, turno_activacion_id, activado_por,
  tipo, descripcion, nivel, activa, created_at
) VALUES (
  'dddddddd-0000-0000-000b-0000000000b0',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0007-000000000101',
  'dddddddd-0000-0000-0000-000000000010',
  'riesgo_caida',
  'Elena presenta movilidad reducida post-fractura de cadera. No debe intentar levantarse sola. Requiere asistencia obligatoria para traslados. Barandales en cama activados en turno nocturno.',
  'alto',
  true,
  (CURRENT_DATE - INTERVAL '20 days')::date + TIME '09:00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 16: VIGILANCIA ESPECIAL — Presión arterial
-- ============================================================
INSERT INTO vigilancias_especiales (
  id, caso_id, creado_por,
  parametro, descripcion, frecuencia, instrucciones,
  activa, created_at
) VALUES (
  'dddddddd-0000-0000-000c-0000000000c0',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0000-000000000010',
  'presion_arterial',
  'Vigilancia reforzada de presión arterial post-episodio hipertensivo (D-3). Medicamento antihipertensivo activo.',
  'cada_4_horas',
  'Medir TA cada 4 horas durante turno activo. Registrar todas las mediciones en el reporte. Alertar de inmediato si TA sistólica > 150 mmHg. Si TA > 160/100 en 2 mediciones, seguir indicación PRN de Dra. Gómez.',
  true,
  (CURRENT_DATE - INTERVAL '3 days')::date + TIME '19:00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 17: ENTREGA GUIADA DE TURNO (último turno completado, D-1 nocturno)
-- ============================================================
INSERT INTO entregas_turno_guiadas (
  id, turno_id, caso_id, enfermero_saliente_id,
  estado_paciente, cambios_relevantes,
  pendientes_siguiente, vigilancia_especial,
  notificar_coordinacion, notas_coordinacion,
  resumen_turno, resumen_familiar,
  created_at
) VALUES (
  'dddddddd-0000-0000-000d-0000000000d0',
  'dddddddd-0000-0000-0007-000000000112',
  'dddddddd-0000-0000-0003-000000000040',
  'dddddddd-0000-0000-0000-000000000012',
  'igual',
  'Sin cambios relevantes en el turno nocturno. Presión arterial estable (TA 122/70 a las 03:00). Durmió bien.',
  'Administrar medicamentos matutinos (Losartán + Vit D) puntualmente a las 08:00. Continuar vigilancia de TA según indicación. Apoyo en baño matutino requerido.',
  'Continuar medición de TA cada 4 horas per vigilancia activa. Registrar todas las mediciones. Existencia de Losartán OK (30 tabletas disponibles).',
  false,
  NULL,
  'Turno nocturno sin incidencias. Elena descansó bien. TA estable durante toda la noche (última medición 122/70 a las 03:00). Pendientes para Andrea: administrar medicamentos matutinos a las 08:00, apoyar en higiene y movilización al despertar.',
  'Buenas noches tranquilas para Elena. Durmió bien y su presión estuvo perfecta toda la noche. Por la mañana recibirá sus medicamentos y el apoyo de Andrea para asearse y levantarse.',
  CURRENT_DATE::date + TIME '07:00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 18: RECIBO Y FINANZAS
-- ============================================================

-- Ingreso registrado (pago parcial de Laura)
INSERT INTO financial_incomes (
  id,
  folio,
  fecha_pago,
  paciente_id,
  caso_id,
  responsable_pago_nombre,
  responsable_pago_contacto,
  concepto,
  tipo_ingreso,
  monto_total,
  monto_recibido,
  metodo_pago,
  referencia_pago,
  estatus,
  observaciones,
  created_at,
  organization_id
) VALUES (
  'dddddddd-0000-0000-000f-000000000f10',
  'DEM-ING-001',
  CURRENT_DATE - INTERVAL '5 days',
  'dddddddd-0000-0000-0002-000000000030',
  'dddddddd-0000-0000-0003-000000000040',
  'Laura Ramírez Herrera',
  'laura@demo.abastemed.com',
  'Servicios de enfermería domiciliaria — Semana 1 (pago parcial)',
  'pago_servicio',
  15000.00,
  8000.00,
  'transferencia',
  'Transferencia SPEI confirmada por Laura Ramírez',
  'parcial',
  'Primer pago del servicio. Saldo pendiente: $7,000 MXN (semana 2 se facturará al cierre). DATOS FICTICIOS — DEMO.',
  NOW() - INTERVAL '5 days',
  'dddddddd-0000-0000-0000-000000000002'
)
ON CONFLICT (id) DO NOTHING;

-- Recibo de cobro (parcialmente pagado)
INSERT INTO recibos (
  id,
  folio,
  paciente_nombre,
  fecha_emision,
  subtotal,
  total,
  metodo_pago,
  estado,
  observaciones,
  organization_id
) VALUES (
  'dddddddd-0000-0000-000e-0000000000e0',
  'DEM-REC-001',
  'Elena Ramírez Torres',
  CURRENT_DATE - INTERVAL '7 days',
  12931.03,
  15000.00,
  'transferencia',
  'pendiente',
  'Servicios de enfermería domiciliaria — Semana 1. 12 turnos de 12 horas. Pago parcial recibido ($8,000). Saldo pendiente: $7,000 con vencimiento próximo. DATOS FICTICIOS — DEMO.',
  'dddddddd-0000-0000-0000-000000000002'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
DO $$
DECLARE
  v_turnos  INTEGER;
  v_reportes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_turnos FROM turnos WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040';
  SELECT COUNT(*) INTO v_reportes FROM reportes_turno WHERE caso_id = 'dddddddd-0000-0000-0003-000000000040';

  RAISE NOTICE '=== Seed Demo completado ===';
  RAISE NOTICE 'Turnos creados: %', v_turnos;
  RAISE NOTICE 'Reportes de turno: %', v_reportes;
  RAISE NOTICE 'Incidencias: 1 (hipertensión D-3)';
  RAISE NOTICE 'Hallazgos: 1 (piel, resuelto)';
  RAISE NOTICE 'Alertas activas: 1 (riesgo caída)';
  RAISE NOTICE 'Vigilancias: 1 (presión arterial)';
  RAISE NOTICE 'Pendientes: 1 (medicamento, resuelto)';
  RAISE NOTICE 'Entrega guiada: 1 (último turno nocturno)';
  RAISE NOTICE '';
  RAISE NOTICE 'Credenciales demo (contraseña: Demo2024!):';
  RAISE NOTICE '  Coordinadora: coordinadora@demo.abastemed.com';
  RAISE NOTICE '  Enfermera:    andrea@demo.abastemed.com';
  RAISE NOTICE '  Enfermero:    salvador@demo.abastemed.com';
  RAISE NOTICE '  Cobertura:    fernanda@demo.abastemed.com';
  RAISE NOTICE '  Familiar:     laura@demo.abastemed.com';
END $$;
