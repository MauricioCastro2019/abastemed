-- ============================================================
-- CENTRO PROFESIONAL ABASTEMED
-- Sistema de niveles, competencias y capacitaciones
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE estado_competencia AS ENUM (
    'no_iniciado',
    'capacitacion_vista',
    'evaluacion_aprobada',
    'practica_observada',
    'validado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_modulo_capacitacion AS ENUM (
    'no_iniciado',
    'en_progreso',
    'completado',
    'aprobado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. NIVELES PROFESIONALES ─────────────────────────────────

CREATE TABLE IF NOT EXISTS niveles_profesionales (
  id                          SERIAL PRIMARY KEY,
  nombre                      TEXT NOT NULL,
  orden                       INT  NOT NULL UNIQUE,
  descripcion                 TEXT,
  horas_minimas               INT DEFAULT 0,
  guardias_minimas            INT DEFAULT 0,
  evaluacion_minima           NUMERIC(3,1) DEFAULT 0,
  competencias_minimas        INT DEFAULT 0,
  incidencias_criticas_max    INT DEFAULT 999,
  requiere_validacion         BOOLEAN DEFAULT false,
  color                       TEXT DEFAULT '#6B7280',
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. COMPETENCIAS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competencias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  categoria       TEXT NOT NULL,
  nivel_minimo    INT  DEFAULT 1,
  tipos_paciente  TEXT[] DEFAULT '{}',
  activa          BOOLEAN DEFAULT true,
  orden           INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. COMPETENCIAS POR ENFERMERO ────────────────────────────

CREATE TABLE IF NOT EXISTS enfermero_competencias (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfermero_id          UUID NOT NULL REFERENCES enfermeros(id) ON DELETE CASCADE,
  competencia_id        UUID NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  estado                estado_competencia DEFAULT 'no_iniciado',
  modulo_completado_at  TIMESTAMPTZ,
  evaluacion_score      NUMERIC(5,2),
  practica_observada_at TIMESTAMPTZ,
  validado_por          UUID REFERENCES perfiles(id),
  validado_at           TIMESTAMPTZ,
  notas                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enfermero_id, competencia_id)
);

-- ── 5. MÓDULOS DE CAPACITACIÓN ───────────────────────────────

CREATE TABLE IF NOT EXISTS modulos_capacitacion (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           TEXT NOT NULL,
  descripcion      TEXT,
  duracion_minutos INT DEFAULT 15,
  contenido        JSONB DEFAULT '[]',
  checklist        TEXT[] DEFAULT '{}',
  evaluacion       JSONB DEFAULT '[]',
  competencia_id   UUID REFERENCES competencias(id),
  nivel_requerido  INT DEFAULT 1,
  orden            INT DEFAULT 0,
  obligatorio      BOOLEAN DEFAULT false,
  activo           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. PROGRESO DE CAPACITACIÓN POR ENFERMERO ───────────────

CREATE TABLE IF NOT EXISTS progreso_capacitacion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfermero_id    UUID NOT NULL REFERENCES enfermeros(id) ON DELETE CASCADE,
  modulo_id       UUID NOT NULL REFERENCES modulos_capacitacion(id) ON DELETE CASCADE,
  estado          estado_modulo_capacitacion DEFAULT 'no_iniciado',
  progreso_pct    INT DEFAULT 0,
  score           NUMERIC(5,2),
  intentos        INT DEFAULT 0,
  iniciado_at     TIMESTAMPTZ,
  completado_at   TIMESTAMPTZ,
  aprobado_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enfermero_id, modulo_id)
);

-- ── 7. MANUAL OPERATIVO DEL PACIENTE ────────────────────────

