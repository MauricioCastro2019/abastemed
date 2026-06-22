'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, DEFAULT_ORG_ID, type ActionResult } from './utils'
import type {
  LevantamientoPaciente,
  LevantamientoMedicamento,
  LevantamientoMaterial,
  ProspectoElegible,
  ProspectoBloqueado,
  RiskColor,
  RecommendedProfile,
  ComplexityLevel,
  ProspectoStatus,
  BloqueoStep,
} from '@/types'

// ============================================================
// Helpers internos
// ============================================================

/** Convierte keywords de requested_start_date a una fecha ISO válida o null.
 *  La columna fecha_inicio_estimada en levantamientos_paciente es DATE, no TEXT. */
function resolveStartDate(val: string | null | undefined): string | null {
  if (!val || val === 'sin_fecha' || val === 'fecha_especifica') return null
  if (val === 'hoy_mismo') return new Date().toISOString().split('T')[0]
  if (val === 'manana') {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }
  if (val === 'esta_semana') return null
  return val // ya es una fecha ISO real
}

// ============================================================
// Tipos internos para el payload del wizard
// ============================================================

export type LevantamientoPayload = Omit<
  LevantamientoPaciente,
  'id' | 'created_at' | 'updated_at' | 'medicamentos' | 'materiales' | 'levantador'
>

// ============================================================
// QUERIES
// ============================================================

export interface LevantamientoFiltros {
  q?: string
  estado?: string
  riesgo?: string
  prioridad?: string
}

