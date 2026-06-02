'use server'

import { revalidatePath } from 'next/cache'
import type {
  PatientPreassessment,
  PhysicalAssessment,
  ClinicalAssessment,
  OperationalRiskAssessment,
  ServiceRequest,
  AssessmentResult,
} from '@/types'
import { requireAuth, requireRole, fd, fdNum, fdBool, zodActionError, type ActionResult } from './utils'
import {
  getPhysicalLevel,
  getPhysicalAlerts,
  getClinicalLevel,
  getClinicalAlerts,
  getClinicalAlertLevel,
  getOperationalLevel,
  getOperationalAlerts,
  calculateAssessmentResult,
} from '@/lib/scoring'
import { z } from 'zod'

// ─── PRE-LEVANTAMIENTO ────────────────────────────────────────

const PreassessmentSchema = z.object({
  patient_name: z.string().min(2, 'Nombre del paciente requerido'),
  patient_age:  z.coerce.number().min(0).max(120).optional(),
})

export async function getPreassessment(prospectId: string) {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('patient_preassessments')
    .select('*')
    .eq('prospect_id', prospectId)
    .maybeSingle()
  return data as PatientPreassessment | null
}

export async function upsertPreassessment(
  prospectId: string,
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = PreassessmentSchema.safeParse({
    patient_name: fd(formData, 'patient_name'),
    patient_age:  fd(formData, 'patient_age') || undefined,
  })
  if (!parsed.success) return zodActionError(parsed.error)

  const existing = await supabase
    .from('patient_preassessments')
    .select('id')
    .eq('prospect_id', prospectId)
    .maybeSingle()

  const payload = {
    prospect_id:              prospectId,
    patient_name:             parsed.data.patient_name,
    patient_age:              parsed.data.patient_age ?? null,
    patient_gender:           fd(formData, 'patient_gender') || null,
    service_address:          fd(formData, 'service_address') || null,
    neighborhood:             fd(formData, 'neighborhood') || null,
    city:                     fd(formData, 'city') || null,
    approximate_weight:       fdNum(formData, 'approximate_weight') || null,
    diagnosis:                fd(formData, 'diagnosis') || null,
    doctor_name:              fd(formData, 'doctor_name') || null,
    hospital_reference:       fd(formData, 'hospital_reference') || null,
    currently_hospitalized:   fdBool(formData, 'currently_hospitalized'),
    current_location:         fd(formData, 'current_location') || 'casa',
    general_observations:     fd(formData, 'general_observations') || null,
  }

  let id: string
  if (existing.data?.id) {
    const { error } = await supabase
      .from('patient_preassessments')
      .update(payload)
      .eq('id', existing.data.id)
    if (error) return { error: error.message }
    id = existing.data.id
  } else {
    const { data, error } = await supabase
      .from('patient_preassessments')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    id = data.id
  }

  // Actualizar status del prospecto
  await supabase
    .from('prospects')
    .update({ status: 'prelevantamiento_iniciado' })
    .eq('id', prospectId)
    .eq('status', 'nuevo')

  revalidatePath(`/prospectos/${prospectId}`)
  return { id }
}

// ─── EVALUACIÓN FÍSICA ────────────────────────────────────────

function parsePhysicalForm(formData: FormData) {
  return {
    mobility_status:    Math.min(4, Math.max(0, fdNum(formData, 'mobility_status'))),
    fall_risk:          Math.min(4, Math.max(0, fdNum(formData, 'fall_risk'))),
    bed_status:         Math.min(4, Math.max(0, fdNum(formData, 'bed_status'))),
    position_changes:   Math.min(4, Math.max(0, fdNum(formData, 'position_changes'))),
    diaper_or_bathroom: Math.min(4, Math.max(0, fdNum(formData, 'diaper_or_bathroom'))),
    hygiene_support:    Math.min(4, Math.max(0, fdNum(formData, 'hygiene_support'))),
    feeding_status:     Math.min(5, Math.max(0, fdNum(formData, 'feeding_status'))),
    hydration_support:  Math.min(3, Math.max(0, fdNum(formData, 'hydration_support'))),
    night_watch_status: Math.min(4, Math.max(0, fdNum(formData, 'night_watch_status'))),
    daily_life_support: Math.min(4, Math.max(0, fdNum(formData, 'daily_life_support'))),
  }
}