CREATE TABLE IF NOT EXISTS manual_operativo_paciente (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id              UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE UNIQUE,
  resumen                  TEXT,
  diagnosticos_relevantes  TEXT[] DEFAULT '{}',
  riesgos_principales      TEXT[] DEFAULT '{}',
  que_observar             TEXT[] DEFAULT '{}',
  que_reportar             TEXT[] DEFAULT '{}',
  que_evitar               TEXT[] DEFAULT '{}',
  indicaciones_familia     TEXT,
  indicaciones_medicas     TEXT,
  observaciones_trato      TEXT,
  activo                   BOOLEAN DEFAULT true,
  actualizado_por          UUID REFERENCES perfiles(id),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE niveles_profesionales       ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE enfermero_competencias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos_capacitacion        ENABLE ROW LEVEL SECURITY;
ALTER TABLE progreso_capacitacion       ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_operativo_paciente   ENABLE ROW LEVEL SECURITY;

-- niveles: todos leen
DROP POLICY IF EXISTS "niveles_read_all" ON niveles_profesionales;
CREATE POLICY "niveles_read_all" ON niveles_profesionales
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "niveles_admin_write" ON niveles_profesionales;
CREATE POLICY "niveles_admin_write" ON niveles_profesionales
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','superadmin')));

-- competencias: todos leen, admin escribe
DROP POLICY IF EXISTS "competencias_read_all" ON competencias;
CREATE POLICY "competencias_read_all" ON competencias
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "competencias_admin_write" ON competencias;
CREATE POLICY "competencias_admin_write" ON competencias
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','superadmin')));

-- enfermero_competencias: enfermero lee las propias, admin/coordinador todo
DROP POLICY IF EXISTS "ec_read" ON enfermero_competencias;
CREATE POLICY "ec_read" ON enfermero_competencias
  FOR SELECT TO authenticated
  USING (
    enfermero_id IN (SELECT enfermero_id FROM perfiles WHERE id = auth.uid() AND enfermero_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','superadmin','coordinador'))
  );

DROP POLICY IF EXISTS "ec_admin_write" ON enfermero_competencias;
CREATE POLICY "ec_admin_write" ON enfermero_competencias
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','superadmin','coordinador')));

-- modulos_capacitacion: todos leen, admin escribe
DROP POLICY IF EXISTS "mc_read_all" ON modulos_capacitacion;
CREATE POLICY "mc_read_all" ON modulos_capacitacion
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mc_admin_write" ON modulos_capacitacion;
CREATE POLICY "mc_admin_write" ON modulos_capacitacion
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','superadmin')));

-- progreso_capacitacion: enfermero lee/escribe los propios, admin/coord todo
DROP POLICY IF EXISTS "pc_read" ON progreso_capacitacion;
CREATE POLICY "pc_read" ON progreso_capacitacion
  FOR SELECT TO authenticated
  USING (
    enfermero_id IN (SELECT enfermero_id FROM perfiles WHERE id = auth.uid() AND enfermero_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','superadmin','coordinador'))
  );

DROP POLICY IF EXISTS "pc_nurse_insert" ON progreso_capacitacion;
CREATE POLICY "pc_nurse_insert" ON progreso_capacitacion
  FOR INSERT TO authenticated
  WITH CHECK (enfermero_id IN (SELECT enfermero_id FROM perfiles WHERE id = auth.uid() AND enfermero_id IS NOT NULL));

DROP POLICY IF EXISTS "pc_nurse_update" ON progreso_capacitacion;
CREATE POLICY "pc_nurse_update" ON progreso_capacitacion
  FOR UPDATE TO authenticated
  USING (enfermero_id IN (SELECT enfermero_id FROM perfiles WHERE id = auth.uid() AND enfermero_id IS NOT NULL));

DROP POLICY IF EXISTS "pc_admin_write" ON progreso_capacitacion;
CREATE POLICY "pc_admin_write" ON progreso_capacitacion
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','superadmin','coordinador')));

-- manual_operativo_paciente: enfermero asignado lee, admin/coord escribe
DROP POLICY IF EXISTS "mop_read_auth" ON manual_operativo_paciente;
CREATE POLICY "mop_read_auth" ON manual_operativo_paciente
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "mop_admin_write" ON manual_operativo_paciente;
CREATE POLICY "mop_admin_write" ON manual_operativo_paciente
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('admin','superadmin','coordinador')));

-- ── 9. SEED: NIVELES PROFESIONALES ──────────────────────────

INSERT INTO niveles_profesionales
  (nombre, orden, descripcion, horas_minimas, guardias_minimas, evaluacion_minima, competencias_minimas, color)
VALUES
  ('Aspirante Abastemed',   1, 'Primeros pasos: inducción y conocimiento del sistema. Aquí empieza todo.', 0,   0,   0.0, 0,  '#94A3B8'),
  ('Enfermero en Inducción',2, 'Completando las primeras guardias y capacitaciones fundamentales.',        0,   3,   3.0, 1,  '#60A5FA'),
  ('Enfermero Operativo',   3, 'Guardias independientes. Registro correcto y entregas completas.',         24,  10,  3.5, 3,  '#34D399'),
  ('Enfermero Validado',    4, 'Desempeño consistente. Competencias clínicas verificadas.',                80,  30,  4.0, 6,  '#A78BFA'),
  ('Enfermero Especializado',5,'Manejo de pacientes complejos y procedimientos avanzados.',               200,  80,  4.2, 10, '#F59E0B'),
  ('Enfermero Líder',       6, 'Referente del equipo. Apoya a enfermeros en formación.',                  400, 150,  4.5, 14, '#EF4444'),
  ('Capacitador Interno',   7, 'Forma y acompaña a nuevos integrantes del equipo.',                       600, 200,  4.7, 16, '#EC4899'),
  ('Coordinador Clínico',   8, 'Supervisión clínica y coordinación integral del equipo.',                 800, 250,  4.8, 18, '#6366F1')
ON CONFLICT (orden) DO NOTHING;

-- ── 10. SEED: COMPETENCIAS ───────────────────────────────────

INSERT INTO competencias (nombre, descripcion, categoria, nivel_minimo, orden) VALUES
  ('Inducción Abastemed',
   'Conocimiento del modelo de trabajo, cultura, procesos y expectativas de Abastemed',
   'induccion', 1, 1),

  ('Uso correcto de plataforma',
   'Registro completo en el sistema: reportes de turno, entrega, insumos y perfil',
   'induccion', 1, 2),

  ('Comunicación profesional con familiares',
   'Comunicación clara, empática y profesional. Separación correcta de grupos de comunicación',
   'comunicacion', 1, 3),

  ('Entrega de turno estandarizada',
   'Protocolo de entrega con información completa: estado del paciente, pendientes, medicamentos',
   'operativo', 2, 4),

  ('Toma e interpretación de signos vitales',
   'Medición correcta de PA, FC, T°, SatO2, FR y glucosa. Criterios de alerta por parámetro',
   'clinico', 1, 5),

  ('Administración segura de medicamentos',
   'Los 10 correctos, vías de administración más frecuentes, horarios y registro de omisiones',
   'medicacion', 2, 6),

  ('Higiene y confort del paciente',
   'Baño en cama, higiene oral, cuidado de tegumentos, cambio de ropa y confort general',
   'cuidado_basico', 1, 7),

  ('Movilización segura del paciente',
   'Cambios posturales correctos, técnica de movilización, uso de barandales y equipo de ayuda',
   'cuidado_basico', 2, 8),

  ('Prevención de lesiones por presión',
   'Escalas de riesgo, zonas anatómicas de presión, apósitos preventivos y frecuencia de cambios',
   'clinico', 2, 9),

  ('Oxigenoterapia básica',
   'Dispositivos (puntas, mascarilla, Venturi), litros/min recomendados, saturación objetivo y alertas',
   'clinico', 3, 10),

  ('Cateterismo vesical intermitente',
   'Técnica aséptica, tipos de catéter, medición de residuo, complicaciones frecuentes',
   'procedimientos', 3, 11),

  ('Cuidados respiratorios avanzados',
   'Nebulizaciones, aspiración de secreciones, posición fowler y fisioterapia respiratoria básica',
   'clinico', 3, 12),

  ('Registro de incidencias clínicas',
   'Identificación, clasificación por gravedad, reporte inmediato a coordinación y documentación',
   'operativo', 2, 13),

  ('Cuidados del adulto mayor',
   'Características geriátricas, riesgos específicos (caídas, desorientación), trato digno y comunicación',
   'especializado', 2, 14),

  ('Manejo del paciente con deterioro cognitivo',
   'Orientación en la realidad, manejo conductual seguro, ambiente adaptado y comunicación adaptada',
   'especializado', 4, 15),

  ('Cuidados postoperatorios básicos',
   'Vigilancia de herida quirúrgica, drenajes, signos de alarma y restricciones de actividad',
   'clinico', 3, 16),

  ('Nutrición enteral básica',
   'Sonda nasogástrica y gastrostomía: preparación de fórmulas, administración y cuidados del dispositivo',
   'procedimientos', 4, 17),

  ('Evaluación y manejo del dolor',
   'Escala EVA, tipos de dolor, analgésicos frecuentes, medidas no farmacológicas y registro sistemático',
   'clinico', 3, 18)
ON CONFLICT DO NOTHING;

-- ── 11. SEED: MÓDULOS DE CAPACITACIÓN ───────────────────────

INSERT INTO modulos_capacitacion
  (titulo, descripcion, duracion_minutos, checklist, evaluacion, obligatorio, orden, nivel_requerido, contenido)
VALUES

-- Módulo 1: Inducción Abastemed
(
  'Inducción Abastemed',
  'Conoce cómo trabaja Abastemed: misión, valores, procesos, protocolos de comunicación y lo que se espera de cada enfermero.',
  20,
  ARRAY[
    'Conozco la misión y los valores de Abastemed',
    'Entiendo qué se registra en la plataforma y por qué',
    'Conozco las reglas del grupo familiar vs grupo operativo',
    'Sé a quién contactar ante una duda operativa',
    'Entiendo el protocolo de entrega de turno'
  ],
  '[
    {"pregunta": "¿Cuál es el protocolo correcto cuando surge una duda clínica durante la guardia?",
     "opciones": ["Preguntar en el grupo familiar", "Buscar en internet", "Llamar o escribir al coordinador por el canal operativo", "Esperar a terminar el turno"],
     "respuesta_correcta": 2},
    {"pregunta": "¿Qué información SÍ va en el grupo familiar?",
     "opciones": ["Dudas sobre medicamentos", "Reporte de estado del paciente, cambios relevantes y solicitudes formales", "Conflictos con el turno anterior", "Precios del servicio"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Qué significa para Abastemed registrar correctamente en plataforma?",
     "opciones": ["Es un trámite administrativo opcional", "Protege al paciente, a la familia y al enfermero, y permite mejorar el servicio", "Solo sirve para cobrar", "Es solo para los coordinadores"],
     "respuesta_correcta": 1}
  ]'::JSONB,
  true, 1, 1,
  '[
    {"tipo": "intro", "texto": "Bienvenido a Abastemed. Este módulo es tu punto de partida: entiende cómo trabajamos, por qué lo hacemos y qué se espera de ti como parte del equipo."},
    {"tipo": "seccion", "titulo": "Nuestra misión", "texto": "Garantizar continuidad, calidad y humanidad en el cuidado domiciliario. Cada guardia importa. Cada registro cuenta. Cada familia confía en nosotros."},
    {"tipo": "punto_clave", "texto": "Lo que no se registra, no puede evaluarse, mejorarse ni respaldarse."},
    {"tipo": "seccion", "titulo": "Dos canales, dos propósitos", "texto": "Grupo familiar: solo información relevante para la familia, reportes claros y solicitudes formales. Grupo operativo: dudas internas, insumos, coordinación. Plataforma: registro oficial del servicio."},
    {"tipo": "alerta", "texto": "Nunca compartas información clínica sensible sin autorización previa del coordinador."},
    {"tipo": "seccion", "titulo": "La entrega de turno es sagrada", "texto": "La continuidad del cuidado depende de la claridad con la que entregas tu turno. Estado del paciente, medicamentos administrados, pendientes y observaciones relevantes: siempre."},
    {"tipo": "frase_cultura", "texto": "Hoy no solo cubres una guardia. Hoy das tranquilidad a una familia y continuidad al cuidado de una persona."}
  ]'::JSONB
),

