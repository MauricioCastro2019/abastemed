'use server'

import { revalidatePath } from 'next/cache'
import type { CareQuote, GeneratedDocument, ActivationChecklist } from '@/types'
import { requireAuth, requireRole, fd, fdNum, type ActionResult } from './utils'
import { calculatePrice, validateFinalPrice, type PriceCalculationInput } from '@/lib/pricing'

// ─── COTIZACIÓN ───────────────────────────────────────────────

export async function getCareQuote(prospectId: string) {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { data } = await supabase
    .from('care_quotes')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as CareQuote | null
}

export async function getCareQuoteAdjustments(quoteId: string) {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { data } = await supabase
    .from('quote_adjustments')
    .select('*')
    .eq('care_quote_id', quoteId)
    .order('created_at')
  return data ?? []
}

export async function calcularCotizacion(
  prospectId: string,
  preassessmentId: string,
  serviceRequestId: string,
  assessmentResultId: string,
  formData: FormData,
): Promise<ActionResult & { quoteId?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const [srRes, arRes] = await Promise.all([
    supabase.from('service_requests').select('*').eq('id', serviceRequestId).single(),
    supabase.from('assessment_results').select('*').eq('id', assessmentResultId).single(),
  ])

  if (srRes.error || arRes.error) return { error: 'No se encontró la solicitud de servicio o el resultado de evaluación.' }

  const sr = srRes.data
  const ar = arRes.data

  const profile = (fd(formData, 'override_profile') || ar.recommended_profile) as PriceCalculationInput['profile']

  const input: PriceCalculationInput = {
    profile,
    shiftHours:            sr.shift_duration_hours ?? 8,
    schedule:              sr.shift_schedule ?? 'matutino',
    urgency:               fd(formData, 'urgency') || 'sin_fecha',
    locationType:          sr.location_type ?? 'normal',
    physicalScore:         ar.physical_score,
    clinicalScore:         ar.clinical_score,
    operationalScore:      ar.operational_score,
    reportType:            sr.report_type ?? 'reporte_breve',
    supervisionType:       sr.supervision_type ?? 'ninguna',
    medicationControlType: sr.medication_control_type ?? 'ninguno',
    riskColor:             ar.risk_color,
    prospectId,
    preassessmentId,
    serviceRequestId,
    assessmentResultId,
  }

  const { quote, adjustments } = calculatePrice(input)

  // Borrar cotización anterior
  await supabase.from('care_quotes').delete().eq('prospect_id', prospectId)

  const { data: quoteData, error: quoteErr } = await supabase
    .from('care_quotes')
    .insert(quote)
    .select('id')
    .single()

  if (quoteErr) return { error: quoteErr.message }

  // Insertar ajustes con el ID real
  if (adjustments.length > 0) {
    const adjs = adjustments.map(a => ({ ...a, care_quote_id: quoteData.id }))
    await supabase.from('quote_adjustments').insert(adjs)
  }

  await supabase.from('prospects').update({ status: 'cotizacion_generada' }).eq('id', prospectId)

  revalidatePath(`/prospectos/${prospectId}`)
  return { quoteId: quoteData.id }
}