export async function getPhysicalAssessment(preassessmentId: string) {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('physical_assessments')
    .select('*')
    .eq('preassessment_id', preassessmentId)
    .maybeSingle()
  return data as PhysicalAssessment | null
}

export async function upsertPhysicalAssessment(
  preassessmentId: string,
  prospectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const scores = parsePhysicalForm(formData)
  const physical_score = Object.values(scores).reduce((a, b) => a + b, 0)
  const physical_level = getPhysicalLevel(physical_score)

  const fullPayload = {
    preassessment_id: preassessmentId,
    ...scores,
    physical_score,
    physical_level,
    physical_alerts: [] as string[],
  }
  fullPayload.physical_alerts = getPhysicalAlerts(fullPayload as PhysicalAssessment)

  const existing = await supabase
    .from('physical_assessments')
    .select('id')
    .eq('preassessment_id', preassessmentId)
    .maybeSingle()

  const { error } = existing.data?.id
    ? await supabase.from('physical_assessments').update(fullPayload).eq('id', existing.data.id)
    : await supabase.from('physical_assessments').insert(fullPayload)

  if (error) return { error: error.message }
  revalidatePath(`/prospectos/${prospectId}`)
  return {}
}

// ─── EVALUACIÓN CLÍNICA ───────────────────────────────────────

const DEVICE_SCORES: Record<string, number> = {
  ninguno:               0,
  sonda_foley:           3,
  sonda_nasogastrica:    4,
  gastrostomia:          5,
  colostomia:            5,
  drenaje_quirurgico:    5,
  cateter_periferico:    4,
  cateter_central:       7,
  cateter_puerto:        7,
  traqueostomia:         8,
}

export async function getClinicalAssessment(preassessmentId: string) {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('clinical_assessments')
    .select('*')
    .eq('preassessment_id', preassessmentId)
    .maybeSingle()
  return data as ClinicalAssessment | null
}

export async function upsertClinicalAssessment(
  preassessmentId: string,
  prospectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  // Multi-select devices
  const devicesRaw = formData.getAll('devices_list') as string[]
  const devices_list = devicesRaw.filter(d => d !== 'ninguno')
  const devices_score = devices_list.reduce((sum, d) => sum + (DEVICE_SCORES[d] ?? 0), 0)

  const scores = {
    medication_status:          Math.min(5, Math.max(0, fdNum(formData, 'medication_status'))),
    injectable_medications:     Math.min(5, Math.max(0, fdNum(formData, 'injectable_medications'))),
    vital_signs_frequency:      Math.min(4, Math.max(0, fdNum(formData, 'vital_signs_frequency'))),
    glucose_control:            Math.min(5, Math.max(0, fdNum(formData, 'glucose_control'))),
    oxygen_use:                 Math.min(6, Math.max(0, fdNum(formData, 'oxygen_use'))),
    nebulizations:              Math.min(5, Math.max(0, fdNum(formData, 'nebulizations'))),
    devices_score,
    wound_care:                 Math.min(7, Math.max(0, fdNum(formData, 'wound_care'))),
    pain_status:                Math.min(5, Math.max(0, fdNum(formData, 'pain_status'))),
    postoperative_status:       Math.min(5, Math.max(0, fdNum(formData, 'postoperative_status'))),
    neurological_events:        Math.min(7, Math.max(0, fdNum(formData, 'neurological_events'))),
    secretion_aspiration:       Math.min(9, Math.max(0, fdNum(formData, 'secretion_aspiration'))),
    fluid_output_record:        Math.min(4, Math.max(0, fdNum(formData, 'fluid_output_record'))),
    medical_indications_status: Math.min(4, Math.max(0, fdNum(formData, 'medical_indications_status'))),
    emergency_contact_status:   Math.min(4, Math.max(0, fdNum(formData, 'emergency_contact_status'))),
  }

  const clinical_score = Object.values(scores).reduce((a, b) => a + b, 0)
  const clinical_level = getClinicalLevel(clinical_score)

  const postopNotes = fdNum(formData, 'postoperative_status') >= 1 ? {
    tipo_cirugia:         fd(formData, 'tipo_cirugia') || null,
    fecha_cirugia:        fd(formData, 'fecha_cirugia') || null,
    indicaciones:         fd(formData, 'postop_indicaciones') || null,
    restricciones:        fd(formData, 'postop_restricciones') || null,
  } : null

  const fullPayload = {
    preassessment_id: preassessmentId,
    ...scores,
    devices_list,
    clinical_score,
    clinical_level,
    clinical_alert_level: '' as string,
    clinical_alerts: [] as string[],
    minimum_clinical_profile: null as string | null,
    postoperative_notes: postopNotes,
  }

  fullPayload.clinical_alert_level = getClinicalAlertLevel(fullPayload as unknown as ClinicalAssessment)
  fullPayload.clinical_alerts = getClinicalAlerts(fullPayload as unknown as ClinicalAssessment)

  const existing = await supabase
    .from('clinical_assessments')
    .select('id')
    .eq('preassessment_id', preassessmentId)
    .maybeSingle()

  const { error } = existing.data?.id
    ? await supabase.from('clinical_assessments').update(fullPayload).eq('id', existing.data.id)
    : await supabase.from('clinical_assessments').insert(fullPayload)

  if (error) return { error: error.message }
  revalidatePath(`/prospectos/${prospectId}`)
  return {}
}

