// ============================================================
// Motor de Score — Evaluación Inicial de Cuidado
// Lógica pura, sin dependencias de framework
// ============================================================

import type {
  PhysicalAssessment,
  ClinicalAssessment,
  OperationalRiskAssessment,
  AssessmentResult,
  ComplexityLevel,
  RiskColor,
  RecommendedProfile,
} from '@/types'

// ─── Niveles físicos ──────────────────────────────────────────
export function getPhysicalLevel(score: number): string {
  if (score <= 5)  return 'apoyo_ligero'
  if (score <= 12) return 'apoyo_moderado'
  if (score <= 22) return 'alta_dependencia'
  return 'dependencia_severa'
}

export const PHYSICAL_LEVEL_LABELS: Record<string, string> = {
  apoyo_ligero:      'Apoyo ligero',
  apoyo_moderado:    'Apoyo físico moderado',
  alta_dependencia:  'Alta dependencia física',
  dependencia_severa:'Dependencia física severa',
}

// ─── Niveles clínicos ─────────────────────────────────────────
export function getClinicalLevel(score: number): string {
  if (score <= 4)  return 'sin_necesidades'
  if (score <= 12) return 'basico'
  if (score <= 24) return 'moderado'
  if (score <= 39) return 'alto'
  return 'alta_complejidad'
}

export const CLINICAL_LEVEL_LABELS: Record<string, string> = {
  sin_necesidades: 'Sin necesidades clínicas relevantes',
  basico:          'Necesidades clínicas básicas',
  moderado:        'Necesidades clínicas moderadas',
  alto:            'Necesidades clínicas altas',
  alta_complejidad:'Alta complejidad clínica',
}

// ─── Niveles operativos ───────────────────────────────────────
export function getOperationalLevel(score: number): string {
  if (score <= 5)  return 'claro_manejable'
  if (score <= 12) return 'riesgo_leve'
  if (score <= 22) return 'riesgo_moderado'
  if (score <= 35) return 'riesgo_alto'
  return 'riesgo_critico'
}

export const OPERATIONAL_LEVEL_LABELS: Record<string, string> = {
  claro_manejable: 'Entorno claro y manejable',
  riesgo_leve:     'Riesgo operativo leve',
  riesgo_moderado: 'Riesgo operativo moderado',
  riesgo_alto:     'Riesgo operativo alto',
  riesgo_critico:  'Riesgo crítico / requiere condiciones especiales',
}

// ─── Nivel general / semáforo ─────────────────────────────────
export function getComplexityLevel(total: number): ComplexityLevel {
  if (total <= 12) return 'bajo'
  if (total <= 28) return 'medio'
  if (total <= 50) return 'alto'
  return 'especializado'
}

export function getRiskColor(
  total: number,
  blockingFlags: string[],
): RiskColor {
  if (blockingFlags.length > 0 || total > 50) return 'rojo'
  if (total > 28) return 'naranja'
  if (total > 12) return 'amarillo'
  return 'verde'
}

export const RISK_COLOR_LABELS: Record<RiskColor, string> = {
  verde:   'Cotizable de inmediato',
  amarillo:'Cotizable con aclaraciones',
  naranja: 'Requiere valoración antes de iniciar',
  rojo:    'No iniciar sin validación formal',
}

export const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  bajo:        'Bajo',
  medio:       'Medio',
  alto:        'Alto',
  especializado:'Especializado / alto riesgo',
}

// ─── Perfil recomendado ───────────────────────────────────────
export function getRecommendedProfile(
  physical: PhysicalAssessment,
  clinical: ClinicalAssessment,
  operationalScore: number,
): RecommendedProfile {
  const cs = clinical.clinical_score
  const ps = physical.physical_score

  // Dispositivos críticos → especializado
  const CRITICAL_DEVICES = ['traqueostomia', 'cateter_central', 'cateter_puerto']
  const hasCriticalDevice = CRITICAL_DEVICES.some(d => clinical.devices_list.includes(d))
  if (
    hasCriticalDevice ||
    clinical.secretion_aspiration >= 4 ||
    clinical.injectable_medications >= 5 ||
    clinical.wound_care >= 7 ||
    clinical.neurological_events >= 5 ||
    clinical.oxygen_use >= 6
  ) return 'enfermero_especializado'

  // Alta complejidad clínica → enfermero con experiencia
  if (
    cs >= 13 ||
    clinical.oxygen_use >= 3 ||
    clinical.glucose_control >= 5 ||
    clinical.postoperative_status >= 3 ||
    clinical.wound_care >= 3 ||
    clinical.devices_list.includes('sonda_foley') ||
    physical.feeding_status >= 5
  ) return 'enfermero_general'

  // Necesidades clínicas básicas → enfermero general
  if (
    cs >= 5 ||
    clinical.medication_status >= 2 ||
    clinical.vital_signs_frequency >= 2 ||
    clinical.wound_care >= 2
  ) return 'enfermero_general'

  // Apoyo físico moderado a alto → auxiliar
  if (ps >= 6 || physical.physical_level !== 'apoyo_ligero') return 'auxiliar'

  return 'cuidador'
}