-- Módulo 2: Uso correcto de la plataforma
(
  'Uso correcto de la plataforma',
  'Aprende a registrar tu reporte de turno, hacer la entrega guiada, registrar insumos y mantener tu perfil actualizado.',
  15,
  ARRAY[
    'Sé cómo registrar mi reporte de turno al finalizar',
    'Sé cómo hacer la entrega guiada de turno',
    'Conozco la sección de insumos y cómo registrar consumo',
    'Tengo mi perfil actualizado con especialidades y teléfono',
    'Sé cómo ver el plan de cuidado de mi paciente'
  ],
  '[
    {"pregunta": "¿Cuándo debes registrar el reporte de turno?",
     "opciones": ["Al día siguiente cuando tengas tiempo", "Al final de cada turno, antes de irte", "Solo si algo malo pasó", "Una vez por semana"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Qué incluye una entrega de turno correcta en plataforma?",
     "opciones": ["Solo tu nombre y hora de salida", "Estado del paciente, medicamentos, pendientes y observaciones relevantes", "Solo los medicamentos administrados", "No es obligatorio registrarla"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Por qué es importante tener actualizado tu perfil en la plataforma?",
     "opciones": ["Es solo para decoración", "Permite que coordinación te asigne guardias adecuadas a tu perfil y especialidades", "No tiene ningún impacto", "Solo lo ve el administrador"],
     "respuesta_correcta": 1}
  ]'::JSONB,
  true, 2, 1,
  '[
    {"tipo": "intro", "texto": "La plataforma es la herramienta principal de coordinación y registro. Aprender a usarla bien te protege y permite que el equipo funcione."},
    {"tipo": "seccion", "titulo": "Reporte de turno", "texto": "Al terminar cada turno registra: signos vitales, estado general, medicamentos administrados, cuidados realizados y observaciones. Es tu respaldo y el historial del paciente."},
    {"tipo": "seccion", "titulo": "Entrega de turno guiada", "texto": "Antes de salir, completa la entrega guiada. Incluye estado del paciente, cambios relevantes, pendientes para el siguiente turno y si necesitas notificar a coordinación."},
    {"tipo": "punto_clave", "texto": "Un registro incompleto puede poner en riesgo al paciente y a ti mismo."},
    {"tipo": "seccion", "titulo": "Tu perfil profesional", "texto": "Mantén actualizadas tus especialidades y datos de contacto. Esto afecta directamente qué guardias puedes recibir."}
  ]'::JSONB
),

