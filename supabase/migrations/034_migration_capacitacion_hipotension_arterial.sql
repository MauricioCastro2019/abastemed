-- ============================================================
-- MIGRACIÓN: Capacitación — Hipotensión arterial y actuación
-- ante una TA crítica
--
-- Módulo de capacitación con navegación por lección (16 lecciones),
-- calculadora de PAM interactiva, caso clínico interactivo y
-- plantilla de reporte copiable. Caso central: TA 50/20 mmHg.
--
-- NOTA DE GOBERNANZA: el contenido clínico de este módulo fue
-- redactado siguiendo un spec educativo detallado, pero — igual
-- que cualquier contenido clínico nuevo de la plataforma — debe
-- ser revisado por un responsable clínico antes de considerarse
-- protocolo oficial de Abastemed. Se publica activo=true para
-- permitir su uso y prueba inmediata (a diferencia de Ruta Renal,
-- que quedó en DRAFT), pero esa revisión sigue pendiente.
--
-- Ejecutar en Supabase SQL Editor (idempotente).
-- ============================================================

-- ── 1. COLUMNA leccion_actual EN progreso_capacitacion ───────
-- Bookmark de lección para reanudar la capacitación donde el
-- enfermero se quedó. Nullable — no afecta módulos existentes,
-- que no usan navegación por lección.

ALTER TABLE progreso_capacitacion
  ADD COLUMN IF NOT EXISTS leccion_actual INT;

-- ── 2. COMPETENCIA: Reconocimiento y manejo inicial de ───────
--    hipotensión arterial crítica
-- No requiere validación práctica: es reconocimiento y actuación
-- inicial segura (conocimiento teórico), no un procedimiento
-- invasivo como cateterismo o hemodiálisis. Sin vigencia (igual
-- que "Toma e interpretación de signos vitales").

INSERT INTO competencias
  (nombre, descripcion, categoria, codigo, vigencia_meses,
   requiere_validacion_practica, nivel_minimo, activa, orden)
SELECT
  'Reconocimiento y manejo inicial de hipotensión arterial crítica',
  'Interpretación de la tensión arterial, reconocimiento de hipoperfusión y actuación inicial segura ante una TA crítica, con caso central de TA 50/20 mmHg.',
  'urgencias',
  'hipotension_arterial_critica',
  NULL,
  false,
  1,
  true,
  20
WHERE NOT EXISTS (
  SELECT 1 FROM competencias WHERE codigo = 'hipotension_arterial_critica'
);

-- ── 3. MÓDULO: Hipotensión arterial y actuación ──────────────
--    ante una TA crítica

INSERT INTO modulos_capacitacion
  (titulo, descripcion, duracion_minutos, checklist, evaluacion,
   obligatorio, orden, nivel_requerido, evaluacion_minima, activo, contenido)
