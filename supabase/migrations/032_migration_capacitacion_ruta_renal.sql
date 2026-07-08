-- ============================================================
-- MIGRACIÓN: Capacitación — Ruta Renal · Fundamentos
-- Curso piloto de competencias especializadas: vigilancia
-- domiciliaria de pacientes en hemodiálisis.
--
-- Contenido clínico PENDIENTE DE VALIDACIÓN — cada bloque de
-- lección está marcado con TODO. No se publica hasta que un
-- responsable clínico registre su firma vía publicarCompetencia()
-- (lib/actions/competencias/competencias.actions.ts). Por eso la
-- competencia y el módulo quedan en DRAFT (activa=false,
-- activo=false) en esta migración.
--
-- Ejecutar en Supabase SQL Editor (idempotente).
-- ============================================================

-- ── 1. COMPETENCIA: Hemodiálisis — Vigilancia domiciliaria ───
-- Asunciones a validar con el usuario, ajustables sin migración
-- nueva (solo UPDATE): vigencia_meses=12 (recertificación anual)
-- y requiere_validacion_practica=true (procedimiento de alto
-- riesgo — la evaluación teórica no basta, requiere observación
-- presencial de coordinación clínica antes de quedar 'validado').

INSERT INTO competencias
  (nombre, descripcion, categoria, codigo, vigencia_meses,
   requiere_validacion_practica, nivel_minimo, activa, orden)
SELECT
  'Hemodiálisis — Vigilancia domiciliaria',
  'Vigilancia segura del paciente en hemodiálisis domiciliaria: reconocimiento de complicaciones, cuidado del acceso vascular y criterios de reporte inmediato.',
  'especialidades_clinicas',
  'hemodialisis_vigilancia_domiciliaria',
  12,
  true,
  3,
  false,
  19
WHERE NOT EXISTS (
  SELECT 1 FROM competencias WHERE codigo = 'hemodialisis_vigilancia_domiciliaria'
);

-- ── 2. MÓDULO: Ruta Renal — Fundamentos ──────────────────────

INSERT INTO modulos_capacitacion
  (titulo, descripcion, duracion_minutos, checklist, evaluacion,
   obligatorio, orden, nivel_requerido, evaluacion_minima, activo, contenido)