-- Módulo 3: Protocolo de entrega de turno
(
  'Protocolo de entrega de turno estandarizada',
  'Cómo entregar información clara, completa y segura al siguiente enfermero. La continuidad del cuidado depende de esto.',
  20,
  ARRAY[
    'Conozco los 5 puntos de la entrega estándar',
    'Sé qué información nunca puede omitirse',
    'Entiendo por qué la entrega verbal Y el registro en plataforma son ambos necesarios',
    'Sé cómo manejar una entrega cuando el paciente tuvo un evento durante mi turno'
  ],
  '[
    {"pregunta": "¿Cuáles son los 5 puntos esenciales de una entrega de turno?",
     "opciones": ["Nombre, teléfono, dirección, hora y diagnóstico", "Estado actual del paciente, cambios del turno, medicamentos, pendientes y alertas", "Solo el estado general y si necesita algo", "Solo firmar el libro de bitácora"],
     "respuesta_correcta": 1},
    {"pregunta": "Si durante tu turno el paciente tuvo una caída, ¿qué haces en la entrega?",
     "opciones": ["No lo menciones para no preocupar", "Informas verbalmente Y lo registras en plataforma con todos los detalles", "Solo lo dices de palabra", "Solo lo registras si hubo lesión visible"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Qué pasa si el enfermero entrante no llega y no puedes hacer entrega directa?",
     "opciones": ["Te vas de todas formas", "Notificas a coordinación y dejas registro completo en plataforma antes de salir", "Esperas indefinidamente sin avisar", "Llamas al familiar"],
     "respuesta_correcta": 1}
  ]'::JSONB,
  true, 3, 2,
  '[
    {"tipo": "intro", "texto": "La entrega de turno es el momento más crítico para la continuidad del cuidado. Una buena entrega protege al paciente, al enfermero saliente y al entrante."},
    {"tipo": "seccion", "titulo": "Los 5 puntos de la entrega", "texto": "1. Estado actual del paciente (general, signos vitales, cambios relevantes). 2. Medicamentos administrados y pendientes. 3. Procedimientos realizados y pendientes. 4. Alertas o situaciones que requieren vigilancia. 5. Pendientes específicos para el siguiente turno."},
    {"tipo": "alerta", "texto": "Una entrega incompleta puede resultar en errores de medicación o demora en atención de emergencias."},
    {"tipo": "punto_clave", "texto": "La entrega verbal + el registro en plataforma son AMBOS obligatorios. No son opcionales."},
    {"tipo": "seccion", "titulo": "Cuando hay un evento durante el turno", "texto": "Documenta con precisión qué pasó, cuándo, qué hiciste, a quién avisaste y cuál fue la respuesta. Sé específico. No omitas nada."},
    {"tipo": "frase_cultura", "texto": "La continuidad del cuidado depende de la claridad con la que entregas tu turno."}
  ]'::JSONB
),