export async function getLevantamientos(filtros?: LevantamientoFiltros) {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('levantamientos_paciente')
    .select(`
      id, paciente_nombre, paciente_apellido, paciente_fecha_nacimiento,
      tipos_servicio, riesgo_final, prioridad, estado, urgencia_percibida,
      responsable_nombre, responsable_tel_principal,
      fecha_inicio_estimada, nivel_personal, levantado_por,
      created_at, updated_at,
      levantador:levantado_por(nombre, apellido)
    `)
    .order('created_at', { ascending: false })

  if (filtros?.estado && filtros.estado !== 'todos') {
    query = query.eq('estado', filtros.estado)
  }
  if (filtros?.riesgo && filtros.riesgo !== 'todos') {
    query = query.eq('riesgo_final', filtros.riesgo)
  }
  if (filtros?.prioridad && filtros.prioridad !== 'todos') {
    query = query.eq('prioridad', filtros.prioridad)
  }
  if (filtros?.q?.trim()) {
    const q = filtros.q.trim()
    query = query.or(
      `paciente_nombre.ilike.%${q}%,paciente_apellido.ilike.%${q}%,responsable_nombre.ilike.%${q}%,responsable_tel_principal.ilike.%${q}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as LevantamientoPaciente[]
}

export async function getLevantamiento(id: string) {
  const { supabase } = await requireAuth()

  const [levResult, medResult, matResult] = await Promise.all([
    supabase
      .from('levantamientos_paciente')
      .select('*, levantador:levantado_por(nombre, apellido)')
      .eq('id', id)
      .single(),
    supabase
      .from('levantamiento_medicamentos')
      .select('*')
      .eq('levantamiento_id', id)
      .order('orden'),
    supabase
      .from('levantamiento_materiales')
      .select('*')
      .eq('levantamiento_id', id)
      .order('orden'),
  ])

  if (levResult.error) throw new Error(levResult.error.message)

  return {
    ...(levResult.data as LevantamientoPaciente),
    medicamentos: (medResult.data ?? []) as LevantamientoMedicamento[],
    materiales: (matResult.data ?? []) as LevantamientoMaterial[],
  }
}

// ============================================================
// CREAR
// ============================================================

export async function crearLevantamiento(
  payload: LevantamientoPayload,
  medicamentos: Omit<LevantamientoMedicamento, 'id' | 'levantamiento_id'>[],
  materiales: Omit<LevantamientoMaterial, 'id' | 'levantamiento_id'>[]
): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const insertData = buildInsertPayload(payload, perfil.id)

  const { data: lev, error: levErr } = await supabase
    .from('levantamientos_paciente')
    .insert(insertData)
    .select('id')
    .single()

  if (levErr) return { error: levErr.message }

  const levId = lev.id

  // Insertar medicamentos
  if (medicamentos.length > 0) {
    const { error: medErr } = await supabase
      .from('levantamiento_medicamentos')
      .insert(
        medicamentos.map((m, i) => ({ ...m, levantamiento_id: levId, orden: i }))
      )
    if (medErr) return { error: medErr.message }
  }

  // Insertar materiales
  if (materiales.length > 0) {
    const { error: matErr } = await supabase
      .from('levantamiento_materiales')
      .insert(
        materiales.map((m, i) => ({ ...m, levantamiento_id: levId, orden: i }))
      )
    if (matErr) return { error: matErr.message }
  }

  revalidatePath('/levantamientos')
  return { id: levId }
}

// ============================================================
// ACTUALIZAR
// ============================================================

export async function actualizarLevantamiento(
  id: string,
  payload: LevantamientoPayload,
  medicamentos: Omit<LevantamientoMedicamento, 'id' | 'levantamiento_id'>[],
  materiales: Omit<LevantamientoMaterial, 'id' | 'levantamiento_id'>[]
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const insertData = buildInsertPayload(payload, perfil.id)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { levantado_por: _lp, ...updateData } = insertData

  const { error: levErr } = await supabase
    .from('levantamientos_paciente')
    .update(updateData)
    .eq('id', id)

  if (levErr) return { error: levErr.message }

  // Reemplazar medicamentos y materiales
  await supabase.from('levantamiento_medicamentos').delete().eq('levantamiento_id', id)
  await supabase.from('levantamiento_materiales').delete().eq('levantamiento_id', id)

  if (medicamentos.length > 0) {
    await supabase
      .from('levantamiento_medicamentos')
      .insert(medicamentos.map((m, i) => ({ ...m, levantamiento_id: id, orden: i })))
  }

  if (materiales.length > 0) {
    await supabase
      .from('levantamiento_materiales')
      .insert(materiales.map((m, i) => ({ ...m, levantamiento_id: id, orden: i })))
  }

  revalidatePath('/levantamientos')
  revalidatePath(`/levantamientos/${id}`)
  return {}
}

// ============================================================
// CAMBIAR ESTADO
// ============================================================

export async function cambiarEstadoLevantamiento(
  id: string,
  estado: LevantamientoPaciente['estado']
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { error } = await supabase
    .from('levantamientos_paciente')
    .update({ estado })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/levantamientos')
  revalidatePath(`/levantamientos/${id}`)
  return {}
}

// ============================================================
// PROSPECTOS PARA LEVANTAMIENTO
// ============================================================

// Estados que se consideran "activos" (bloquean la creación de otro levantamiento)
const ESTADOS_ACTIVOS: string[] = [
  'borrador',
  'pendiente_revision',
  'en_revision',
  'requiere_correcciones',
  'requiere_revision_clinica',
  'requiere_revision_comercial',
  'revisado',
  'aprobado',
]

export async function getProspectosParaLevantamiento(): Promise<{
  elegibles: ProspectoElegible[]
  bloqueados: ProspectoBloqueado[]
}> {
  const { supabase } = await requireAuth()

  // Todos los prospectos que siguen activos en el flujo
  const { data: prospects, error: pErr } = await supabase
    .from('prospects')
    .select('id, requester_name, requester_phone, requester_whatsapp, requester_email, relationship_to_patient, is_payer, payment_responsible_name, status, urgency, created_at')
    .not('status', 'in', '(paciente_activo,rechazado,cancelado)')
    .order('created_at', { ascending: false })

  if (pErr) throw new Error(pErr.message)
  if (!prospects?.length) return { elegibles: [], bloqueados: [] }

  const prospectIds = prospects.map(p => p.id)

  // Preassessments existentes
  const { data: preassessments } = await supabase
    .from('patient_preassessments')
    .select('id, prospect_id, patient_name, patient_age, patient_gender, service_address, city, diagnosis')
    .in('prospect_id', prospectIds)

  const preassessmentIds = (preassessments ?? []).map(p => p.id)

  // Evaluaciones (sólo necesitamos saber si existen)
  const [
    { data: physicals },
    { data: clinicals },
    { data: operationals },
    { data: results },
    { data: quotes },
    { data: serviceRequests },
    { data: activeLevs },
  ] = await Promise.all([
    supabase
      .from('physical_assessments')
      .select('id, preassessment_id, physical_score, physical_alerts')
      .in('preassessment_id', preassessmentIds.length ? preassessmentIds : ['none']),
    supabase
      .from('clinical_assessments')
      .select('id, preassessment_id, clinical_score, clinical_alerts')
      .in('preassessment_id', preassessmentIds.length ? preassessmentIds : ['none']),
    supabase
      .from('operational_risk_assessments')
      .select('id, preassessment_id, operational_score, operational_alerts')
      .in('preassessment_id', preassessmentIds.length ? preassessmentIds : ['none']),
    supabase
      .from('assessment_results')
      .select('id, prospect_id, preassessment_id, physical_score, clinical_score, operational_score, total_score, risk_color, recommended_profile, general_complexity_level, blocking_flags, warning_flags')
      .in('prospect_id', prospectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('care_quotes')
      .select('id, prospect_id, status, final_price, suggested_price, calculated_price, deposit_required, payment_terms, updated_at')
      .in('prospect_id', prospectIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('service_requests')
      .select('id, prospect_id, requested_service_type, shift_duration_hours, requested_start_date, payment_method')
      .in('prospect_id', prospectIds),
    supabase
      .from('levantamientos_paciente')
      .select('id, prospect_id, estado')
      .in('prospect_id', prospectIds)
      .in('estado', ESTADOS_ACTIVOS),
  ])

  // Mapas para lookups O(1) — tipos explícitos porque los arrays pueden ser null
  type PreRow = { id: string; prospect_id: string; patient_name: string; patient_age: number | null; patient_gender: string | null; service_address: string | null; city: string | null; diagnosis: string | null }
  type PhysRow = { id: string; preassessment_id: string; physical_score: number; physical_alerts: string[] }
  type ClRow  = { id: string; preassessment_id: string; clinical_score: number; clinical_alerts: string[] }
  type OpRow  = { id: string; preassessment_id: string; operational_score: number; operational_alerts: string[] }
  type ResRow = { id: string; prospect_id: string; physical_score: number; clinical_score: number; operational_score: number; total_score: number; risk_color: string; recommended_profile: string; general_complexity_level: string; blocking_flags: unknown; warning_flags: unknown }
  type QuoteRow = { id: string; prospect_id: string; status: string; final_price: number | null; suggested_price: number; calculated_price: number; deposit_required: number | null; payment_terms: string | null; updated_at: string }
  type SrRow  = { id: string; prospect_id: string; requested_service_type: string | null; shift_duration_hours: number | null; requested_start_date: string | null; payment_method: string | null }
  type LevRow = { id: string; prospect_id: string | null; estado: string }

  const preByProspect = new Map<string, PreRow>()
  for (const pa of (preassessments as PreRow[] | null) ?? []) preByProspect.set(pa.prospect_id, pa)

  const physicalByPre = new Map<string, PhysRow>()
  for (const ph of (physicals as PhysRow[] | null) ?? []) physicalByPre.set(ph.preassessment_id, ph)

  const clinicalByPre = new Map<string, ClRow>()
  for (const cl of (clinicals as ClRow[] | null) ?? []) clinicalByPre.set(cl.preassessment_id, cl)

  const operationalByPre = new Map<string, OpRow>()
  for (const op of (operationals as OpRow[] | null) ?? []) operationalByPre.set(op.preassessment_id, op)

  // Primer resultado por prospecto (más reciente)
  const resultByProspect = new Map<string, ResRow>()
  for (const ar of (results as ResRow[] | null) ?? []) {
    if (!resultByProspect.has(ar.prospect_id)) resultByProspect.set(ar.prospect_id, ar)
  }

  // Primera cotización por prospecto (más reciente)
  const quoteByProspect = new Map<string, QuoteRow>()
  const acceptedQuoteByProspect = new Map<string, QuoteRow>()
  for (const cq of (quotes as QuoteRow[] | null) ?? []) {
    if (!quoteByProspect.has(cq.prospect_id)) quoteByProspect.set(cq.prospect_id, cq)
    if (cq.status === 'aceptada' && !acceptedQuoteByProspect.has(cq.prospect_id)) {
      acceptedQuoteByProspect.set(cq.prospect_id, cq)
    }
  }

  const srByProspect = new Map<string, SrRow>()
  for (const sr of (serviceRequests as SrRow[] | null) ?? []) srByProspect.set(sr.prospect_id, sr)

  const activeLevByProspect = new Map<string, LevRow>()
  for (const lev of (activeLevs as LevRow[] | null) ?? []) {
    if (lev.prospect_id) activeLevByProspect.set(lev.prospect_id, lev)
  }

  const elegibles: ProspectoElegible[] = []
  const bloqueados: ProspectoBloqueado[] = []

  for (const prospect of prospects) {
    const pre = preByProspect.get(prospect.id)
    const activeLev = activeLevByProspect.get(prospect.id)
    const hasPhysical = pre ? physicalByPre.has(pre.id) : false
    const hasClinical = pre ? clinicalByPre.has(pre.id) : false
    const hasOperational = pre ? operationalByPre.has(pre.id) : false
    const hasResult = resultByProspect.has(prospect.id)
    const acceptedQuote = acceptedQuoteByProspect.get(prospect.id)

    const isEligible =
      !!pre &&
      hasPhysical &&
      hasClinical &&
      hasOperational &&
      hasResult &&
      !!acceptedQuote &&
      !activeLev

    if (isEligible) {
      const result = resultByProspect.get(prospect.id)!
      const sr = srByProspect.get(prospect.id)
      const physData = physicalByPre.get(pre!.id)
      const clData = clinicalByPre.get(pre!.id)
      const opData = operationalByPre.get(pre!.id)

      elegibles.push({
        prospect_id: prospect.id,
        preassessment_id: pre!.id,
        quote_id: acceptedQuote!.id,
        patient_name: pre!.patient_name,
        patient_age: pre!.patient_age ?? null,
        patient_gender: pre!.patient_gender ?? null,
        diagnosis: pre!.diagnosis ?? null,
        service_address: pre!.service_address ?? null,
        city: pre!.city ?? null,
        requester_name: prospect.requester_name,
        requester_phone: prospect.requester_phone,
        relationship_to_patient: prospect.relationship_to_patient,
        physical_score: result.physical_score,
        clinical_score: result.clinical_score,
        operational_score: result.operational_score,
        total_score: result.total_score,
        risk_color: result.risk_color as RiskColor,
        recommended_profile: result.recommended_profile as RecommendedProfile,
        complexity_level: result.general_complexity_level as ComplexityLevel,
        blocking_flags: (result.blocking_flags as string[]) ?? [],
        warning_flags: (result.warning_flags as string[]) ?? [],
        final_price: acceptedQuote!.final_price ?? null,
        suggested_price: acceptedQuote!.suggested_price,
        calculated_price: acceptedQuote!.calculated_price,
        deposit_required: acceptedQuote!.deposit_required ?? null,
        payment_terms: acceptedQuote!.payment_terms ?? null,
        payment_method: sr?.payment_method ?? null,
        accepted_at: acceptedQuote!.updated_at ?? null,
        requested_service_type: sr?.requested_service_type ?? null,
        shift_duration_hours: sr?.shift_duration_hours ?? null,
        requested_start_date: sr?.requested_start_date ?? null,
        prospect_created_at: prospect.created_at,
        physical_alerts: (physData?.physical_alerts as string[]) ?? [],
        clinical_alerts: (clData?.clinical_alerts as string[]) ?? [],
        operational_alerts: (opData?.operational_alerts as string[]) ?? [],
      })
    } else {
      // Determinar el paso bloqueado más prioritario
      let blocking_reason: string
      let blocking_step: BloqueoStep
      let action_label: string
      let action_url: string

      if (activeLev) {
        blocking_reason = 'Ya existe un levantamiento activo para este paciente'
        blocking_step = 'levantamiento_activo'
        action_label = 'Abrir levantamiento'
        action_url = `/levantamientos/${activeLev.id}`
      } else if (!pre) {
        blocking_reason = 'Falta capturar el prelevantamiento (datos del paciente)'
        blocking_step = 'prelevantamiento'
        action_label = 'Iniciar prelevantamiento'
        action_url = `/prospectos/${prospect.id}/prelevantamiento`
      } else if (!hasPhysical) {
        blocking_reason = 'Falta completar la evaluación física'
        blocking_step = 'evaluacion_fisica'
        action_label = 'Ir a evaluación física'
        action_url = `/prospectos/${prospect.id}/evaluacion-fisica`
      } else if (!hasClinical) {
        blocking_reason = 'Falta completar la evaluación clínica'
        blocking_step = 'evaluacion_clinica'
        action_label = 'Ir a evaluación clínica'
        action_url = `/prospectos/${prospect.id}/evaluacion-clinica`
      } else if (!hasOperational) {
        blocking_reason = 'Falta completar la evaluación operativa'
        blocking_step = 'evaluacion_operativa'
        action_label = 'Ir a evaluación operativa'
        action_url = `/prospectos/${prospect.id}/evaluacion-operativa`
      } else if (!hasResult) {
        blocking_reason = 'Falta calcular el resultado de evaluación (score de riesgo)'
        blocking_step = 'resultado'
        action_label = 'Calcular resultado'
        action_url = `/prospectos/${prospect.id}/resultado`
      } else {
        const quote = quoteByProspect.get(prospect.id)
        if (!quote) {
          blocking_reason = 'Falta generar la cotización del servicio'
          blocking_step = 'cotizacion'
          action_label = 'Ir a cotización'
          action_url = `/prospectos/${prospect.id}/cotizacion`
        } else {
          blocking_reason = `Cotización generada (${quote.status}), pendiente de aceptación por la familia`
          blocking_step = 'aceptacion_cotizacion'
          action_label = 'Ver cotización'
          action_url = `/prospectos/${prospect.id}/cotizacion`
        }
      }

      bloqueados.push({
        prospect_id: prospect.id,
        patient_name: pre?.patient_name ?? `Paciente (solicita: ${prospect.requester_name})`,
        requester_name: prospect.requester_name,
        prospect_status: prospect.status as ProspectoStatus,
        blocking_reason,
        blocking_step,
        action_label,
        action_url,
        active_levantamiento_id: activeLev?.id ?? null,
        prospect_created_at: prospect.created_at,
      })
    }
  }

  return { elegibles, bloqueados }
}

// ============================================================
// CREAR LEVANTAMIENTO DESDE PROSPECTO (FLUJO OFICIAL)
// ============================================================

export async function crearLevantamientoDesdeProspecto(
  prospectId: string,
  cotizacionId: string
): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  // VALIDACIÓN BACKEND: no crear si ya existe levantamiento activo
  const { data: existingLev } = await supabase
    .from('levantamientos_paciente')
    .select('id, estado')
    .eq('prospect_id', prospectId)
    .in('estado', ESTADOS_ACTIVOS)
    .limit(1)
    .maybeSingle()

  if (existingLev) {
    return { error: 'Ya existe un levantamiento activo para este prospecto. Archívalo antes de crear uno nuevo.' }
  }

  // Obtener cotización aceptada
  const { data: quote, error: qErr } = await supabase
    .from('care_quotes')
    .select('*')
    .eq('id', cotizacionId)
    .eq('prospect_id', prospectId)
    .eq('status', 'aceptada')
    .single()

  if (qErr || !quote) return { error: 'La cotización no existe o no ha sido aceptada' }

  // Obtener prospecto
  const { data: prospect, error: proErr } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', prospectId)
    .single()

  if (proErr || !prospect) return { error: 'Prospecto no encontrado' }

  // Obtener preassessment
  const { data: pre, error: preErr } = await supabase
    .from('patient_preassessments')
    .select('*')
    .eq('prospect_id', prospectId)
    .single()

  if (preErr || !pre) return { error: 'Prelevantamiento no encontrado. Completa el flujo antes de crear el levantamiento.' }

  // Obtener resultado de evaluación
  const { data: result } = await supabase
    .from('assessment_results')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!result) return { error: 'Resultado de evaluación no encontrado. Calcula el score antes de crear el levantamiento.' }

  // Obtener datos complementarios
  const { data: sr } = await supabase
    .from('service_requests')
    .select('*')
    .eq('prospect_id', prospectId)
    .maybeSingle()

  const { data: clinicalData } = await supabase
    .from('clinical_assessments')
    .select('*')
    .eq('preassessment_id', pre.id)
    .maybeSingle()

  const { data: physicalData } = await supabase
    .from('physical_assessments')
    .select('*')
    .eq('preassessment_id', pre.id)
    .maybeSingle()

  // Mapear datos clínicos al levantamiento
  const usaOxigeno = clinicalData ? clinicalData.oxygen_use >= 2 : false
  const devicesList: string[] = (clinicalData?.devices_list as string[]) ?? []
  const usaSonda = devicesList.some(d => d.toLowerCase().includes('sonda') || d.toLowerCase().includes('foley'))
  const usaCateter = devicesList.some(d => d.toLowerCase().includes('cateter') || d.toLowerCase().includes('central'))

  // Mapear movilidad desde score físico
  const mobScore = (physicalData?.mobility_status ?? 1) as number
  const movilidadMap: Record<number, string> = {
    1: 'independiente', 2: 'con_apoyo_minimo', 3: 'con_apoyo_moderado', 4: 'dependiente', 5: 'postrado',
  }
  const movilidad = movilidadMap[Math.min(mobScore, 5)] ?? 'independiente'

  // Separar nombre/apellido del paciente (preassessment guarda nombre completo)
  const nameParts = (pre.patient_name ?? '').trim().split(/\s+/)
  const pacienteNombre = nameParts[0] ?? pre.patient_name
  const pacienteApellido = nameParts.slice(1).join(' ') || '—'

  // Calcular riesgo y prioridad desde el resultado
  const riesgoMap: Record<string, string> = { verde: 'bajo', amarillo: 'bajo', naranja: 'medio', rojo: 'alto' }
  const prioridadMap: Record<string, string> = { bajo: 'baja', medio: 'media', alto: 'alta', especializado: 'urgente' }
  const riesgoFinal = riesgoMap[result.risk_color as string] ?? 'bajo'
  const prioridad = prioridadMap[result.general_complexity_level as string] ?? 'media'

  const precioFinal = (quote.final_price as number | null) ?? (quote.suggested_price as number)

  const { data: lev, error: levErr } = await supabase
    .from('levantamientos_paciente')
    .insert({
      // Trazabilidad
      prospect_id:              prospectId,
      preassessment_id:         pre.id,
      cotizacion_id:            cotizacionId,
      resultado_evaluacion_id:  result.id,
      levantamiento_origen:     'prelevantamiento',
      score_prelevantamiento:   result.total_score,
      datos_heredados_pendientes: true,

      // Datos del paciente (del preassessment)
      paciente_nombre:           pacienteNombre,
      paciente_apellido:         pacienteApellido,
      paciente_sexo:             (pre.patient_gender as string | null) ?? null,
      paciente_domicilio:        (pre.service_address as string | null) ?? null,
      paciente_ciudad:           (pre.city as string | null) ?? null,
      paciente_fecha_nacimiento: null,
      paciente_telefono:         null,
      paciente_referencias:      null,
      paciente_estado_geo:       null,
      paciente_cp:               null,
      paciente_obs_ubicacion:    null,

      // Responsable (del prospecto)
      responsable_nombre:          prospect.requester_name,
      responsable_parentesco:      prospect.relationship_to_patient,
      responsable_tel_principal:   prospect.requester_phone,
      responsable_tel_alternativo: (prospect.requester_whatsapp as string | null) ?? null,
      responsable_email:           (prospect.requester_email as string | null) ?? null,
      responsable_es_pagador:      prospect.is_payer ?? false,
      responsable_obs:             null,

      // Información clínica básica
      diagnostico_principal:    (pre.diagnosis as string | null) ?? null,
      diagnosticos_secundarios: null,
      medico_tratante:          (pre.doctor_name as string | null) ?? null,
      hospital_referencia:      (pre.hospital_reference as string | null) ?? null,
      movilidad,
      usa_oxigeno:  usaOxigeno,
      usa_sonda:    usaSonda,
      usa_cateter:  usaCateter,
      usa_panal:    false,
      tiene_dolor:  false,
      tiene_heridas: false,

      // Plan de servicio
      tipo_turno:              (sr?.shift_schedule as string | null) ?? null,
      horario_requerido:       (sr?.shift_schedule as string | null) ?? null,
      frecuencia_servicio:     (sr?.frequency as string | null) ?? null,
      fecha_inicio_estimada:   resolveStartDate(sr?.requested_start_date),
      nivel_personal:          result.recommended_profile as string,
      requiere_supervision:    (result.requires_clinical_supervision as boolean) ?? false,
      num_personas_requeridas: 1,
      tipos_servicio:          sr?.requested_service_type ? [sr.requested_service_type] : [],

      // Riesgo y prioridad
      riesgo_sugerido:          riesgoFinal,
      riesgo_final:             riesgoFinal,
      riesgo_modificado_manual: false,
      prioridad,

      // Costos diferenciados
      costo_historico:   null,
      costo_cotizado:    precioFinal,
      costo_vigente:     precioFinal,
      costo_autorizado:  precioFinal,
      costo_estimado:    precioFinal,
      forma_pago:        (sr?.payment_method as string | null) ?? null,
      responsable_pago:  prospect.is_payer
        ? prospect.requester_name
        : ((prospect.payment_responsible_name as string | null) ?? null),

      // Solicitud
      fecha_solicitud:     new Date().toISOString(),
      urgencia_percibida:  (prospect.urgency as string) ?? 'media',
      medio_contacto:      null,
      persona_solicita:    prospect.requester_name,
      relacion_solicitante: prospect.relationship_to_patient,
      motivo_general:      (pre.general_observations as string | null) ?? null,

      // Defaults
      orientacion:            [],
      actividades_enfermeria: [],
      entorno:                {},
      consentimiento:         {},
      signos_vitales:         {},
      estado:                 'borrador',
      levantado_por:          perfil.id,
      organization_id:        DEFAULT_ORG_ID,
    })
    .select('id')
    .single()

  if (levErr) return { error: levErr.message }

  revalidatePath('/levantamientos')
  return { id: lev.id }
}

// ============================================================
// CONVERTIR LEVANTAMIENTO → PACIENTE + CASO
// ============================================================

export async function convertirLevantamiento(
  id: string
): Promise<ActionResult & { pacienteId?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { data: lev, error: levErr } = await supabase
    .from('levantamientos_paciente')
    .select('*')
    .eq('id', id)
    .eq('estado', 'aprobado')
    .single()

  if (levErr || !lev) return { error: 'El levantamiento no existe o no está en estado aprobado.' }

  // Verificar si el paciente ya fue creado (operación idempotente)
  let pacienteId: string | null = null
  if (lev.prospect_id) {
    const { data: existing } = await supabase
      .from('pacientes')
      .select('id')
      .eq('source_prospect_id', lev.prospect_id)
      .maybeSingle()
    pacienteId = existing?.id ?? null
  }

  if (!pacienteId) {
    // Obtener medicamentos del levantamiento para poblar el perfil del paciente
    const { data: meds } = await supabase
      .from('levantamiento_medicamentos')
      .select('nombre, dosis, frecuencia')
      .eq('levantamiento_id', id)

    const medicamentosArr = (meds ?? []).map(
      (m: { nombre: string; dosis?: string; frecuencia?: string }) =>
        [m.nombre, m.dosis, m.frecuencia].filter(Boolean).join(' ')
    )
    const alergiasArr = lev.alergias
      ? String(lev.alergias).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
      : []

    const { data: paciente, error: pacErr } = await supabase
      .from('pacientes')
      .insert({
        nombre:            lev.paciente_nombre,
        apellido:          lev.paciente_apellido,
        fecha_nacimiento:  lev.paciente_fecha_nacimiento ?? '1950-01-01',
        diagnostico:       lev.diagnostico_principal ?? 'Por definir',
        medicamentos:      medicamentosArr,
        alergias:          alergiasArr,
        contacto_familiar: {
          nombre:   lev.responsable_nombre ?? '',
          telefono: lev.responsable_tel_principal ?? '',
          email:    lev.responsable_email ?? null,
          relacion: lev.responsable_parentesco ?? '',
        },
        contexto:           'domicilio',
        status:             'activo',
        source_prospect_id: lev.prospect_id ?? null,
        organization_id:    DEFAULT_ORG_ID,
      })
      .select('id')
      .single()

    if (pacErr) return { error: pacErr.message }
    pacienteId = paciente.id
  }

  // Cambiar estado del levantamiento a convertido
  const { error: updateErr } = await supabase
    .from('levantamientos_paciente')
    .update({ estado: 'convertido' })
    .eq('id', id)

  if (updateErr) return { error: updateErr.message }

  // Marcar prospecto como paciente activo
  if (lev.prospect_id) {
    await supabase
      .from('prospects')
      .update({ status: 'paciente_activo' })
      .eq('id', lev.prospect_id)
      .neq('status', 'paciente_activo')
  }

  revalidatePath('/levantamientos')
  revalidatePath(`/levantamientos/${id}`)
  revalidatePath('/pacientes')
  revalidatePath('/prospectos')

  return { pacienteId: pacienteId! }
}

// ============================================================
// ARCHIVAR LEVANTAMIENTO
// ============================================================

export async function archivarLevantamiento(
  id: string,
  motivo: string
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  if (!motivo?.trim()) {
    return { error: 'Se requiere un motivo para archivar el levantamiento' }
  }

  const { error } = await supabase
    .from('levantamientos_paciente')
    .update({
      estado:        'archivado',
      motivo_archivo: motivo.trim(),
      archivado_por:  perfil.id,
      archivado_at:   new Date().toISOString(),
    })
    .eq('id', id)
    .not('estado', 'in', '(archivado,sustituido,convertido)')

  if (error) return { error: error.message }

  revalidatePath('/levantamientos')
  revalidatePath(`/levantamientos/${id}`)
  return {}
}

// ============================================================
// HELPER: construir payload limpio para DB
// ============================================================

function buildInsertPayload(payload: LevantamientoPayload, levantadoPor: string) {
  return {
    // Datos del paciente
    paciente_nombre:           payload.paciente_nombre || '',
    paciente_apellido:         payload.paciente_apellido || '',
    paciente_fecha_nacimiento: payload.paciente_fecha_nacimiento || null,
    paciente_sexo:             payload.paciente_sexo || null,
    paciente_telefono:         payload.paciente_telefono || null,
    paciente_domicilio:        payload.paciente_domicilio || null,
    paciente_referencias:      payload.paciente_referencias || null,
    paciente_ciudad:           payload.paciente_ciudad || null,
    paciente_estado_geo:       payload.paciente_estado_geo || null,
    paciente_cp:               payload.paciente_cp || null,
    paciente_obs_ubicacion:    payload.paciente_obs_ubicacion || null,
    // Responsable
    responsable_nombre:          payload.responsable_nombre || null,
    responsable_parentesco:      payload.responsable_parentesco || null,
    responsable_tel_principal:   payload.responsable_tel_principal || null,
    responsable_tel_alternativo: payload.responsable_tel_alternativo || null,
    responsable_email:           payload.responsable_email || null,
    responsable_es_pagador:      payload.responsable_es_pagador ?? false,
    responsable_obs:             payload.responsable_obs || null,
    // Solicitud
    fecha_solicitud:     payload.fecha_solicitud || new Date().toISOString(),
    medio_contacto:      payload.medio_contacto || null,
    persona_solicita:    payload.persona_solicita || null,
    relacion_solicitante: payload.relacion_solicitante || null,
    motivo_general:      payload.motivo_general || null,
    urgencia_percibida:  payload.urgencia_percibida || 'media',
    // Servicio
    tipos_servicio:       payload.tipos_servicio ?? [],
    descripcion_necesidad: payload.descripcion_necesidad || null,
    expectativa_familia:  payload.expectativa_familia || null,
    obs_servicio:         payload.obs_servicio || null,
    // Valoración clínica
    diagnostico_principal:    payload.diagnostico_principal || null,
    diagnosticos_secundarios: payload.diagnosticos_secundarios || null,
    medico_tratante:          payload.medico_tratante || null,
    hospital_referencia:      payload.hospital_referencia || null,
    fecha_evento_reciente:    payload.fecha_evento_reciente || null,
    estado_conciencia:        payload.estado_conciencia || null,
    orientacion:              payload.orientacion ?? [],
    comunicacion:             payload.comunicacion || null,
    movilidad:                payload.movilidad || null,
    riesgo_caida:             payload.riesgo_caida || null,
    tiene_dolor:              payload.tiene_dolor ?? false,
    escala_dolor:             payload.escala_dolor ?? null,
    ubicacion_dolor:          payload.ubicacion_dolor || null,
    tiene_heridas:            payload.tiene_heridas ?? false,
    descripcion_heridas:      payload.descripcion_heridas || null,
    usa_oxigeno:              payload.usa_oxigeno ?? false,
    litros_oxigeno:           payload.litros_oxigeno || null,
    dispositivo_oxigeno:      payload.dispositivo_oxigeno || null,
    usa_sonda:                payload.usa_sonda ?? false,
    tipo_sonda:               payload.tipo_sonda || null,
    usa_cateter:              payload.usa_cateter ?? false,
    tipo_cateter:             payload.tipo_cateter || null,
    usa_panal:                payload.usa_panal ?? false,
    alimentacion:             payload.alimentacion || null,
    evacuacion:               payload.evacuacion || null,
    obs_clinicas:             payload.obs_clinicas || null,
    signos_vitales:           payload.signos_vitales ?? {},
    // Farmacología
    alergias:                payload.alergias || null,
    alergias_medicamentos:   payload.alergias_medicamentos || null,
    reacciones_previas:      payload.reacciones_previas || null,
    medicamentos_suspendidos: payload.medicamentos_suspendidos || null,
    obs_farmacologicas:      payload.obs_farmacologicas || null,
    // Actividades
    actividades_enfermeria: payload.actividades_enfermeria ?? [],
    obs_actividades:        payload.obs_actividades || null,
    // Entorno
    entorno: payload.entorno ?? {},
    // Plan
    fecha_inicio_estimada:   payload.fecha_inicio_estimada || null,
    fecha_termino_estimada:  payload.fecha_termino_estimada || null,
    tipo_turno:              payload.tipo_turno || null,
    horario_requerido:       payload.horario_requerido || null,
    frecuencia_servicio:     payload.frecuencia_servicio || null,
    num_personas_requeridas: payload.num_personas_requeridas ?? 1,
    nivel_personal:          payload.nivel_personal || null,
    requiere_supervision:    payload.requiere_supervision ?? false,
    prioridad:               payload.prioridad || 'media',
    // Riesgo
    riesgo_sugerido:          payload.riesgo_sugerido || 'bajo',
    riesgo_final:             payload.riesgo_final || 'bajo',
    riesgo_modificado_manual: payload.riesgo_modificado_manual ?? false,
    // Costos
    costo_estimado:    payload.costo_estimado ?? null,
    costo_autorizado:  payload.costo_autorizado ?? null,
    forma_pago:        payload.forma_pago || null,
    responsable_pago:  payload.responsable_pago || null,
    material_incluido: payload.material_incluido || null,
    material_no_incluido: payload.material_no_incluido || null,
    obs_administrativas: payload.obs_administrativas || null,
    // Consentimiento
    consentimiento: payload.consentimiento ?? {},
    // Control
    estado:          payload.estado || 'borrador',
    levantado_por:   levantadoPor,
    organization_id: DEFAULT_ORG_ID,
  }
}