export async function actualizarPrecioFinal(
  quoteId: string,
  prospectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const finalPrice = fdNum(formData, 'final_price')
  const reason     = fd(formData, 'adjustment_reason')

  // Buscar cotización por ID; si no la encuentra (puede haber sido recalculada),
  // usar la más reciente del prospecto como fallback
  const { data: quoteById, error: errById } = await supabase
    .from('care_quotes')
    .select('id, minimum_recommended_price, risk_color')
    .eq('id', quoteId)
    .maybeSingle()

  let quoteData = quoteById
  let errByProspect: { message?: string } | null = null

  if (!quoteData) {
    const { data: latest, error: latestErr } = await supabase
      .from('care_quotes')
      .select('id, minimum_recommended_price, risk_color')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    errByProspect = latestErr
    quoteData = latest
  }

  if (!quoteData) {
    return {
      error: `[DEBUG] quoteId=${quoteId} | prospectId=${prospectId} | adminId=${perfil.id} | errById=${errById?.message ?? 'null'} | errByProspect=${errByProspect?.message ?? 'null'}`,
    }
  }

  const validation = validateFinalPrice(finalPrice, quoteData.minimum_recommended_price, quoteData.risk_color)

  // El admin puede sobrepasar cualquier restricción con motivo obligatorio
  if (!validation.valid && !reason?.trim()) {
    return { error: `${validation.message ?? 'Precio no autorizado.'} Ingresa un motivo de ajuste para continuar.` }
  }

  const update: Record<string, unknown> = {
    final_price:       finalPrice,
    adjustment_reason: reason || null,
    status:            'lista_para_enviar',
  }

  if (validation.requiresAuth || !validation.valid) {
    update.authorized_by = perfil.id
  }

  const { error } = await supabase
    .from('care_quotes')
    .update(update)
    .eq('id', quoteData.id)

  if (error) return { error: error.message }
  revalidatePath(`/prospectos/${prospectId}`)
  return {}
}

// ─── ACEPTAR COTIZACIÓN (ADMIN) ───────────────────────────────

export async function aceptarCotizacion(
  quoteId: string,
  prospectId: string,
  nota: string,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { data: quote } = await supabase
    .from('care_quotes')
    .select('status')
    .eq('id', quoteId)
    .single()

  if (!quote) return { error: 'Cotización no encontrada.' }
  if (quote.status === 'aceptada') return { error: 'La cotización ya está aceptada.' }
  if (quote.status === 'rechazada' || quote.status === 'vencida') {
    return { error: `No se puede aceptar una cotización con estado "${quote.status}".` }
  }

  const { error: qErr } = await supabase
    .from('care_quotes')
    .update({
      status:           'aceptada',
      authorized_by:    perfil.id,
      adjustment_reason: nota ? `Aceptación admin: ${nota}` : (quote as { adjustment_reason?: string }).adjustment_reason ?? null,
    })
    .eq('id', quoteId)

  if (qErr) return { error: qErr.message }

  await supabase
    .from('prospects')
    .update({ status: 'propuesta_aceptada' })
    .eq('id', prospectId)

  revalidatePath(`/prospectos/${prospectId}`)
  revalidatePath(`/prospectos/${prospectId}/cotizacion`)
  return {}
}

// ─── DOCUMENTOS / PROPUESTAS ──────────────────────────────────

export async function getGeneratedDocuments(prospectId: string) {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { data } = await supabase
    .from('generated_documents')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
  return (data ?? []) as GeneratedDocument[]
}