// ─── Alertas físicas ──────────────────────────────────────────
export function getPhysicalAlerts(pa: PhysicalAssessment): string[] {
  const alerts: string[] = []
  if (pa.fall_risk >= 3)         alerts.push('Riesgo de caída alto — evaluación de entorno requerida')
  if (pa.position_changes >= 3)  alerts.push('Riesgo de lesión en piel — cambios posturales frecuentes')
  if (pa.daily_life_support >= 3) alerts.push('Carga física alta para el personal')
  if (pa.night_watch_status >= 3) alerts.push('Guardia nocturna demandante — personal alerta')
  if (pa.feeding_status >= 5)    alerts.push('Alimentación por sonda — manejo clínico, no cotizar como cuidado básico')
  return alerts
}

// ─── Alertas clínicas ─────────────────────────────────────────
export function getClinicalAlerts(ca: ClinicalAssessment): string[] {
  const alerts: string[] = []
  if (ca.medication_status >= 5)        alerts.push('Medicamentos controlados o de alto riesgo — receta y registro obligatorio')
  if (ca.injectable_medications >= 5)   alerts.push('Medicamentos IV — requiere enfermero capacitado')
  if (ca.oxygen_use >= 6)               alerts.push('Saturación inestable — vigilancia respiratoria constante')
  if (ca.devices_list.includes('cateter_central') || ca.devices_list.includes('cateter_puerto'))
    alerts.push('Catéter central — valoración previa obligatoria')
  if (ca.devices_list.includes('traqueostomia'))
    alerts.push('Traqueostomía — no iniciar como guardia básica')
  if (ca.secretion_aspiration >= 4)     alerts.push('Aspiración de secreciones — experiencia clínica necesaria')
  if (ca.wound_care >= 7)               alerts.push('Herida infectada o compleja — plan de curación requerido')
  if (ca.neurological_events >= 5)      alerts.push('Crisis recurrentes — riesgo activo')
  if (ca.medical_indications_status >= 3) alerts.push('Sin indicaciones médicas claras — no administrar sin respaldo')
  if (ca.emergency_contact_status >= 4) alerts.push('Sin contacto de emergencia confiable')
  return alerts
}

// ─── Nivel de alerta clínica ──────────────────────────────────
export function getClinicalAlertLevel(ca: ClinicalAssessment): 'verde' | 'amarillo' | 'naranja' | 'rojo' {
  // Rojo
  if (
    ca.medication_status >= 5 ||
    ca.injectable_medications >= 5 ||
    ca.devices_list.includes('cateter_central') ||
    ca.devices_list.includes('cateter_puerto') ||
    ca.devices_list.includes('traqueostomia') ||
    ca.secretion_aspiration >= 5 ||
    ca.wound_care >= 7 ||
    ca.oxygen_use >= 6 ||
    ca.neurological_events >= 7 ||
    ca.emergency_contact_status >= 4
  ) return 'rojo'

  // Naranja
  if (
    ca.oxygen_use >= 3 ||
    ca.injectable_medications >= 3 ||
    ca.wound_care >= 3 ||
    ca.postoperative_status >= 3 ||
    ca.neurological_events >= 3 ||
    ca.fluid_output_record >= 4 ||
    ca.medical_indications_status >= 2
  ) return 'naranja'

  // Amarillo
  if (
    ca.medication_status >= 3 ||
    ca.vital_signs_frequency >= 3 ||
    ca.glucose_control >= 2 ||
    ca.nebulizations >= 2 ||
    ca.wound_care >= 2 ||
    ca.pain_status >= 2
  ) return 'amarillo'

  return 'verde'
}