-- Módulo 4: Comunicación profesional con familias
(
  'Comunicación profesional con familiares',
  'Qué decir, cómo decirlo, cuándo decirlo y qué evitar en el grupo familiar y en la interacción directa.',
  15,
  ARRAY[
    'Conozco las reglas del grupo familiar de Abastemed',
    'Sé cómo dar información sin generar alarma innecesaria',
    'Entiendo la diferencia entre grupo familiar y canal operativo',
    'Sé cómo responder preguntas médicas de forma segura y profesional'
  ],
  '[
    {"pregunta": "Una familia te pregunta: ¿por qué se le está dando ese medicamento? ¿Qué respondes?",
     "opciones": ["Le explicas todo con detalle técnico", "Le dices que no sabes", "Les explicas de forma simple el propósito y les indicas que para dudas específicas el médico tratante es la fuente correcta", "No respondes"],
     "respuesta_correcta": 2},
    {"pregunta": "¿Qué tipo de mensajes NO van en el grupo familiar?",
     "opciones": ["Reporte del estado del paciente", "Dudas entre enfermeros sobre medicamentos, conflictos de turno o problemas internos", "Solicitud de insumos cuando hay urgencia", "Indicaciones del médico"],
     "respuesta_correcta": 1},
    {"pregunta": "Si la familia está angustiada, ¿cuál es la mejor actitud?",
     "opciones": ["Minimizar su preocupación", "Escuchar, informar con claridad y precisión, transmitir calma sin mentir ni ocultar", "Decirles que todo está bien aunque no lo esté", "Decirles que llamen al médico y no responder más"],
     "respuesta_correcta": 1}
  ]'::JSONB,
  false, 4, 1,
  '[
    {"tipo": "intro", "texto": "Las familias depositan en nosotros la confianza más importante que existe: el cuidado de alguien que aman. Comunicarnos bien es parte del servicio."},
    {"tipo": "seccion", "titulo": "El grupo familiar es un canal profesional", "texto": "Solo va: reportes de estado del paciente, cambios relevantes, solicitudes formales al equipo y mensajes de coordinación que la familia deba saber. Todo lo demás va al canal operativo."},
    {"tipo": "alerta", "texto": "No uses el grupo familiar para dudas entre enfermeros, quejas o información que pueda generar pánico innecesario."},
    {"tipo": "punto_clave", "texto": "Cuando una familia pregunta algo médico que no sabes con certeza: sé honesto, di que consultarás con coordinación. Nunca improvises diagnósticos."},
    {"tipo": "seccion", "titulo": "Tono y lenguaje", "texto": "Profesional, claro, empático. Sin tecnicismos innecesarios. Sin exageraciones. Sin minimizar situaciones reales."},
    {"tipo": "frase_cultura", "texto": "Cuidar también es dar tranquilidad."}
  ]'::JSONB
),