// ─── EVALUACIÓN OPERATIVA ────────────────────────────────────

export async function getOperationalAssessment(preassessmentId: string) {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('operational_risk_assessments')
    .select('*')
    .eq('preassessment_id', preassessmentId)
    .maybeSingle()
  return data as OperationalRiskAssessment | null
}

export async function upsertOperationalAssessment(
  preassessmentId: string,
  prospectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const scores = {
    orientation_status:        Math.min(4, Math.max(0, fdNum(formData, 'orientation_status'))),
    cognitive_impairment:      Math.min(5, Math.max(0, fdNum(formData, 'cognitive_impairment'))),
    agitation_or_aggression:   Math.min(8, Math.max(0, fdNum(formData, 'agitation_or_aggression'))),
    device_removal_risk:       Math.min(6, Math.max(0, fdNum(formData, 'device_removal_risk'))),
    communication_ability:     Math.min(4, Math.max(0, fdNum(formData, 'communication_ability'))),
    emotional_state:           Math.min(3, Math.max(0, fdNum(formData, 'emotional_state'))),
    family_decision_structure: Math.min(5, Math.max(0, fdNum(formData, 'family_decision_structure'))),
    payment_clarity:           Math.min(6, Math.max(0, fdNum(formData, 'payment_clarity'))),
    family_conflict_level:     Math.min(6, Math.max(0, fdNum(formData, 'family_conflict_level'))),
    service_expectations:      Math.min(4, Math.max(0, fdNum(formData, 'service_expectations'))),
    supplies_availability:     Math.min(4, Math.max(0, fdNum(formData, 'supplies_availability'))),
    home_safety:               Math.min(6, Math.max(0, fdNum(formData, 'home_safety'))),
  }

  const operational_score = Object.values(scores).reduce((a, b) => a + b, 0)
  const operational_level = getOperationalLevel(operational_score)

  const fullPayload = {
    preassessment_id: preassessmentId,
    ...scores,
    operational_score,
    operational_level,
    operational_alerts: [] as string[],
    requires_written_agreements: operational_score >= 13 || scores.family_conflict_level >= 4,
    requires_payment_before: operational_score >= 13 || scores.payment_clarity >= 3,
  }
  fullPayload.operational_alerts = getOperationalAlerts(fullPayload as OperationalRiskAssessment)

  const existing = await supabase
    .from('operational_risk_assessments')
    .select('id')
    .eq('preassessment_id', preassessmentId)
    .maybeSingle()

  const { error } = existing.data?.id
    ? await supabase.from('operational_risk_assessments').update(fullPayload).eq('id', existing.data.id)
    : await supabase.from('operational_risk_assessments').insert(fullPayload)

  if (error) return { error: error.message }
  revalidatePath(`/prospectos/${prospectId}`)
  return {}
}

// ─── DATOS COMERCIALES ────────────────────────────────────────

export async function getServiceRequest(prospectId: string) {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('service_requests')
    .select('*')
    .eq('prospect_id', prospectId)
    .maybeSingle()
  return data as ServiceRequest | null
}

