-- ============================================================
-- MIGRACIÓN: Capacitación — Cateterismo vesical intermitente
-- Nuevo módulo de capacitación vinculado a la competencia
-- "Cateterismo vesical intermitente".
--
-- También agrega el campo requiere_validacion_practica a la
-- tabla competencias, que permite distinguir entre:
--   • Evaluación teórica aprobada (estado evaluacion_aprobada)
--   • Validación práctica supervisada (estado validado)
--
-- Ejecutar en Supabase SQL Editor (idempotente).
-- ============================================================

-- ── 1. CAMPO requiere_validacion_practica ────────────────────
-- Marca competencias procedimentales que no pueden quedar en
-- estado "validado" solo por aprobar la teoría; requieren
-- supervisión presencial de coordinación clínica.

ALTER TABLE competencias
  ADD COLUMN IF NOT EXISTS requiere_validacion_practica BOOLEAN NOT NULL DEFAULT false;

-- ── 2. MARCAR competencias procedimentales ───────────────────
-- Cateterismo vesical intermitente requiere que coordinación
-- clínica confirme la ejecución supervisada del procedimiento
-- antes de considerar la competencia como validada.

UPDATE competencias
SET    requiere_validacion_practica = true
WHERE  nombre = 'Cateterismo vesical intermitente';

-- ── 3. INSERTAR módulo (idempotente vía WHERE NOT EXISTS) ────

INSERT INTO modulos_capacitacion
  (titulo, descripcion, duracion_minutos, checklist, evaluacion,
   obligatorio, orden, nivel_requerido, contenido)