SELECT
  'Hipotensión arterial y actuación ante una TA crítica',

  'Cómo interpretar una tensión arterial baja, reconocer signos de hipoperfusión y actuar de manera segura',

  30,

  ARRAY[
    'Entiendo que una TA de 50/20 mmHg es una cifra extremadamente baja y debo tratarla como una emergencia médica hasta demostrar lo contrario.',
    'Sé calcular e interpretar la presión arterial media (PAM) de forma educativa, sin usarla para diagnosticar.',
    'Sé que una saturación de oxígeno normal no descarta hipoperfusión ni choque.',
    'Sé confirmar una lectura crítica sin retrasar la activación de atención médica urgente cuando el paciente está deteriorado.',
    'No dejaré caminar ni sentaré bruscamente a un paciente con una TA crítica.',
    'No daré café, sal, líquidos por vía oral de forma indiscriminada, ni medicamentos por iniciativa propia ante una TA crítica.',
    'Entiendo que cualquier solución intravenosa requiere indicación médica, con mayor precaución en pacientes renales o cardiacos.',
    'Sé qué datos debo observar y documentar: conciencia, piel, pulso, respiración, diuresis y síntomas referidos.',
    'Sé cómo notificar a coordinación clínica y/o familiares de forma clara y oportuna.',
    'Entiendo que este módulo es educativo y no sustituye la valoración médica ni los protocolos institucionales vigentes.'
  ],

  '[
    {"pregunta": "¿Qué representa el número superior (sistólico) de la tensión arterial?",
     "opciones": ["La presión mientras el corazón se relaja", "La presión cuando el corazón se contrae y expulsa sangre", "El promedio entre ambas presiones", "La frecuencia cardiaca"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Qué representa el número inferior (diastólico)?",
     "opciones": ["La presión cuando el corazón se contrae", "La presión mientras el corazón se relaja entre latidos", "La presión arterial media", "La saturación de oxígeno"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Cuál es la PAM aproximada de una TA de 50/20 mmHg?",
     "opciones": ["50 mmHg", "40 mmHg", "30 mmHg", "20 mmHg"],
     "respuesta_correcta": 2},
    {"pregunta": "¿Una SpO₂ de 96% descarta hipoperfusión?",
     "opciones": ["Sí, siempre", "No, la saturación no indica cuánta sangre llega a los órganos", "Solo si el paciente está despierto", "Sí, si la frecuencia cardiaca también es normal"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Cuál de los siguientes signos puede indicar disminución del flujo cerebral?",
     "opciones": ["Apetito aumentado", "Confusión, somnolencia inusual o pérdida de conciencia", "Aumento de la diuresis", "Piel tibia y sonrosada"],
     "respuesta_correcta": 1},
    {"pregunta": "Ante una TA crítica y un paciente con deterioro (confusión, dificultad respiratoria o pérdida de conciencia), ¿qué debe hacerse primero?",
     "opciones": ["Repetir la toma varias veces antes de avisar", "Activar atención médica de emergencia de inmediato", "Darle de comer para que recupere fuerzas", "Esperar el cambio de turno para reportarlo"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Debe darse café o una bebida energética para elevar la presión?",
     "opciones": ["Sí, es un tratamiento efectivo y seguro", "No, no debe usarse como tratamiento; puede enmascarar síntomas y no corrige la causa", "Solo si el paciente lo pide", "Sí, pero solo en pacientes jóvenes"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Puede administrarse una solución intravenosa sin indicación médica?",
     "opciones": ["Sí, siempre que el paciente esté consciente", "No, toda reposición intravenosa requiere indicación médica", "Sí, si la TA es menor de 90/60", "Solo en pacientes renales"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Por qué un paciente renal requiere especial precaución con los líquidos intravenosos?",
     "opciones": ["Porque nunca necesitan líquidos", "Porque administrar líquidos sin valorar puede provocar sobrecarga, edema y dificultad respiratoria", "Porque siempre están deshidratados", "Porque los líquidos no afectan su presión"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Una frecuencia cardiaca normal descarta un estado de choque?",
     "opciones": ["Sí, siempre", "No, una frecuencia cardiaca normal no descarta gravedad", "Sí, si el paciente está despierto", "Solo en adultos mayores"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Qué datos deben documentarse ante un episodio de hipotensión?",
     "opciones": ["Únicamente la cifra de tensión arterial", "TA inicial y de confirmación, estado de conciencia, síntomas, pulso, respiración, saturación, piel, diuresis y evolución", "Solo si hubo traslado", "Solo el nombre del enfermero que tomó la presión"],
     "respuesta_correcta": 1},
    {"pregunta": "Si la primera lectura de TA parece improbable (por ejemplo, extremadamente baja), ¿qué debe hacerse?",
     "opciones": ["Descartarla sin más y no repetirla", "Confirmar tamaño y colocación del brazalete y repetir la medición, sin retrasar la atención si hay deterioro", "Ignorarla si el paciente se ve bien", "Registrarla y no decir nada a nadie"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Puede dejarse caminar a un paciente con una TA de 50/20 mmHg?",
     "opciones": ["Sí, para que se reactive la circulación", "No, debe evitarse que camine por el riesgo de caída y deterioro súbito", "Sí, si lo pide el paciente", "Solo si va acompañado"],
     "respuesta_correcta": 1},
    {"pregunta": "¿Qué órganos pueden afectarse por la hipoperfusión prolongada?",
     "opciones": ["Solo el corazón", "Cerebro, corazón, riñones, pulmones y sistema digestivo, entre otros", "Solo la piel", "Ningún órgano si el paciente está consciente"],
     "respuesta_correcta": 1},
    {"pregunta": "Si la presión mejora poco después del episodio, ¿puede ignorarse lo ocurrido?",
     "opciones": ["Sí, si mejoró ya no importa", "No, el episodio debe documentarse y notificarse igualmente, describiendo síntomas, conciencia y evolución", "Sí, solo se reporta si el paciente se desmaya", "No es necesario informar a nadie"],
     "respuesta_correcta": 1}
  ]'::JSONB,

  true, 11, 1, 80, true,

  '[
    {"tipo": "intro", "leccion": 1, "leccionTitulo": "Qué es la tensión arterial",
     "texto": "La tensión arterial es la fuerza que permite que la sangre circule y entregue oxígeno a los tejidos. Sin esa fuerza, el corazón no puede impulsar la sangre hacia el cerebro, los riñones, el corazón mismo y el resto de los órganos."},
    {"tipo": "seccion", "leccion": 1, "titulo": "Presión y flujo no son lo mismo",
     "texto": "La presión es la fuerza dentro de las arterias; el flujo es la cantidad de sangre que realmente llega a cada órgano por minuto. Cuando la presión cae demasiado, el flujo también cae, y los órganos empiezan a recibir menos oxígeno y nutrientes."},
    {"tipo": "punto_clave", "leccion": 1,
     "texto": "Cuanto más baja la presión, mayor es el riesgo de que la sangre deje de llegar de forma suficiente al cerebro, al corazón y a los riñones."},
    {"tipo": "seccion", "leccion": 1, "titulo": "Por qué importa para enfermería",
     "texto": "Reconocer a tiempo una tensión arterial peligrosamente baja, y actuar con calma y precisión, puede ser la diferencia entre una complicación controlada y una urgencia real."},
    {"tipo": "alerta", "leccion": 1,
     "texto": "Este contenido es educativo y no sustituye protocolos institucionales, valoración médica ni servicios de emergencia."},

    {"tipo": "seccion", "leccion": 2, "leccionTitulo": "Presión sistólica y diastólica",
     "titulo": "Dos números, dos momentos del latido",
     "texto": "El número superior es la presión sistólica: la fuerza cuando el corazón se contrae y expulsa sangre. El número inferior es la presión diastólica: la presión que queda en las arterias mientras el corazón se relaja entre un latido y otro. Ambas importan: una sistólica baja reduce el impulso de cada latido, y una diastólica baja reduce la presión de llenado entre latidos."},
    {"tipo": "comparador", "leccion": 2,
     "comparador": {
       "izquierda": {"titulo": "TA 120/80 mmHg — habitual", "items": ["120: presión al contraerse el corazón (sistólica).", "80: presión mientras el corazón se relaja (diastólica)."]},
       "derecha": {"titulo": "TA 50/20 mmHg — crítica", "critico": true, "items": ["50: el impulso máximo del corazón es extremadamente bajo.", "20: la presión entre latidos también es extremadamente baja."]}
     }},
    {"tipo": "punto_clave", "leccion": 2,
     "texto": "Los dos números afectan la perfusión de los órganos. Ninguno debe leerse de forma aislada."},

    {"tipo": "seccion", "leccion": 3, "leccionTitulo": "Presión arterial media (PAM)",
     "titulo": "Qué es la PAM",
     "texto": "La presión arterial media (PAM) aproxima la presión promedio con la que la sangre perfunde los órganos durante todo el ciclo cardiaco. Se calcula así: presión de pulso = sistólica − diastólica. PAM aproximada = diastólica + un tercio de la presión de pulso."},
    {"tipo": "seccion", "leccion": 3, "titulo": "Ejemplo con el caso central: TA 50/20",
     "texto": "Presión de pulso = 50 − 20 = 30. PAM aproximada = 20 + un tercio de 30 = 20 + 10 = 30 mmHg."},
    {"tipo": "punto_clave", "leccion": 3,
     "texto": "Una PAM cercana a 30 mmHg es extremadamente baja y puede ser insuficiente para mantener una perfusión adecuada de órganos vitales."},
    {"tipo": "calculadora_pam", "leccion": 3, "titulo": "Calcula tú mismo"},

    {"tipo": "seccion", "leccion": 4, "leccionTitulo": "Rangos prácticos de tensión arterial",
     "texto": "Esta escala es orientativa y ayuda a ubicar una lectura dentro de un contexto de severidad. No sustituye protocolos médicos o institucionales."},
    {"tipo": "tabla_rangos", "leccion": 4,
     "filas": [
       {"etiqueta": "Rango frecuente en adultos", "valor": "110–120 / 70–80 mmHg", "nivel": "normal"},
       {"etiqueta": "Puede ser tolerable si es habitual y sin síntomas", "valor": "100–109 / 60–69 mmHg", "nivel": "normal"},
       {"etiqueta": "Hipotensión — valorar síntomas, contexto y causa", "valor": "Menor de 90/60 mmHg", "nivel": "atencion"},
       {"etiqueta": "Hipotensión significativa", "valor": "Sistólica 80–89 mmHg", "nivel": "atencion"},
       {"etiqueta": "Hipotensión grave", "valor": "Sistólica 70–79 mmHg", "nivel": "alerta"},
       {"etiqueta": "Situación crítica", "valor": "Sistólica menor de 70 mmHg", "nivel": "critico"},
       {"etiqueta": "Hipotensión extrema — emergencia médica hasta demostrar lo contrario", "valor": "TA 50/20 mmHg", "nivel": "critico"}
     ]},
    {"tipo": "alerta", "leccion": 4,
     "texto": "Los números no deben interpretarse de manera aislada. También importa el estado de conciencia, la respiración, el pulso, la piel, la orina, los síntomas y la velocidad con la que descendió la presión."},
    {"tipo": "alerta", "leccion": 4,
     "texto": "Una persona puede manejar presiones habitualmente bajas, pero una TA de 50/20 no debe considerarse normal únicamente porque el paciente acostumbra tener hipotensión."},

    {"tipo": "seccion", "leccion": 5, "leccionTitulo": "Qué ocurre dentro del cuerpo",
     "texto": "Cuando la presión cae, el cuerpo pasa por etapas progresivas. Reconocer la primera etapa a tiempo es lo que permite evitar que el cuadro avance."},
    {"tipo": "linea_progresion", "leccion": 5,
     "etapas": [
       {"titulo": "Etapa 1. Compensación", "items": ["Aumenta la frecuencia cardiaca.", "Contrae vasos sanguíneos.", "Redirige sangre hacia cerebro y corazón.", "Retiene agua y sodio.", "Puede aparecer palidez, sudor frío y palpitaciones."]},
       {"titulo": "Etapa 2. Hipoperfusión", "items": ["Llega menos sangre a los tejidos.", "Disminuye el suministro de oxígeno.", "Las células producen menos energía.", "Puede elevarse el lactato.", "Comienza el deterioro de la función orgánica."]},
       {"titulo": "Etapa 3. Daño orgánico", "items": ["Cerebro: confusión, somnolencia, desmayo.", "Corazón: arritmias, isquemia o deterioro del bombeo.", "Riñones: disminución o ausencia de orina.", "Pulmones: respiración rápida o dificultad respiratoria.", "Hígado e intestino: deterioro por falta de perfusión.", "Sistema general: choque, pérdida de conciencia o paro."]}
     ]},
    {"tipo": "punto_clave", "leccion": 5,
     "texto": "Cuanto antes se reconozca la etapa de compensación, mayor es la posibilidad de evitar que el cuadro avance a hipoperfusión y daño orgánico."},

    {"tipo": "seccion", "leccion": 6, "leccionTitulo": "Qué puede sentir el paciente",
     "texto": "Lo que el paciente puede referir varía de persona a persona. Escuchar con atención sus propias palabras es tan importante como medir la presión."},
    {"tipo": "lista_categorias", "leccion": 6,
     "categorias": [
       {"titulo": "Síntomas frecuentes", "items": ["Mareo", "Debilidad extrema", "Sensación de desmayo", "Visión borrosa", "Visión en túnel", "Manchas negras", "Zumbido de oídos", "Náusea", "Sudor frío", "Palpitaciones", "Frío", "Falta de fuerza para sentarse o caminar", "Sensación de que “todo se apaga”", "Dificultad para concentrarse", "Somnolencia repentina"]},
       {"titulo": "Frases que puede decir el paciente", "items": ["“Siento que me voy.”", "“Veo oscuro.”", "“Me siento muy débil.”", "“Me estoy mareando.”", "“No tengo fuerzas.”", "“Siento frío.”", "“Me late raro el corazón.”"]}
     ]},
    {"tipo": "alerta", "leccion": 6,
     "texto": "En adultos mayores o pacientes con deterioro cognitivo, el paciente puede no expresar mareo. Puede manifestarlo como irritabilidad, somnolencia, negativa a cooperar, desorientación o cambio repentino de conducta."},

    {"tipo": "seccion", "leccion": 7, "leccionTitulo": "Qué debe observar enfermería",
     "texto": "Más allá de lo que el paciente refiere, hay signos observables que enfermería debe revisar de forma sistemática."},
    {"tipo": "lista_categorias", "leccion": 7,
     "categorias": [
       {"titulo": "Estado neurológico", "items": ["Confusión", "Desorientación", "Respuestas lentas", "Somnolencia inusual", "Dificultad para despertarlo", "Agitación", "Mirada fija", "Pérdida de conciencia", "Convulsiones"]},
       {"titulo": "Piel y circulación", "items": ["Palidez", "Coloración grisácea", "Sudor frío", "Manos y pies fríos", "Piel moteada", "Labios o uñas azuladas", "Relleno capilar lento"]},
       {"titulo": "Pulso", "items": ["Pulso débil", "Pulso rápido", "Pulso irregular", "Pulso difícil de palpar", "Pulso anormalmente lento"]},
       {"titulo": "Respiración", "items": ["Respiración rápida", "Respiración superficial", "Dificultad respiratoria", "Uso de músculos accesorios", "Pausas o cambios en el patrón respiratorio"]},
       {"titulo": "Eliminación", "items": ["Disminución de orina", "Varias horas sin orinar", "Orina oscura o muy concentrada"]}
     ]},
    {"tipo": "punto_clave", "leccion": 7,
     "texto": "Una frecuencia cardiaca normal no descarta gravedad."},
    {"tipo": "seccion", "leccion": 7,
     "texto": "En pacientes con enfermedad renal, interpreta la diuresis considerando su condición basal."},

    {"tipo": "seccion", "leccion": 8, "leccionTitulo": "Una saturación normal no descarta choque",
     "texto": "La saturación de oxígeno indica cuánto oxígeno transporta la hemoglobina detectada, pero no indica cuánto volumen de sangre está llegando a los órganos."},
    {"tipo": "seccion", "leccion": 8, "titulo": "Una analogía útil",
     "texto": "Los camiones pueden llevar el 96% de su carga de oxígeno, pero si casi ningún camión circula, los órganos siguen recibiendo poco oxígeno."},
    {"tipo": "lista_categorias", "leccion": 8,
     "categorias": [
       {"titulo": "La entrega de oxígeno depende de", "items": ["Saturación", "Cantidad de hemoglobina", "Cantidad de sangre bombeada", "Perfusión de los tejidos"]}
     ]},
    {"tipo": "alerta", "leccion": 8,
     "texto": "Una SpO₂ de 96% no vuelve segura una TA de 50/20."},

    {"tipo": "seccion", "leccion": 9, "leccionTitulo": "Posibles causas de hipotensión extrema",
     "texto": "La cifra de presión no revela por sí sola la causa. Conocer las categorías posibles ayuda a enfermería a observar mejor y a comunicar hallazgos con más precisión — el diagnóstico y el tratamiento siguen siendo responsabilidad médica."},
    {"tipo": "tarjetas", "leccion": 9,
     "tarjetas": [
       {"titulo": "Hipovolemia", "descripcion": "Falta de volumen circulante.", "items": ["Deshidratación", "Ingesta insuficiente", "Diarrea", "Vómito", "Sangrado", "Fiebre", "Diuréticos", "Extracción excesiva de líquido durante hemodiálisis"]},
       {"titulo": "Causa cardiaca", "descripcion": "El corazón no bombea adecuadamente.", "items": ["Infarto", "Insuficiencia cardiaca", "Arritmias", "Problemas valvulares", "Deterioro del músculo cardiaco"]},
       {"titulo": "Vasodilatación grave", "descripcion": "Los vasos sanguíneos pierden demasiado tono.", "items": ["Sepsis", "Anafilaxia", "Reacciones medicamentosas", "Alteraciones neurológicas", "Problemas endocrinos"]},
       {"titulo": "Obstrucción del flujo sanguíneo", "items": ["Embolia pulmonar masiva", "Taponamiento cardiaco", "Neumotórax a tensión", "Otras obstrucciones graves"]}
     ]},
    {"tipo": "punto_clave", "leccion": 9,
     "texto": "La cifra de presión no revela por sí sola la causa. El tratamiento depende del origen del problema."},
    {"tipo": "alerta", "leccion": 9,
     "texto": "No toda presión baja se corrige con líquidos intravenosos: la conducta depende de la causa y siempre requiere indicación médica."},

    {"tipo": "seccion", "leccion": 10, "leccionTitulo": "Pacientes renales y en hemodiálisis",
     "texto": "La hemodiálisis puede asociarse con hipotensión: puede extraerse demasiado líquido o demasiado rápido, y el paciente puede presentar mareo, debilidad, náusea o desmayo."},
    {"tipo": "lista_categorias", "leccion": 10,
     "categorias": [
       {"titulo": "Qué debe revisarse", "items": ["Ingesta de líquidos", "Peso antes y después de la sesión", "Ultrafiltración realizada", "Medicamentos recientes", "Condición cardiaca del paciente", "Evolución tras la sesión"]}
     ]},
    {"tipo": "seccion", "leccion": 10,
     "texto": "No toda hipotensión posterior a diálisis se debe automáticamente a la diálisis. También deben descartarse sangrado, infección, arritmias, deshidratación u otras causas."},
    {"tipo": "alerta", "leccion": 10,
     "texto": "En pacientes renales, la decisión de administrar líquidos debe considerar tanto la posibilidad de deshidratación como el riesgo de sobrecarga."},
    {"tipo": "seccion", "leccion": 10,
     "texto": "Toda reposición intravenosa debe realizarse bajo indicación médica. Administrar soluciones sin valorar sobrecarga puede provocar edema y dificultad respiratoria."},

    {"tipo": "seccion", "leccion": 11, "leccionTitulo": "Cómo confirmar una lectura crítica",
     "titulo": "Confirmar sin retrasar la atención",
     "texto": "Ante una lectura extrema, confirma con técnica correcta — pero sin que la confirmación retrase la activación de ayuda si el paciente está deteriorado."},
    {"tipo": "lista_categorias", "leccion": 11,
     "categorias": [
       {"titulo": "Pasos para confirmar", "items": [
         "1. Valora rápidamente el estado de conciencia y la respiración.",
         "2. Si el paciente está deteriorado, activa atención médica de emergencia de inmediato.",
         "3. Repite la tensión arterial.",
         "4. Confirma tamaño y colocación del brazalete.",
         "5. Coloca el brazalete sobre la piel.",
         "6. Mantén el brazo apoyado a nivel del corazón.",
         "7. Evita movimiento y conversación durante la toma.",
         "8. Repite la medición después de aproximadamente un minuto.",
         "9. Confirma manualmente cuando sea posible y exista personal capacitado.",
         "10. Revisa el pulso de forma simultánea.",
         "11. Compara con la tensión habitual del paciente.",
         "12. Registra hora, posición, brazo, aparato y síntomas."
       ]}
     ]},
    {"tipo": "alerta", "leccion": 11,
     "texto": "La repetición de la medición no debe utilizarse como motivo para retrasar una ambulancia o valoración urgente cuando el paciente presenta deterioro."},

    {"tipo": "seccion", "leccion": 12, "leccionTitulo": "Qué datos deben registrarse",
     "texto": "Completa lo que corresponda de tu valoración y usa la plantilla de abajo para tu reporte de turno. No se guarda en la plataforma ni se envía a ningún lado automáticamente."},
    {"tipo": "checklist_reporte", "leccion": 12},
    {"tipo": "punto_clave", "leccion": 12,
     "texto": "Un registro completo protege al paciente, a la familia y al equipo de enfermería."},

    {"tipo": "alerta", "leccion": 13, "leccionTitulo": "Actuación inicial segura",
     "titulo": "Qué hacer ante una TA cercana a 50/20",
     "texto": "Considera esta lectura una emergencia hasta demostrar lo contrario. Ante una cifra crítica acompañada de deterioro, se debe activar atención médica urgente."},
    {"tipo": "lista_categorias", "leccion": 13,
     "categorias": [
       {"titulo": "Pasos de actuación inicial", "items": [
         "1. Considera la lectura una emergencia hasta demostrar lo contrario.",
         "2. Solicita atención médica urgente o activa servicios de emergencia.",
         "3. No permitas que el paciente camine.",
         "4. Colócalo acostado, si su condición lo permite.",
         "5. Vigila continuamente conciencia, respiración y pulso.",
         "6. Mantenlo abrigado.",
         "7. Afloja ropa que dificulte la respiración.",
         "8. Si vomita y no hay sospecha de lesión de columna, colócalo de lado.",
         "9. No ofrezcas alimentos o líquidos si está somnoliento, confundido o con riesgo de aspiración.",
         "10. Controla sangrado visible con presión directa.",
         "11. Prepara información clínica, medicamentos y antecedentes para el traslado.",
         "12. Si deja de respirar o pierde signos de circulación, inicia el protocolo de reanimación correspondiente por personal capacitado."
       ]}
     ]},
    {"tipo": "alerta", "leccion": 13,
     "texto": "La colocación de piernas elevadas no debe realizarse de manera automática en todos los casos. Debe evitarse cuando existe dificultad respiratoria, traumatismo, dolor importante, sospecha de sobrecarga de líquidos u otra contraindicación clínica."},
    {"tipo": "seccion", "leccion": 13,
     "texto": "Estas acciones son de seguridad general mientras se activa ayuda; no sustituyen indicaciones médicas específicas para cada paciente."},

    {"tipo": "seccion", "leccion": 14, "leccionTitulo": "Qué no debe hacerse",
     "texto": "Ninguno de los siguientes puntos debe realizarse ante una TA crítica. Si algo de esto llegó a ocurrir, repórtalo con precisión en vez de omitirlo."},
    {"tipo": "lista_categorias", "leccion": 14,
     "categorias": [
       {"titulo": "Sobre la interpretación", "advertencia": true, "items": ["Normalizar una TA de 50/20.", "Asumir que el paciente está estable porque está despierto.", "Asumir que está estable porque la saturación es normal.", "Omitir el episodio si la presión posteriormente mejora."]},
       {"titulo": "Sobre la movilización y estimulación", "advertencia": true, "items": ["Dejar al paciente caminando.", "Sentarlo o levantarlo para que “reaccione”."]},
       {"titulo": "Sobre medicamentos y líquidos", "advertencia": true, "items": ["Dar café o bebidas energéticas como tratamiento.", "Administrar sal sin indicación.", "Dar medicamentos adicionales por iniciativa propia.", "Suspender o duplicar medicamentos sin instrucción médica.", "Administrar soluciones intravenosas de manera improvisada.", "Dar grandes cantidades de líquido a un paciente renal o cardiaco sin valoración."]},
       {"titulo": "Sobre el registro y la comunicación", "advertencia": true, "items": ["Esperar varias horas solamente tomando la presión.", "Reportar solamente el número sin describir síntomas, conciencia y evolución.", "Discutir causas, errores operativos o asuntos internos frente al paciente o familiares.", "Presentar una opinión personal como diagnóstico confirmado."]}
     ]},

    {"tipo": "seccion", "leccion": 15, "leccionTitulo": "Escenario clínico interactivo",
     "texto": "Responde cada pregunta y revisa la explicación antes de continuar. Este ejercicio es de práctica y no forma parte de tu calificación final."},
    {"tipo": "caso_interactivo", "leccion": 15,
     "caso": {
       "escenario": "Paciente adulto mayor con enfermedad renal, hemodiálisis reciente, baja ingesta, debilidad y diarrea. Se obtiene una TA de 50/20 mmHg, FC 85 y SpO₂ 96%. El paciente se encuentra acostado y responde lentamente.",
       "preguntas": [
         {"pregunta": "¿La saturación de 96% descarta gravedad?", "respuesta": "No.", "explicacion": "La SpO₂ no indica cuánta sangre está llegando a los órganos; con esta TA, la perfusión puede estar gravemente comprometida aunque la saturación sea normal."},
         {"pregunta": "¿Una frecuencia cardiaca de 85 descarta choque?", "respuesta": "No.", "explicacion": "Una FC dentro de rangos habituales no descarta gravedad, sobre todo si el paciente no logra compensar más o toma medicamentos que limitan la taquicardia."},
         {"pregunta": "¿Debe permitirse que el paciente camine al baño?", "respuesta": "No.", "explicacion": "Con esta TA, caminar aumenta el riesgo de caída y de deterioro súbito."},
         {"pregunta": "¿Debe repetirse la TA?", "respuesta": "Sí.", "explicacion": "Repetir la medición con técnica correcta confirma la lectura, siempre sin retrasar la activación de ayuda si hay deterioro."},
         {"pregunta": "¿La repetición debe retrasar la llamada de emergencia?", "respuesta": "No.", "explicacion": "Si el paciente está deteriorado, la ayuda se activa de inmediato; la confirmación de la medición ocurre en paralelo, no antes."},
         {"pregunta": "¿Puede administrarse una solución intravenosa sin indicación médica?", "respuesta": "No.", "explicacion": "Toda reposición intravenosa requiere indicación médica, con mayor precaución en un paciente renal por el riesgo de sobrecarga."},
         {"pregunta": "¿Qué datos deben notificarse?", "respuesta": "TA inicial y confirmada, estado de conciencia, síntomas, pulso, respiración, saturación, piel, diuresis, ingesta, medicamentos, última hemodiálisis y evolución.", "explicacion": "Un reporte completo permite que coordinación clínica valore el caso con precisión y decida los siguientes pasos."},
         {"pregunta": "¿Qué posibles causas deben considerarse?", "respuesta": "Deshidratación, extracción excesiva de líquido en diálisis, sangrado, infección, arritmia, causa cardiaca, medicamentos y otras causas.", "explicacion": "La cifra de presión no indica la causa por sí sola; describir el contexto completo ayuda a que el equipo médico oriente el origen del cuadro."}
       ]
     }},

    {"tipo": "resumen_final", "leccion": 16, "leccionTitulo": "Resumen final",
     "resumenPuntos": [
       "Una TA de 50/20 es una cifra extremadamente baja.",
       "La presión debe interpretarse junto con signos de perfusión.",
       "Una saturación normal no descarta choque.",
       "Estar consciente no significa estar fuera de peligro.",
       "Debe confirmarse la medición sin retrasar atención urgente.",
       "Los medicamentos y líquidos intravenosos requieren indicación médica."
     ],
     "texto": "La prioridad de enfermería es reconocer el deterioro, proteger al paciente, activar ayuda, vigilar, documentar y comunicar con precisión."},
    {"tipo": "alerta", "leccion": 16,
     "texto": "Este contenido es educativo y no sustituye protocolos institucionales, valoración médica ni servicios de emergencia. Ante una cifra crítica acompañada de deterioro, se debe activar atención médica urgente."}
  ]'::JSONB

WHERE NOT EXISTS (
  SELECT 1 FROM modulos_capacitacion
  WHERE  titulo = 'Hipotensión arterial y actuación ante una TA crítica'
);

-- ── 4. VINCULAR módulo con competencia ───────────────────────
-- Idempotente: si ya está vinculado, solo reconfirma el vínculo.

UPDATE modulos_capacitacion
SET    competencia_id = (
  SELECT id FROM competencias
  WHERE  codigo = 'hipotension_arterial_critica'
  LIMIT  1
)
WHERE  titulo = 'Hipotensión arterial y actuación ante una TA crítica';

-- ============================================================
-- FIN MIGRACIÓN: capacitacion_hipotension_arterial
-- ============================================================