export async function generarDocumento(
  prospectId: string,
  quoteId: string,
  documentType: string,
): Promise<ActionResult & { docId?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const [prospectRes, preassessmentRes, quoteRes, arRes] = await Promise.all([
    supabase.from('prospects').select('*').eq('id', prospectId).single(),
    supabase.from('patient_preassessments').select('*').eq('prospect_id', prospectId).maybeSingle(),
    supabase.from('care_quotes').select('*').eq('id', quoteId).single(),
    supabase.from('assessment_results').select('*').eq('prospect_id', prospectId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (prospectRes.error || quoteRes.error) return { error: 'No se encontraron los datos necesarios.' }

  const prospect     = prospectRes.data
  const preassessment = preassessmentRes.data
  const quote        = quoteRes.data
  const ar           = arRes.data

  const finalPrice   = quote.final_price ?? quote.suggested_price
  const patientName  = preassessment?.patient_name ?? 'el paciente'
  const requesterName = prospect.requester_name

  const PROFILE_LABELS: Record<string, string> = {
    cuidador:               'Cuidador / acompañante capacitado',
    auxiliar:               'Auxiliar / cuidador experimentado',
    enfermero_general:      'Enfermero general',
    enfermero_especializado:'Enfermero especializado',
  }

  const SHIFT_LABELS: Record<string, string> = { '4': '4 horas', '6': '6 horas', '8': '8 horas', '12': '12 horas', '24': '24 horas' }
  const profileLabel = PROFILE_LABELS[ar?.recommended_profile ?? 'cuidador'] ?? 'Personal calificado'

  let title  = ''
  let content = ''

  const today = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
  const priceStr = `$${Number(finalPrice).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

  if (documentType === 'whatsapp_corto') {
    title   = 'Mensaje corto WhatsApp'
    const shiftLabel = SHIFT_LABELS[String(quote.shift_duration_hours ?? 8)] ?? '8 horas'
    content = `Buen día, Sr./Sra. ${requesterName.split(' ')[0]}.

Con base en la información que nos compartió, Abastemed recomienda un servicio de cuidado para *${patientName}*, en guardia de *${shiftLabel}*.

El perfil sugerido es *${profileLabel}*, considerando las necesidades de apoyo, vigilancia y cuidado del paciente.

El costo por guardia sería de *${priceStr}*.

Para poder iniciar, requerimos confirmar domicilio, horario, responsable de pago y el anticipo correspondiente. Quedamos atentos para apoyarle y organizar el servicio de la manera más segura y ordenada.

_Abastemed — Cuidado con estructura._`
  }

  if (documentType === 'propuesta_formal') {
    title = 'Propuesta Inicial de Cuidado'
    content = `PROPUESTA INICIAL DE CUIDADO
Abastemed — Servicios de Enfermería y Cuidado Domiciliario
Fecha: ${today}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATOS GENERALES
Paciente:    ${patientName}
Solicitante: ${requesterName}
Diagnóstico: ${preassessment?.diagnosis ?? 'Por confirmar'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTRODUCCIÓN

Con base en la información proporcionada durante la evaluación inicial, Abastemed presenta una propuesta de cuidado orientada a brindar acompañamiento seguro, vigilancia adecuada y apoyo estructurado para el paciente, procurando claridad para la familia y condiciones operativas responsables para el personal asignado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SERVICIO PROPUESTO

Perfil del personal:  ${profileLabel}
Duración de guardia:  ${SHIFT_LABELS[String(quote.shift_duration_hours ?? 8)] ?? '8 horas'}

QUÉ INCLUYE:
• Acompañamiento y vigilancia durante la guardia
• Apoyo en actividades de la vida diaria según indicaciones
• Registro de eventos relevantes durante la guardia
• Comunicación con el responsable familiar ante cualquier cambio
• Seguimiento del plan de cuidado acordado

QUÉ NO INCLUYE:
• Limpieza general del domicilio
• Preparación de alimentos para toda la familia
• Cuidado de otros familiares
• Compra de mandado sin autorización
• Administración de dinero del paciente
• Toma de decisiones médicas
• Medicamentos o insumos no cotizados
• Traslados no acordados
• Procedimientos sin indicación médica
• Actividades fuera del cuidado directo del paciente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COSTO DEL SERVICIO

Costo por guardia:      ${priceStr}
Anticipo requerido:     $${Number(quote.deposit_required ?? finalPrice).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
Vigencia de cotización: ${quote.quote_valid_until ? new Date(quote.quote_valid_until + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '3 días'}

Forma de pago: Transferencia bancaria / Efectivo
Pago anticipado por guardia o según acuerdo comercial

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONDICIONES PARA INICIAR

1. Datos del paciente y domicilio confirmados
2. Responsable de pago definido y contactado
3. Contacto de emergencia registrado
4. Anticipo realizado
5. Condiciones del servicio aceptadas
6. Indicaciones médicas disponibles (si aplica)
7. Personal asignado y horario confirmado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONDICIONES COMERCIALES

1. El servicio se brinda conforme a la información proporcionada durante el pre-levantamiento.
2. Cualquier cambio en las necesidades del paciente puede modificar el costo o el perfil del personal requerido.
3. El pago debe realizarse de forma anticipada según la modalidad acordada.
4. La asignación de personal está sujeta a disponibilidad y al perfil requerido.
5. Los medicamentos, insumos, materiales o traslados no están incluidos salvo indicación por escrito.
6. El personal no está autorizado a realizar procedimientos sin indicación médica.
7. El servicio se limita al cuidado directo del paciente registrado.
8. La familia deberá definir un responsable principal para comunicación, indicaciones y pagos.
9. Las cancelaciones deberán notificarse con anticipación. Si el personal ya fue asignado o la guardia inició, podrá aplicarse cargo parcial o total.
10. En caso de emergencia, el personal notificará al contacto responsable y seguirá las indicaciones previamente acordadas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SIGUIENTE PASO

Para confirmar el servicio, comuníquese con nosotros e informe:
• Fecha y horario de inicio
• Confirmación del anticipo
• Datos del responsable de pago

En Abastemed buscamos que cada servicio se brinde con orden, claridad y responsabilidad. Nuestro objetivo no es únicamente cubrir una guardia, sino acompañar el cuidado del paciente con estructura, comunicación y seguimiento adecuado para dar tranquilidad a la familia.`
  }

  if (documentType === 'resumen_interno') {
    title   = 'Resumen Interno — Abastemed'
    const riskLabels: Record<string, string> = { verde: 'Verde ✓', amarillo: 'Amarillo ⚠', naranja: 'Naranja ⚡', rojo: 'Rojo 🔴' }
    content = `RESUMEN INTERNO — PROSPECTO
Generado: ${today}
Solo para uso interno Abastemed

─────────────────────────────────
PROSPECTO
ID:          ${prospectId}
Solicitante: ${requesterName} (${prospect.requester_phone})
Parentesco:  ${prospect.relationship_to_patient}
Urgencia:    ${prospect.urgency}${prospect.is_urgent ? ' — URGENTE' : ''}

PACIENTE
Nombre:      ${patientName}
Diagnóstico: ${preassessment?.diagnosis ?? 'No registrado'}
Ubicación:   ${[preassessment?.service_address, preassessment?.neighborhood, preassessment?.city].filter(Boolean).join(', ') || 'Por confirmar'}

─────────────────────────────────
RESULTADO DE EVALUACIÓN
Score físico:     ${ar?.physical_score ?? '—'} pts
Score clínico:    ${ar?.clinical_score ?? '—'} pts
Score operativo:  ${ar?.operational_score ?? '—'} pts
Score total:      ${ar?.total_score ?? '—'} pts
Nivel:            ${ar?.general_complexity_level ?? '—'}
Semáforo:         ${riskLabels[ar?.risk_color ?? 'verde'] ?? ar?.risk_color}
Perfil recomendado: ${PROFILE_LABELS[ar?.recommended_profile ?? 'cuidador']}
Valoración presencial: ${ar?.requires_in_person_assessment ? 'SÍ — REQUERIDA' : 'No requerida'}
Bitácora obligatoria: ${ar?.requires_mandatory_log ? 'SÍ' : 'No'}
Anticipo obligatorio: ${ar?.requires_advance_payment ? 'SÍ' : 'No'}

BANDERAS DE BLOQUEO: ${ar?.blocking_flags?.length ? ar.blocking_flags.join(', ') : 'Ninguna'}
ADVERTENCIAS: ${ar?.warning_flags?.length ? ar.warning_flags.join(', ') : 'Ninguna'}

─────────────────────────────────
COTIZACIÓN
Tarifa base:    $${Number(quote.base_rate).toLocaleString('es-MX')}
Precio calculado: $${Number(quote.calculated_price).toLocaleString('es-MX')}
Precio sugerido: $${Number(quote.suggested_price).toLocaleString('es-MX')}
Precio mínimo:  $${Number(quote.minimum_recommended_price).toLocaleString('es-MX')}
Precio final:   $${Number(quote.final_price ?? quote.suggested_price).toLocaleString('es-MX')}
Anticipo:       $${Number(quote.deposit_required).toLocaleString('es-MX')}
Vigencia:       ${quote.quote_valid_until ?? '3 días'}

─────────────────────────────────
Recomendación interna: ${ar?.internal_recommendation ?? 'Sin recomendación generada.'}`
  }

  if (documentType === 'seguimiento') {
    title   = 'Mensaje de Seguimiento'
    content = `Buen día, ${requesterName.split(' ')[0]}.

Espero que se encuentre bien. Le contactamos de parte de Abastemed para dar seguimiento a la propuesta de cuidado que le enviamos para ${patientName}.

¿Tuvo oportunidad de revisar la información? Con gusto resolvemos cualquier duda sobre el servicio, el costo o el proceso para iniciar.

Quedamos a sus órdenes.

_Abastemed — Cuidado con estructura._`
  }

  if (!content) return { error: 'Tipo de documento no reconocido.' }

  const { data, error } = await supabase.from('generated_documents').insert({
    prospect_id:   prospectId,
    care_quote_id: quoteId,
    document_type: documentType,
    title,
    content,
    status:        'borrador',
    created_by:    perfil.id,
  }).select('id').single()

  if (error) return { error: error.message }

  await supabase.from('prospects').update({ status: 'propuesta_enviada' }).eq('id', prospectId)
  revalidatePath(`/prospectos/${prospectId}`)
  return { docId: data.id }
}

export async function marcarDocumentoEnviado(docId: string, prospectId: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { error } = await supabase
    .from('generated_documents')
    .update({ status: 'enviado', sent_at: new Date().toISOString() })
    .eq('id', docId)
  if (error) return { error: error.message }
  await supabase.from('prospects').update({ status: 'propuesta_enviada' }).eq('id', prospectId)
  revalidatePath(`/prospectos/${prospectId}`)
  return {}
}

export async function marcarDocumentoAceptado(docId: string, prospectId: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { error } = await supabase
    .from('generated_documents')
    .update({ status: 'aceptado', accepted_at: new Date().toISOString() })
    .eq('id', docId)
  if (error) return { error: error.message }
  await supabase.from('prospects').update({ status: 'propuesta_aceptada' }).eq('id', prospectId)
  revalidatePath(`/prospectos/${prospectId}`)
  return {}
}

// ─── CHECKLIST DE ACTIVACIÓN ──────────────────────────────────

export async function getActivationChecklist(prospectId: string) {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { data } = await supabase
    .from('activation_checklists')
    .select('*')
    .eq('prospect_id', prospectId)
    .maybeSingle()
  return data as ActivationChecklist | null
}

export async function upsertActivationChecklist(
  prospectId: string,
  preassessmentId: string | null,
  quoteId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const boolFields = [
    'patient_data_complete', 'address_confirmed', 'payment_responsible_confirmed',
    'emergency_contact_confirmed', 'final_price_authorized', 'deposit_registered',
    'terms_accepted', 'medical_indications_available', 'medication_list_available',
    'supplies_ready', 'assessment_completed_if_required', 'staff_profile_confirmed',
    'start_date_confirmed',
  ] as const

  const payload: Record<string, unknown> = {
    prospect_id:      prospectId,
    preassessment_id: preassessmentId,
    care_quote_id:    quoteId,
    validated_by:     perfil.id,
    validated_at:     new Date().toISOString(),
  }

  const MANDATORY = [
    'patient_data_complete', 'address_confirmed', 'payment_responsible_confirmed',
    'emergency_contact_confirmed', 'final_price_authorized', 'deposit_registered',
    'terms_accepted', 'start_date_confirmed', 'staff_profile_confirmed',
  ]

  const missing: string[] = []
  const LABELS: Record<string, string> = {
    patient_data_complete:           'Datos del paciente completos',
    address_confirmed:               'Domicilio confirmado',
    payment_responsible_confirmed:   'Responsable de pago definido',
    emergency_contact_confirmed:     'Contacto de emergencia definido',
    final_price_authorized:          'Precio final autorizado',
    deposit_registered:              'Anticipo registrado',
    terms_accepted:                  'Condiciones aceptadas',
    start_date_confirmed:            'Fecha de inicio confirmada',
    staff_profile_confirmed:         'Personal asignado',
  }

  for (const field of boolFields) {
    const val = formData.get(field) === 'true'
    payload[field] = val
    if (MANDATORY.includes(field) && !val) {
      missing.push(LABELS[field] ?? field)
    }
  }

  payload.missing_items = missing
  payload.is_ready_to_activate = missing.length === 0

  const existing = await supabase
    .from('activation_checklists')
    .select('id')
    .eq('prospect_id', prospectId)
    .maybeSingle()

  const { error } = existing.data?.id
    ? await supabase.from('activation_checklists').update(payload).eq('id', existing.data.id)
    : await supabase.from('activation_checklists').insert(payload)

  if (error) return { error: error.message }

  if (missing.length === 0) {
    await supabase.from('prospects').update({ status: 'listo_para_activar' }).eq('id', prospectId)
  }

  revalidatePath(`/prospectos/${prospectId}`)
  return {}
}

// ─── CONVERSIÓN A PACIENTE ACTIVO ─────────────────────────────

export async function convertirAPaciente(
  prospectId: string,
): Promise<ActionResult & { pacienteId?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  // Validar checklist
  const { data: checklist } = await supabase
    .from('activation_checklists')
    .select('is_ready_to_activate, missing_items')
    .eq('prospect_id', prospectId)
    .maybeSingle()

  if (!checklist?.is_ready_to_activate) {
    const missing = checklist?.missing_items ?? ['Checklist de activación incompleto']
    return { error: `No se puede activar. Faltan condiciones obligatorias: ${missing.join(', ')}.` }
  }

  const [prospectRes, preassessmentRes, arRes] = await Promise.all([
    supabase.from('prospects').select('*').eq('id', prospectId).single(),
    supabase.from('patient_preassessments').select('*').eq('prospect_id', prospectId).maybeSingle(),
    supabase.from('assessment_results').select('*').eq('prospect_id', prospectId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (prospectRes.error) return { error: 'Prospecto no encontrado.' }
  if (!preassessmentRes.data) return { error: 'Datos del paciente incompletos.' }

  const prospect     = prospectRes.data
  const preassessment = preassessmentRes.data

  const nameParts = preassessment.patient_name.trim().split(' ')
  const firstName = nameParts[0]
  const lastName  = nameParts.slice(1).join(' ') || '—'

  const fechaNac = preassessment.patient_age
    ? new Date(new Date().getFullYear() - preassessment.patient_age, 0, 1).toISOString().split('T')[0]
    : null

  const { data: paciente, error: pacienteError } = await supabase.from('pacientes').insert({
    nombre:           firstName,
    apellido:         lastName,
    fecha_nacimiento: fechaNac ?? '1950-01-01',
    diagnostico:      preassessment.diagnosis ?? 'Por definir',
    medicamentos:     [],
    alergias:         [],
    contacto_familiar: {
      nombre:   prospect.payment_responsible_name ?? prospect.requester_name,
      telefono: prospect.payment_responsible_phone ?? prospect.requester_phone,
      email:    prospect.requester_email ?? null,
      relacion: prospect.relationship_to_patient,
    },
    contexto:                 preassessment.current_location === 'hospital' ? 'hospital' : 'domicilio',
    status:                   'activo',
    source_prospect_id:       prospectId,
    source_preassessment_id:  preassessment.id,
  }).select('id').single()

  if (pacienteError) return { error: pacienteError.message }

  // Crear plan inicial de cuidado
  if (arRes.data) {
    await supabase.from('care_plans').insert({
      patient_id:       paciente.id,
      prospect_id:      prospectId,
      preassessment_id: preassessment.id,
      plan_type:        'inicial',
      required_profile: arRes.data.recommended_profile,
      main_needs:       arRes.data.warning_flags ?? [],
      alerts:           arRes.data.blocking_flags ?? [],
      status:           'activo',
      created_by:       perfil.id,
    })
  }

  // Marcar prospecto como paciente activo
  await supabase.from('prospects').update({ status: 'paciente_activo' }).eq('id', prospectId)

  revalidatePath('/prospectos')
  revalidatePath('/pacientes')
  revalidatePath(`/prospectos/${prospectId}`)

  return { pacienteId: paciente.id }
}