-- Módulo 5: Signos vitales y criterios de alerta
(
  'Signos vitales y criterios de alerta',
  'Medición correcta de cada signo vital, rangos normales por tipo de paciente y cuándo actuar de inmediato.',
  20,
  ARRAY[
    'Sé medir correctamente presión arterial, FC, temperatura, SatO2 y FR',
    'Conozco los rangos normales generales por signo vital',
    'Sé cuáles son los valores de alerta que requieren acción inmediata',
    'Sé cómo registrar los signos vitales en plataforma',
    'Entiendo cuándo llamar a coordinación por un signo vital alterado'
  ],
  '[
    {"pregunta": "¿Cuál es el valor de saturación de oxígeno que requiere notificación inmediata a coordinación?",
     "opciones": ["Menor a 98%", "Menor a 94% en reposo (o según indicación médica específica)", "Menor a 100%", "Solo si el paciente se queja de falta de aire"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Cómo se toma correctamente la presión arterial en casa?",
     "opciones": ["En cualquier posición, en cualquier momento", "Con el paciente sentado o en decúbito, 5 min en reposo, brazo al nivel del corazón", "De pie, justo después de hacer actividad", "No importa la técnica si el equipo es bueno"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Qué haces si tomas una presión de 80/50 mmHg en un paciente adulto mayor?",
     "opciones": ["Lo registras y esperas al siguiente turno", "Notificas inmediatamente a coordinación y al médico tratante, colocas al paciente en posición segura y evalúas más signos", "Le das un vaso de agua", "Repites la toma en 30 minutos sin avisar"],
     "respuesta_correcta": 1}
  ]'::JSONB,
  true, 6, 1,
  '[
    {"tipo": "intro", "texto": "Los signos vitales son la fotografía más inmediata del estado del paciente. Medirlos bien y saber interpretarlos puede marcar la diferencia."},
    {"tipo": "seccion", "titulo": "Presión arterial", "texto": "Normal: 90-120/60-80 mmHg. Alerta: < 90/60 (hipotensión) o > 160/100 (hipertensión). Técnica: paciente en reposo 5 min, brazo a nivel del corazón."},
    {"tipo": "seccion", "titulo": "Frecuencia cardíaca", "texto": "Normal adulto: 60-100 lpm. Alerta: < 50 o > 110 en reposo. Cuenta durante 1 minuto completo o 30 seg x2."},
    {"tipo": "seccion", "titulo": "Temperatura", "texto": "Normal: 36.5-37.2°C. Febrícula: 37.3-38.0°C. Fiebre: > 38.0°C. Hipotermia: < 36.0°C. Reportar si > 38.5°C."},
    {"tipo": "seccion", "titulo": "Saturación de oxígeno", "texto": "Normal: ≥ 95%. Alerta: < 94% en paciente sin O2. Crítico: < 90%. Siempre verifica que el dedo esté bien perfundido."},
    {"tipo": "alerta", "texto": "Cualquier valor fuera de rango debe registrarse y reportarse a coordinación. No esperes."},
    {"tipo": "frase_cultura", "texto": "Un buen enfermero no improvisa; observa, registra y comunica."}
  ]'::JSONB
),