// ─── Alertas operativas ───────────────────────────────────────
export function getOperationalAlerts(oa: OperationalRiskAssessment): string[] {
  const alerts: string[] = []
  if (oa.agitation_or_aggression >= 8)     alerts.push('Agresividad física — no iniciar sin condiciones de seguridad')
  if (oa.home_safety >= 6)                 alerts.push('Domicilio con riesgo para el personal')
  if (oa.family_conflict_level >= 4)       alerts.push('Conflicto familiar — bitácora obligatoria')
  if (oa.payment_clarity >= 6)             alerts.push('Sin responsable de pago definido — no iniciar servicio')
  if (oa.family_decision_structure >= 4)   alerts.push('Sin responsable único — definir contacto autorizado')
  if (oa.service_expectations >= 3)        alerts.push('Expectativas fuera del alcance — aclarar límites del servicio')
  return alerts
}

// ─── Banderas de bloqueo ──────────────────────────────────────
export function getBlockingFlags(
  ca: ClinicalAssessment,
  oa: OperationalRiskAssessment,
  isUrgent: boolean,
): string[] {
  const flags: string[] = []

  // Clínicas
  if (ca.injectable_medications >= 5) flags.push('Medicamentos intravenosos')
  if (ca.medication_status >= 5)      flags.push('Medicamentos controlados o de alto riesgo')
  if (ca.oxygen_use >= 6)             flags.push('Oxígeno continuo con saturación inestable')
  if (ca.devices_list.includes('cateter_central') || ca.devices_list.includes('cateter_puerto'))
    flags.push('Catéter central')
  if (ca.devices_list.includes('traqueostomia'))
    flags.push('Traqueostomía')
  if (ca.secretion_aspiration >= 7)   flags.push('Aspiración de secreciones frecuente')
  if (ca.wound_care >= 7)             flags.push('Herida infectada o compleja')
  if (ca.neurological_events >= 7)    flags.push('Crisis convulsivas recurrentes')
  if (ca.medical_indications_status >= 3) flags.push('Sin indicaciones médicas claras para medicamentos')
  if (ca.emergency_contact_status >= 4)  flags.push('Sin contacto de emergencia confiable')

  // Operativas
  if (oa.agitation_or_aggression >= 8) flags.push('Agresividad física — riesgo para el personal')
  if (oa.payment_clarity >= 6)          flags.push('Sin responsable de pago definido')
  if (oa.home_safety >= 6)              flags.push('Domicilio inseguro para el personal')

  // Urgencia sin info completa (no bloquea por sí solo, es advertencia)
  return flags
}

// ─── Banderas de advertencia ──────────────────────────────────
export function getWarningFlags(
  pa: PhysicalAssessment,
  ca: ClinicalAssessment,
  oa: OperationalRiskAssessment,
  isUrgent: boolean,
): string[] {
  const flags: string[] = []

  if (pa.fall_risk >= 3)               flags.push('Riesgo de caída')
  if (pa.position_changes >= 3)        flags.push('Riesgo de lesión en piel')
  if (pa.feeding_status >= 5)          flags.push('Alimentación por sonda')
  if (ca.oxygen_use >= 3)              flags.push('Oxígeno continuo')
  if (ca.devices_list.includes('sonda_foley')) flags.push('Sonda Foley')
  if (ca.postoperative_status >= 3)    flags.push('Postquirúrgico reciente')
  if (ca.wound_care >= 4)              flags.push('Escaras o herida moderada')
  if (ca.neurological_events >= 3)     flags.push('Eventos neurológicos recientes')
  if (oa.cognitive_impairment >= 4)    flags.push('Deterioro cognitivo avanzado')
  if (oa.family_conflict_level >= 4)   flags.push('Familia conflictiva')
  if (oa.service_expectations >= 3)    flags.push('Expectativas fuera de alcance')
  if (isUrgent)                        flags.push('Servicio urgente')

  return flags
}