SELECT
  'Ruta Renal — Fundamentos',

  'Fundamentos de la vigilancia domiciliaria del paciente en hemodiálisis: acceso vascular, complicaciones frecuentes y criterios de reporte inmediato a coordinación clínica.',

  45,

  ARRAY[
    'Identifico los tipos de acceso vascular para hemodiálisis y sus cuidados básicos.',
    'Reconozco los signos de alarma en un acceso vascular (fístula o catéter).',
    'Sé qué parámetros vigilar antes, durante y después de la sesión de diálisis en domicilio.',
    'Reconozco los síntomas de hipotensión intradiálisis y mi primera respuesta.',
    'Conozco las restricciones de líquidos y dieta habituales del paciente renal.',
    'Sé identificar signos de sobrecarga de volumen y de deshidratación.',
    'Entiendo cuándo un hallazgo requiere notificación inmediata a coordinación clínica.',
    'Sé cómo documentar la vigilancia del paciente renal en Abastemed.',
  ],

  '[
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Cuál es un signo de alarma en una fístula arteriovenosa?",
     "opciones": ["Frémito presente y continuo", "Ausencia de frémito o soplo", "Piel tibia alrededor del acceso", "Cicatrización normal"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Qué debes evitar hacer siempre en el brazo del acceso vascular?",
     "opciones": ["Tomar presión arterial o puncionar en ese brazo", "Mantenerlo elevado", "Revisarlo a diario", "Palpar el frémito"],
     "respuesta_correcta": 0},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Cuál es un síntoma frecuente de hipotensión intradiálisis?",
     "opciones": ["Cefalea leve", "Mareo, náusea y sudoración fría", "Aumento de apetito", "Somnolencia post-sesión únicamente"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Ante síntomas de hipotensión intradiálisis, tu primera acción es:",
     "opciones": ["Esperar a que termine la sesión", "Seguir el protocolo indicado y notificar de inmediato al personal responsable de la sesión", "Dar líquidos por vía oral sin evaluar", "Aumentar el flujo de la máquina"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Qué indica un aumento súbito de peso entre sesiones?",
     "opciones": ["Mejora del estado nutricional", "Posible sobrecarga de volumen por retención de líquidos", "No tiene relevancia clínica", "Pérdida de masa muscular"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Qué debes revisar en el sitio de un catéter venoso central para diálisis?",
     "opciones": ["Solo si el paciente refiere dolor", "Signos de infección: enrojecimiento, secreción, dolor o fiebre asociada", "El color del cabello del paciente", "Nada, es responsabilidad exclusiva del nefrólogo"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — La restricción de líquidos en el paciente renal habitualmente busca:",
     "opciones": ["Provocar deshidratación", "Evitar sobrecarga de volumen entre sesiones de diálisis", "Reducir el apetito", "No tiene relación con el tratamiento"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Cuál de los siguientes es un signo de deshidratación en el paciente renal?",
     "opciones": ["Edema en miembros inferiores", "Hipotensión, mareo y mucosas secas", "Aumento de peso", "Distensión abdominal"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Si notas sangrado activo en el sitio del acceso vascular, debes:",
     "opciones": ["Esperar a que se detenga solo", "Aplicar presión según protocolo y notificar de inmediato a coordinación clínica", "Cubrir sin presión y continuar la actividad normal", "Retirar cualquier apósito para observar mejor"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Qué significa aprobar esta capacitación?",
     "opciones": ["Que el enfermero puede manejar cualquier complicación de forma autónoma", "Que comprendió la teoría, pero la competencia requiere validación práctica antes de considerarse otorgada", "Que ya no necesita reportar hallazgos", "Que sustituye la indicación médica"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Qué debe registrarse tras la vigilancia de una sesión de hemodiálisis domiciliaria?",
     "opciones": ["Solo si hubo una complicación", "Parámetros vigilados, estado del acceso vascular, tolerancia del paciente y cualquier hallazgo o notificación realizada", "Únicamente la hora de inicio y fin", "No es necesario documentarlo"],
     "respuesta_correcta": 1},
    {"pregunta": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — ¿Cuál es la conducta correcta ante cualquier duda durante la vigilancia del paciente renal?",
     "opciones": ["Improvisar según experiencia previa", "Consultar de inmediato con coordinación clínica antes de actuar", "Esperar al siguiente turno para reportarlo", "Preguntar al familiar presente"],
     "respuesta_correcta": 1}
  ]'::JSONB,

  false, 10, 3, 80, false,

  '[
    {"tipo": "intro", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Responsable: ___ Cédula: ___ Fecha: ___. Este módulo introduce los fundamentos de la vigilancia domiciliaria del paciente en hemodiálisis: qué observar, qué evitar y cuándo notificar de inmediato a coordinación clínica."},
    {"tipo": "seccion", "titulo": "Tipos de acceso vascular", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Fístula arteriovenosa, injerto y catéter venoso central. Cuidados básicos y diferencias de vigilancia entre cada tipo."},
    {"tipo": "alerta", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Nunca tomar presión arterial, puncionar ni tomar muestras de sangre en el brazo del acceso vascular."},
    {"tipo": "seccion", "titulo": "Signos de alarma en el acceso vascular", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Ausencia de frémito o soplo, sangrado activo, signos de infección (enrojecimiento, calor, secreción, fiebre), dolor o edema del miembro."},
    {"tipo": "seccion", "titulo": "Vigilancia antes, durante y después de la sesión", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Parámetros a vigilar en cada etapa de la sesión de diálisis domiciliaria y su registro correcto en Abastemed."},
    {"tipo": "punto_clave", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Aprobar la evaluación teórica no sustituye la validación práctica presencial requerida por coordinación clínica."},
    {"tipo": "seccion", "titulo": "Hipotensión intradiálisis", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Síntomas frecuentes (mareo, náusea, sudoración fría) y la respuesta inicial según el protocolo vigente."},
    {"tipo": "seccion", "titulo": "Balance de líquidos y peso", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Restricciones habituales de líquidos y dieta, signos de sobrecarga de volumen y signos de deshidratación."},
    {"tipo": "alerta", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Cualquier sangrado activo, signo de infección del acceso, hipotensión sintomática persistente o deterioro del estado general debe notificarse de inmediato a coordinación clínica."},
    {"tipo": "seccion", "titulo": "Documentación de la vigilancia", "texto": "TODO: PENDIENTE VALIDACIÓN CLÍNICA — Qué registrar tras cada sesión: parámetros vigilados, estado del acceso, tolerancia del paciente, hallazgos y notificaciones realizadas."},
    {"tipo": "frase_cultura", "texto": "La vigilancia atenta de hoy evita la complicación de mañana."}
  ]'::JSONB

WHERE NOT EXISTS (
  SELECT 1 FROM modulos_capacitacion WHERE titulo = 'Ruta Renal — Fundamentos'
);

-- ── 3. VINCULAR módulo con competencia ───────────────────────
-- Idempotente: si ya está vinculado, solo reconfirma el vínculo.

UPDATE modulos_capacitacion
SET    competencia_id = (
  SELECT id FROM competencias
  WHERE  codigo = 'hemodialisis_vigilancia_domiciliaria'
  LIMIT  1
)
WHERE  titulo = 'Ruta Renal — Fundamentos';

-- ============================================================
-- FIN MIGRACIÓN: capacitacion_ruta_renal
-- Curso y competencia quedan en DRAFT. Publicar solo después de
-- validación clínica del contenido vía publicarCompetencia().
-- ============================================================