SELECT
  'Cateterismo vesical intermitente seguro',

  'Preparación, realización, vigilancia y registro seguro del vaciamiento vesical intermitente en atención domiciliaria, conforme a la indicación médica y al plan de cuidados del paciente.',

  30,

  ARRAY[
    'Confirmé la identidad del paciente y la indicación médica vigente.',
    'Revisé el plan de cuidados y los parámetros específicos del procedimiento.',
    'Preparé todos los insumos antes de comenzar.',
    'Expliqué el procedimiento y protegí la privacidad del paciente.',
    'Realicé higiene de manos antes y después del procedimiento.',
    'Evité contaminar la parte del catéter que ingresaría por la uretra.',
    'Comprendo que nunca debo forzar el catéter ante resistencia.',
    'Sé reconocer las situaciones en las que debo detenerme y pedir apoyo.',
    'Sé qué características de la orina y del procedimiento debo observar.',
    'Sé cómo documentar el procedimiento de forma completa en Abastemed.',
    'Comprendo que aprobar la teoría no sustituye la validación práctica.'
  ],

  '[
    {
      "pregunta": "¿Qué debes confirmar primero antes de realizar un cateterismo vesical intermitente?",
      "opciones": [
        "Que el paciente haya bebido agua.",
        "La indicación médica, el plan de cuidados y la identidad del paciente.",
        "Que el familiar esté presente.",
        "Que el procedimiento se haya realizado el día anterior."
      ],
      "respuesta_correcta": 1
    },
    {
      "pregunta": "¿Qué debes hacer si encuentras resistencia persistente al introducir el catéter?",
      "opciones": [
        "Empujar con mayor firmeza.",
        "Cambiar de posición y continuar sin informar.",
        "Detener el procedimiento y notificar a coordinación clínica.",
        "Esperar unos segundos y forzarlo lentamente."
      ],
      "respuesta_correcta": 2
    },
    {
      "pregunta": "¿Cuál es una medida esencial para reducir el riesgo de contaminación?",
      "opciones": [
        "Tocar el catéter para comprobar su flexibilidad.",
        "Realizar higiene de manos y evitar tocar la parte que ingresará a la uretra.",
        "Utilizar siempre dos pares de guantes.",
        "Aplicar antibiótico antes de cada procedimiento."
      ],
      "respuesta_correcta": 1
    },
    {
      "pregunta": "¿Quién determina la frecuencia del cateterismo de un paciente?",
      "opciones": [
        "El enfermero según su experiencia.",
        "El familiar que se encuentre presente.",
        "La indicación médica y el plan de cuidados vigente.",
        "La duración de la guardia."
      ],
      "respuesta_correcta": 2
    },
    {
      "pregunta": "¿Cuál de los siguientes hallazgos requiere detenerse o solicitar apoyo?",
      "opciones": [
        "Drenaje esperado sin molestias.",
        "Orina en el recipiente indicado.",
        "Dolor intenso, sangrado o resistencia persistente.",
        "Que el paciente haga una pregunta."
      ],
      "respuesta_correcta": 2
    },
    {
      "pregunta": "¿Qué debe registrarse después del procedimiento?",
      "opciones": [
        "Solamente que se realizó.",
        "Únicamente el volumen de orina.",
        "Fecha, hora, volumen o características cuando aplique, tolerancia, dificultades e incidencias.",
        "Solo el nombre del enfermero."
      ],
      "respuesta_correcta": 2
    },
    {
      "pregunta": "¿Qué significa aprobar esta capacitación?",
      "opciones": [
        "Que el enfermero puede realizar inmediatamente cualquier cateterismo.",
        "Que comprendió la teoría, pero todavía puede requerir validación práctica.",
        "Que ya no necesita revisar el plan de cuidados.",
        "Que puede modificar la indicación médica."
      ],
      "respuesta_correcta": 1
    },
    {
      "pregunta": "¿Cuál es la conducta correcta respecto al calibre y tipo de catéter?",
      "opciones": [
        "Elegir siempre el más grande disponible.",
        "Utilizar el que prefiera el enfermero.",
        "Verificar el indicado para el paciente y no improvisar.",
        "Usar cualquiera si permite el drenaje."
      ],
      "respuesta_correcta": 2
    },
    {
      "pregunta": "Si después del procedimiento el paciente presenta dolor suprapúbico persistente y no hubo drenaje, debes:",
      "opciones": [
        "Esperar hasta el siguiente turno.",
        "Repetir varias veces sin avisar.",
        "Registrar y notificar inmediatamente conforme al protocolo.",
        "Dar líquidos sin consultar."
      ],
      "respuesta_correcta": 2
    },
    {
      "pregunta": "¿Cuál es la mejor descripción de un procedimiento seguro?",
      "opciones": [
        "Rápido, aunque no quede registrado.",
        "Realizado según costumbre personal.",
        "Indicado, preparado, respetuoso, sin forzar, vigilado y documentado.",
        "Realizado siempre con presencia de un familiar."
      ],
      "respuesta_correcta": 2
    }
  ]'::JSONB,

  true,
  9,
  3,

  '[
    {
      "tipo": "intro",
      "texto": "El cateterismo vesical intermitente permite vaciar temporalmente la vejiga mediante la introducción de un catéter que se retira al terminar el drenaje. Es un procedimiento invasivo y debe realizarse únicamente por personal capacitado, con indicación médica vigente y siguiendo el plan de cuidados del paciente."
    },
    {
      "tipo": "seccion",
      "titulo": "Confirma antes de actuar",
      "texto": "Verifica la identidad del paciente, la indicación médica, el horario o criterio establecido, el tipo y calibre de catéter indicado, alergias conocidas, insumos disponibles, antecedentes relevantes y el último registro del procedimiento. Si existe cualquier duda, no improvises: consulta a coordinación clínica."
    },
    {
      "tipo": "punto_clave",
      "texto": "Aprobar esta capacitación demuestra comprensión teórica. La realización autónoma del procedimiento requiere además validación práctica documentada por coordinación clínica."
    },
    {
      "tipo": "seccion",
      "titulo": "Privacidad, explicación y posición",
      "texto": "Explica el procedimiento con lenguaje claro, solicita la colaboración del paciente, protege su intimidad y colócalo en una posición segura que permita el acceso sin generar dolor ni exposición innecesaria. Conserva un trato respetuoso durante todo el procedimiento."
    },
    {
      "tipo": "seccion",
      "titulo": "Organiza antes de iniciar",
      "texto": "Prepara el equipo indicado en el plan: catéter correspondiente, guantes, material para higiene, lubricante cuando aplique, campo o superficie limpia, recipiente graduado si se medirá el volumen, bolsa para desechos y medios para realizar el registro. Revisa integridad, caducidad y compatibilidad del material."
    },
    {
      "tipo": "seccion",
      "titulo": "Higiene de manos y técnica segura",
      "texto": "Realiza higiene de manos antes y después del procedimiento. Evita tocar la parte del catéter que ingresará por la uretra. La técnica limpia o estéril debe corresponder al entorno, la indicación, el protocolo de Abastemed y las características clínicas del paciente."
    },
    {
      "tipo": "seccion",
      "titulo": "Secuencia segura",
      "texto": "Realiza la higiene genital indicada, lubrica cuando corresponda e introduce el catéter lentamente y sin ejercer fuerza. Permite el drenaje de la orina y observa sus características. Cuando el flujo termine, retira el catéter suavemente conforme al protocolo y desecha o procesa el material únicamente según las instrucciones autorizadas."
    },
    {
      "tipo": "alerta",
      "texto": "Nunca fuerces el catéter. Si encuentras resistencia persistente, dolor intenso, sangrado, imposibilidad para avanzar o una situación distinta a la esperada, detén el procedimiento y notifica a coordinación clínica."
    },
    {
      "tipo": "seccion",
      "titulo": "Qué debes observar",
      "texto": "Registra el volumen drenado cuando esté indicado, color, claridad, olor, presencia de sedimento, sangre, dolor, dificultad durante la inserción, respuesta del paciente y cualquier hallazgo relevante. Compara con registros anteriores y con los parámetros definidos en el plan de cuidados."
    },
    {
      "tipo": "alerta",
      "texto": "Notifica inmediatamente si existe imposibilidad para drenar, dolor intenso, sangrado significativo, fiebre, escalofríos, deterioro general, distensión o dolor suprapúbico persistente, alteración importante de la orina o cualquier cambio que pueda indicar lesión, obstrucción o infección."
    },
    {
      "tipo": "seccion",
      "titulo": "El procedimiento no termina hasta registrarlo",
      "texto": "Documenta fecha y hora, indicación relacionada, tipo o calibre del catéter cuando corresponda, técnica aplicada, volumen y características de la orina, tolerancia del paciente, dificultades, incidencias, acciones realizadas y personas notificadas. Nunca registres un procedimiento que no realizaste."
    },
    {
      "tipo": "frase_cultura",
      "texto": "La técnica protege el cuerpo; la atención, la dignidad; y el registro, la continuidad del cuidado."
    }
  ]'::JSONB

WHERE NOT EXISTS (
  SELECT 1 FROM modulos_capacitacion
  WHERE  titulo = 'Cateterismo vesical intermitente seguro'
);

-- ── 4. VINCULAR módulo con competencia ───────────────────────
-- Idempotente: si ya está vinculado, solo reconfirma el vínculo.

UPDATE modulos_capacitacion
SET    competencia_id = (
  SELECT id FROM competencias
  WHERE  nombre = 'Cateterismo vesical intermitente'
  LIMIT  1
)
WHERE  titulo = 'Cateterismo vesical intermitente seguro';

-- ============================================================
-- FIN MIGRACIÓN: capacitacion_cateterismo_intermitente
-- ============================================================