// ─── Reglas de valoración obligatoria ────────────────────────
export function requiresInPersonAssessment(
  result: Pick<AssessmentResult, 'total_score' | 'risk_color' | 'blocking_flags' | 'warning_flags'>,
  ca: ClinicalAssessment,
  oa: OperationalRiskAssessment,
  sr: { shift_duration_hours?: number | null; frequency?: string | null },
): boolean {
  if (result.blocking_flags.length > 0) return true
  if (result.risk_color === 'naranja' || result.risk_color === 'rojo') return true
  if (result.total_score >= 29) return true
  if (ca.oxygen_use >= 3) return true
  if (ca.postoperative_status >= 3) return true
  if (ca.wound_care >= 4) return true
  if (ca.medication_status >= 5) return true
  if (oa.cognitive_impairment >= 5) return true
  if (oa.agitation_or_aggression >= 4) return true
  if (oa.family_conflict_level >= 4) return true
  if (sr.shift_duration_hours === 24) return true
  if (sr.frequency === 'indefinido_diario') return true
  return false
}

// ─── Función principal del motor de score ────────────────────
export function calculateAssessmentResult(
  pa: PhysicalAssessment,
  ca: ClinicalAssessment,
  oa: OperationalRiskAssessment,
  prospectId: string,
  isUrgent: boolean,
  sr?: { shift_duration_hours?: number | null; frequency?: string | null },
): Omit<AssessmentResult, 'id' | 'created_at' | 'updated_at'> {
  const physicalScore   = pa.physical_score
  const clinicalScore   = ca.clinical_score
  const operationalScore = oa.operational_score
  const totalScore = physicalScore + clinicalScore + operationalScore

  const blockingFlags = getBlockingFlags(ca, oa, isUrgent)
  const warningFlags  = getWarningFlags(pa, ca, oa, isUrgent)
  const riskColor     = getRiskColor(totalScore, blockingFlags)
  const complexityLevel = getComplexityLevel(totalScore)
  const recommendedProfile = getRecommendedProfile(pa, ca, operationalScore)

  const partialResult = {
    preassessment_id: pa.preassessment_id,
    prospect_id: prospectId,
    physical_score: physicalScore,
    clinical_score: clinicalScore,
    operational_score: operationalScore,
    total_score: totalScore,
    general_complexity_level: complexityLevel,
    risk_color: riskColor,
    recommended_profile: recommendedProfile,
    blocking_flags: blockingFlags,
    warning_flags: warningFlags,
  }

  const inPersonRequired = requiresInPersonAssessment(
    { total_score: totalScore, risk_color: riskColor, blocking_flags: blockingFlags, warning_flags: warningFlags },
    ca,
    oa,
    sr ?? {},
  )

  const requiresMandatoryLog =
    oa.family_conflict_level >= 4 ||
    oa.agitation_or_aggression >= 5 ||
    riskColor === 'rojo'

  const requiresAdvancePayment =
    oa.operational_score >= 13 ||
    oa.payment_clarity >= 3 ||
    riskColor === 'naranja' ||
    riskColor === 'rojo'

  const recommendation = buildRecommendation(
    riskColor, complexityLevel, recommendedProfile,
    blockingFlags, warningFlags, inPersonRequired,
  )

  return {
    ...partialResult,
    requires_in_person_assessment: inPersonRequired,
    requires_formal_proposal: riskColor !== 'verde',
    requires_clinical_supervision: recommendedProfile === 'enfermero_especializado' || clinicalScore >= 25,
    requires_mandatory_log: requiresMandatoryLog,
    requires_advance_payment: requiresAdvancePayment,
    internal_recommendation: recommendation,
  }
}

function buildRecommendation(
  color: RiskColor,
  level: ComplexityLevel,
  profile: RecommendedProfile,
  blocking: string[],
  warnings: string[],
  inPerson: boolean,
): string {
  const profileLabels: Record<RecommendedProfile, string> = {
    cuidador: 'Cuidador / acompañante capacitado',
    auxiliar: 'Auxiliar / cuidador experimentado',
    enfermero_general: 'Enfermero general',
    enfermero_especializado: 'Enfermero especializado + supervisión',
  }

  let rec = `Perfil sugerido: ${profileLabels[profile]}. Nivel ${level} (${RISK_COLOR_LABELS[color]}).`

  if (blocking.length > 0) {
    rec += ` BLOQUEOS CRÍTICOS: ${blocking.join(', ')}.`
  }
  if (inPerson) {
    rec += ' Se requiere valoración presencial antes de iniciar.'
  }
  if (warnings.length > 0) {
    rec += ` Advertencias: ${warnings.slice(0, 3).join(', ')}.`
  }
  return rec
}