export async function upsertServiceRequest(
  prospectId: string,
  preassessmentId: string | null,
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const staffPreference = formData.getAll('staff_preference') as string[]
  const shiftHours = fdNum(formData, 'shift_duration_hours') || 8

  const payload = {
    prospect_id:              prospectId,
    preassessment_id:         preassessmentId,
    requested_service_type:   fd(formData, 'requested_service_type') || 'no_sabe',
    shift_duration_hours:     shiftHours,
    shift_schedule:           fd(formData, 'shift_schedule') || 'por_definir',
    frequency:                fd(formData, 'frequency') || 'por_definir',
    requested_start_date:     fd(formData, 'requested_start_date') || 'sin_fecha',
    estimated_duration:       fd(formData, 'estimated_duration') || 'no_se_sabe',
    staff_preference:         staffPreference,
    report_type:              fd(formData, 'report_type') || 'reporte_breve',
    supervision_type:         fd(formData, 'supervision_type') || 'ninguna',
    medication_control_type:  fd(formData, 'medication_control_type') || 'ninguno',
    supplies_handling:        fd(formData, 'supplies_handling') || 'familia_provee',
    payment_method:           fd(formData, 'payment_method') || 'por_definir',
    payment_frequency:        fd(formData, 'payment_frequency') || 'por_definir',
    location_type:            fd(formData, 'location_type') || 'normal',
    commercial_notes:         fd(formData, 'commercial_notes') || null,
  }

  const existing = await supabase
    .from('service_requests')
    .select('id')
    .eq('prospect_id', prospectId)
    .maybeSingle()

  let id: string
  if (existing.data?.id) {
    const { error } = await supabase
      .from('service_requests')
      .update(payload)
      .eq('id', existing.data.id)
    if (error) return { error: error.message }
    id = existing.data.id
  } else {
    const { data, error } = await supabase
      .from('service_requests')
      .insert(payload)
      .select('id')
      .single()
    if (error) return { error: error.message }
    id = data.id
  }

  revalidatePath(`/prospectos/${prospectId}`)
  return { id }
}

// ─── CALCULAR RESULTADO COMPLETO ──────────────────────────────

export async function calcularResultado(
  prospectId: string,
  preassessmentId: string,
): Promise<ActionResult & { resultId?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const [paRes, caRes, oaRes, srRes, prospectRes] = await Promise.all([
    supabase.from('physical_assessments').select('*').eq('preassessment_id', preassessmentId).maybeSingle(),
    supabase.from('clinical_assessments').select('*').eq('preassessment_id', preassessmentId).maybeSingle(),
    supabase.from('operational_risk_assessments').select('*').eq('preassessment_id', preassessmentId).maybeSingle(),
    supabase.from('service_requests').select('*').eq('prospect_id', prospectId).maybeSingle(),
    supabase.from('prospects').select('is_urgent').eq('id', prospectId).single(),
  ])

  if (!paRes.data) return { error: 'Falta la evaluación física. Complétala antes de calcular.' }
  if (!caRes.data) return { error: 'Falta la evaluación clínica. Complétala antes de calcular.' }
  if (!oaRes.data) return { error: 'Falta la evaluación operativa. Complétala antes de calcular.' }

  const result = calculateAssessmentResult(
    paRes.data as PhysicalAssessment,
    caRes.data as ClinicalAssessment,
    oaRes.data as OperationalRiskAssessment,
    prospectId,
    prospectRes.data?.is_urgent ?? false,
    srRes.data ?? {},
  )

  // Borrar resultado anterior si existe
  await supabase.from('assessment_results').delete().eq('prospect_id', prospectId)

  const { data, error } = await supabase
    .from('assessment_results')
    .insert({ ...result, preassessment_id: preassessmentId })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Actualizar status del prospecto
  const newStatus = result.blocking_flags.length > 0 || result.risk_color === 'rojo'
    ? 'requiere_valoracion'
    : 'cotizacion_generada'

  await supabase.from('prospects').update({ status: newStatus }).eq('id', prospectId)

  revalidatePath(`/prospectos/${prospectId}`)
  return { resultId: data.id }
}

export async function getAssessmentResult(prospectId: string) {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('assessment_results')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as AssessmentResult | null
}