-- Módulo 6: Administración segura de medicamentos
(
  'Administración segura de medicamentos',
  'Los 10 correctos, vías de administración más frecuentes, cómo actuar ante una duda y cómo registrar omisiones.',
  25,
  ARRAY[
    'Conozco y aplico los 10 correctos de la administración de medicamentos',
    'Sé las principales vías de administración y sus características',
    'Sé qué hacer ante una duda de dosis o medicamento',
    'Sé cómo registrar una omisión en plataforma',
    'Entiendo la diferencia entre medicamentos de horario y PRN'
  ],
  '[
    {"pregunta": "¿Cuáles son los 10 correctos de la administración de medicamentos?",
     "opciones": ["Paciente, medicamento, dosis, vía, hora, indicación, registro, caducidad, técnica y educación", "Solo verificar nombre y dosis", "Paciente, hora y dosis son suficientes", "Revisar el frasco antes de darlo"],
     "respuesta_correcta": 0},
    {"pregunta": "Si al sacar un medicamento tienes duda sobre la dosis indicada, ¿qué haces?",
     "opciones": ["Das la dosis que te parece correcta", "No lo das hasta confirmar con el médico o coordinación, y registras el motivo", "Llamas al familiar", "Das la mitad de la dosis para no arriesgarte"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Qué debes hacer si una dosis programada fue omitida?",
     "opciones": ["No pasa nada, se omite sin registro", "Registrar en plataforma el motivo de la omisión y notificar al siguiente enfermero en la entrega", "Dar doble dosis en la siguiente toma", "Solo anotarlo en papel"],
     "respuesta_correcta": 1}
  ]'::JSONB,
  false, 5, 2,
  '[
    {"tipo": "intro", "texto": "Los errores de medicación son una de las principales causas de daño evitable en enfermería. Los 10 correctos son tu protección y la del paciente."},
    {"tipo": "seccion", "titulo": "Los 10 correctos", "texto": "1. Paciente correcto. 2. Medicamento correcto. 3. Dosis correcta. 4. Vía correcta. 5. Hora correcta. 6. Indicación correcta. 7. Registro correcto. 8. Caducidad verificada. 9. Técnica correcta. 10. Educación al paciente/familia."},
    {"tipo": "alerta", "texto": "Ante la duda: NO administres. Confirma primero con coordinación o el médico. El error de omisión documentado es siempre mejor que el error de acción."},
    {"tipo": "seccion", "titulo": "Medicamentos PRN", "texto": "Son los que se dan solo si el paciente lo necesita (dolor, fiebre, etc.). Siempre registra: qué síntoma motivó la administración, la dosis dada y la respuesta del paciente."},
    {"tipo": "punto_clave", "texto": "Registra cada dosis administrada o omitida. Si no está en plataforma, legalmente no ocurrió."},
    {"tipo": "frase_cultura", "texto": "La excelencia se nota en los detalles pequeños."}
  ]'::JSONB
),

-- Módulo 7: Prevención de lesiones por presión
(
  'Prevención de lesiones por presión',
  'Identificación de pacientes en riesgo, zonas anatómicas críticas, frecuencia de cambios posturales y primeros signos de alerta.',
  20,
  ARRAY[
    'Conozco los factores de riesgo para lesiones por presión',
    'Sé identificar las zonas anatómicas de mayor presión',
    'Conozco la frecuencia recomendada de cambios posturales',
    'Sé reconocer los estadios iniciales de una lesión por presión',
    'Sé cuándo y cómo reportar una lesión nueva o progresiva'
  ],
  '[
    {"pregunta": "¿Con qué frecuencia se deben hacer cambios posturales en un paciente en cama con riesgo de UPP?",
     "opciones": ["Una vez por turno es suficiente", "Cada 2 horas como mínimo, documentando cada cambio", "Solo cuando el paciente pide moverse", "Cada 6 horas"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Cuál es el primer signo de una lesión por presión en estadio I?",
     "opciones": ["Úlcera abierta con tejido expuesto", "Eritema no blanqueable (enrojecimiento que no se va al presionar) sobre zona de presión", "Dolor intenso en la zona", "Pérdida de sensibilidad completa"],
     "respuesta_correcta": 1},
    {"pregunta": "Si encuentras eritema no blanqueable en el sacro de tu paciente al inicio del turno, ¿qué haces?",
     "opciones": ["Registras en plataforma, aumentas la frecuencia de cambios y notificas a coordinación", "Esperas a ver si mejora sola", "Solo lo mencionas en la entrega verbal", "Aplicas crema sin reportar"],
     "respuesta_correcta": 0}
  ]'::JSONB,
  false, 7, 2,
  '[
    {"tipo": "intro", "texto": "Las úlceras por presión son prevenibles en la mayoría de los casos. Su aparición se considera un evento adverso evitable. Tu vigilancia marca la diferencia."},
    {"tipo": "seccion", "titulo": "Pacientes en mayor riesgo", "texto": "Inmovilidad, malnutrición, incontinencia, deterioro cognitivo, diabetes, edad avanzada y piel frágil aumentan el riesgo. Evalúa al inicio de cada turno."},
    {"tipo": "seccion", "titulo": "Zonas de mayor presión", "texto": "Sacro/cóccix, talones, trocánteres, codos, escápulas, occipucio, maléolos. Revisa estas zonas en cada cambio postural."},
    {"tipo": "punto_clave", "texto": "Cada 2 horas mínimo: cambia la posición. Documenta cada cambio. Si el paciente rechaza los cambios, regístralo y notifica."},
    {"tipo": "alerta", "texto": "Un estadio I detectado a tiempo y tratado correctamente no progresa. Un estadio III o IV puede tomar meses en cicatrizar."},
    {"tipo": "frase_cultura", "texto": "La excelencia se nota en los detalles pequeños."}
  ]'::JSONB
),

-- Módulo 8: Oxigenoterapia básica
(
  'Oxigenoterapia básica',
  'Dispositivos de O2 más comunes, flujos recomendados, saturación objetivo y criterios de alerta para desaturación.',
  25,
  ARRAY[
    'Conozco los dispositivos de O2 más comunes y sus indicaciones',
    'Sé los flujos de O2 habituales por dispositivo',
    'Entiendo el concepto de saturación objetivo según el paciente',
    'Sé qué hacer ante una desaturación aguda',
    'Sé cómo registrar el O2 en el reporte de turno'
  ],
  '[
    {"pregunta": "¿Cuántos litros por minuto puede administrar una cánula nasal (puntas)?",
     "opciones": ["Hasta 2 L/min", "Hasta 6 L/min", "Hasta 15 L/min", "No tiene límite"],
     "respuesta_correcta": 1},
    {"pregunta": "Un paciente con EPOC tiene una saturación objetivo diferente. ¿Por qué?",
     "opciones": ["Es un mito, todos necesitan saturación de 98-100%", "Los pacientes con EPOC pueden tener drive hipóxico; el médico define su meta de saturación (generalmente 88-92%)", "Porque necesitan más oxígeno que los demás", "No hay diferencia en el objetivo"],
     "respuesta_correcta": 1},
    {"pregunta": "Si tu paciente en O2 baja su saturación a 85%, ¿cuál es tu primera acción?",
     "opciones": ["Aumentas el flujo de O2 al máximo sin avisar", "Verificas que el dispositivo esté bien colocado, evalúas estado del paciente, ajustas O2 según indicación y notificas a coordinación", "Esperas 15 minutos para ver si mejora", "Llamas al familiar primero"],
     "respuesta_correcta": 1}
  ]'::JSONB,
  false, 8, 3,
  '[
    {"tipo": "intro", "texto": "El oxígeno es un medicamento. Administrarlo mal puede ser tan dañino como no administrarlo. Conoce bien los dispositivos y los parámetros de tu paciente."},
    {"tipo": "seccion", "titulo": "Dispositivos más comunes", "texto": "Cánula nasal (puntas): 1-6 L/min, FiO2 24-44%. Mascarilla simple: 6-10 L/min, FiO2 35-55%. Mascarilla con reservorio: 10-15 L/min, FiO2 60-90%. Mascarilla Venturi: flujo variable, FiO2 exacta según dilutores."},
    {"tipo": "seccion", "titulo": "Saturación objetivo", "texto": "General: 95-100%. EPOC: según indicación médica (88-92%). Siempre verifica la meta específica de tu paciente en su plan de cuidado."},
    {"tipo": "alerta", "texto": "Nunca aumentes el O2 más allá de lo indicado sin autorización médica, especialmente en EPOC o insuficiencia respiratoria crónica."},
    {"tipo": "punto_clave", "texto": "Registra siempre: dispositivo usado, litros/min, saturación con O2 y sin O2 (si aplica)."},
    {"tipo": "frase_cultura", "texto": "Un buen enfermero no improvisa; observa, registra y comunica."}
  ]'::JSONB
)
ON CONFLICT DO NOTHING;

-- Vincular módulos con competencias
UPDATE modulos_capacitacion SET competencia_id = (SELECT id FROM competencias WHERE nombre = 'Inducción Abastemed')
  WHERE titulo = 'Inducción Abastemed';

UPDATE modulos_capacitacion SET competencia_id = (SELECT id FROM competencias WHERE nombre = 'Uso correcto de plataforma')
  WHERE titulo = 'Uso correcto de la plataforma';

UPDATE modulos_capacitacion SET competencia_id = (SELECT id FROM competencias WHERE nombre = 'Entrega de turno estandarizada')
  WHERE titulo = 'Protocolo de entrega de turno estandarizada';

UPDATE modulos_capacitacion SET competencia_id = (SELECT id FROM competencias WHERE nombre = 'Comunicación profesional con familiares')
  WHERE titulo = 'Comunicación profesional con familiares';

UPDATE modulos_capacitacion SET competencia_id = (SELECT id FROM competencias WHERE nombre = 'Toma e interpretación de signos vitales')
  WHERE titulo = 'Signos vitales y criterios de alerta';

UPDATE modulos_capacitacion SET competencia_id = (SELECT id FROM competencias WHERE nombre = 'Administración segura de medicamentos')
  WHERE titulo = 'Administración segura de medicamentos';

UPDATE modulos_capacitacion SET competencia_id = (SELECT id FROM competencias WHERE nombre = 'Prevención de lesiones por presión')
  WHERE titulo = 'Prevención de lesiones por presión';

UPDATE modulos_capacitacion SET competencia_id = (SELECT id FROM competencias WHERE nombre = 'Oxigenoterapia básica')
  WHERE titulo = 'Oxigenoterapia básica';
