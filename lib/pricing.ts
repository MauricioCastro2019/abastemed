// ============================================================
// Motor de Precios — Cotizador Inteligente Abastemed
// Lógica pura, sin dependencias de framework
// ============================================================

import type {
  AssessmentResult,
  ServiceRequest,
  RecommendedProfile,
  RiskColor,
  CareQuote,
  QuoteAdjustment,
} from '@/types'

// ─── Tarifas base ─────────────────────────────────────────────
type ShiftHours = 4 | 6 | 8 | 12 | 24

const BASE_RATES: Record<RecommendedProfile, Record<ShiftHours, number>> = {
  cuidador:              { 4: 450,  6: 550,  8: 600,  12: 850,  24: 1500 },
  auxiliar:              { 4: 550,  6: 700,  8: 750,  12: 1050, 24: 1850 },
  enfermero_general:     { 4: 750,  6: 850,  8: 950,  12: 1350, 24: 2400 },
  enfermero_especializado:{ 4: 1000, 6: 1150, 8: 1300, 12: 1850, 24: 3300 },
}

export const PROFILE_LABELS: Record<RecommendedProfile, string> = {
  cuidador:               'Cuidador / acompañante capacitado',
  auxiliar:               'Auxiliar / cuidador experimentado',
  enfermero_general:      'Enfermero general',
  enfermero_especializado:'Enfermero especializado',
}

// ─── Ajustes por horario ──────────────────────────────────────
const SCHEDULE_ADJUSTMENTS: Record<string, number> = {
  matutino:    0,
  vespertino:  0,
  nocturno:    0.10,
  mixto:       0.05,
  rotativo:    0.10,
  festivo:     0.20,
  domingo:     0.10,
  alta_demanda:0.15,
  por_definir: 0,
}

// ─── Ajustes por urgencia ─────────────────────────────────────
const URGENCY_ADJUSTMENTS: Record<string, number> = {
  hoy_mismo:     0.15,
  menos_12h:     0.20,
  manana:        0.05,
  esta_semana:   0,
  cotizando:     0,
  sin_fecha:     0,
  por_definir:   0,
}

// ─── Ajustes por complejidad física ──────────────────────────
function getPhysicalAdjustmentRate(score: number): number {
  if (score <= 5)  return 0
  if (score <= 12) return 0.05
  if (score <= 22) return 0.10
  return 0.15
}

// ─── Ajustes por complejidad clínica ─────────────────────────
function getClinicalAdjustmentRate(score: number): number {
  if (score <= 4)  return 0
  if (score <= 12) return 0.05
  if (score <= 24) return 0.10
  if (score <= 39) return 0.20
  return 0.30
}

// ─── Ajustes por riesgo operativo ────────────────────────────
function getOperationalAdjustmentRate(score: number): number {
  if (score <= 5)  return 0
  if (score <= 12) return 0.03
  if (score <= 22) return 0.07
  if (score <= 35) return 0.12
  return 0.20
}

// ─── Ajustes por ubicación ───────────────────────────────────
const LOCATION_ADJUSTMENTS: Record<string, number> = {
  normal:    0,
  lejana:    0.05,
  dificil:   0.10,
  por_definir: 0,
}

// ─── Extras fijos ─────────────────────────────────────────────
const REPORT_FEES: Record<string, number> = {
  sin_reporte:           0,
  avisos_importantes:    0,
  reporte_breve:         50,
  bitacora_formal:       100,
  reporte_clinico:       150,
  resumen_semanal:       250,
}

const SUPERVISION_FEES: Record<string, number> = {
  ninguna:          0,
  valoracion_unica: 700,
  semanal:          500,
  por_evento:       375,
  obligatoria:      500,
}

const MEDICATION_FEES: Record<string, number> = {
  ninguno:              0,
  solo_apoyo:           0,
  registro:             100,
  organizar_horarios:   150,
  revisar_existencia:   100,
  control_completo:     250,
}

// ─── Redondeo ─────────────────────────────────────────────────
export function roundPrice(price: number): number {
  if (price < 1000)  return Math.ceil(price / 50) * 50
  if (price < 3000)  return Math.ceil(price / 100) * 100
  return Math.ceil(price / 250) * 250
}

// ─── Precio mínimo recomendado ───────────────────────────────
export function getMinimumPrice(suggested: number, color: RiskColor): number {
  const rates: Record<RiskColor, number> = {
    verde:   0.90,
    amarillo:0.92,
    naranja: 0.95,
    rojo:    1.00,
  }
  return roundPrice(suggested * rates[color])
}

// ─── Anticipo recomendado ─────────────────────────────────────
export function getDepositRequired(
  finalPrice: number,
  frequency: string,
  shiftDuration: number,
  riskColor: RiskColor,
): number {
  // Servicios cortos → 100%
  if (frequency === 'una_sola_vez' || frequency === '2_3_dias') return finalPrice

  // Semana anticipada
  const weekShifts = shiftDuration === 24 ? 7 : Math.ceil(7 * (shiftDuration / 24))
  const weeklyAmount = finalPrice * weekShifts

  if (riskColor === 'verde')    return finalPrice
  if (riskColor === 'amarillo') return finalPrice
  if (riskColor === 'naranja')  return Math.min(weeklyAmount, finalPrice * 3)
  return weeklyAmount // rojo → semana completa anticipada
}

// ─── Cálculo de vigencia ──────────────────────────────────────
export function getQuoteValidUntil(riskColor: RiskColor): string {
  const days = riskColor === 'verde' ? 7 : riskColor === 'amarillo' ? 5 : 3
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ─── Motor principal de precios ───────────────────────────────
export interface PriceCalculationInput {
  profile: RecommendedProfile
  shiftHours: number
  schedule: string
  urgency: string
  locationType: string
  physicalScore: number
  clinicalScore: number
  operationalScore: number
  reportType: string
  supervisionType: string
  medicationControlType: string
  riskColor: RiskColor
  prospectId: string
  preassessmentId?: string | null
  serviceRequestId?: string | null
  assessmentResultId?: string | null
}

export interface PriceCalculationResult {
  quote: Omit<CareQuote, 'id' | 'created_at' | 'updated_at'>
  adjustments: Omit<QuoteAdjustment, 'id' | 'created_at'>[]
}

export function calculatePrice(input: PriceCalculationInput): PriceCalculationResult {
  const validHours = [4, 6, 8, 12, 24].includes(input.shiftHours)
    ? (input.shiftHours as ShiftHours)
    : 8

  const baseRate = BASE_RATES[input.profile][validHours]

  const adjustments: Omit<QuoteAdjustment, 'id' | 'created_at'>[] = []

  // Ajustes porcentuales sobre la tarifa base
  const physRate        = getPhysicalAdjustmentRate(input.physicalScore)
  const clinicalRate    = getClinicalAdjustmentRate(input.clinicalScore)
  const operationalRate = getOperationalAdjustmentRate(input.operationalScore)
  const scheduleRate    = SCHEDULE_ADJUSTMENTS[input.schedule] ?? 0
  const urgencyRate     = URGENCY_ADJUSTMENTS[input.urgency] ?? 0
  const locationRate    = LOCATION_ADJUSTMENTS[input.locationType] ?? 0

  const physAdj      = baseRate * physRate
  const clinAdj      = baseRate * clinicalRate
  const opAdj        = baseRate * operationalRate
  const schedAdj     = baseRate * scheduleRate
  const urgAdj       = baseRate * urgencyRate
  const locAdj       = baseRate * locationRate

  // Extras fijos
  const reportFee    = REPORT_FEES[input.reportType] ?? 0
  const supervisFee  = SUPERVISION_FEES[input.supervisionType] ?? 0
  const medFee       = MEDICATION_FEES[input.medicationControlType] ?? 0

  const calculatedPrice =
    baseRate + physAdj + clinAdj + opAdj + schedAdj + urgAdj + locAdj +
    reportFee + supervisFee + medFee

  const suggestedPrice = roundPrice(calculatedPrice)
  const minimumPrice   = getMinimumPrice(suggestedPrice, input.riskColor)

  // Armar desglose de ajustes
  const care_quote_id = '' // se asignará después de insertar
  if (physRate > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'complejidad_fisica', description: `Complejidad física (${input.physicalScore} pts)`, percentage: physRate, fixed_amount: null, calculated_amount: physAdj })
  if (clinicalRate > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'complejidad_clinica', description: `Complejidad clínica (${input.clinicalScore} pts)`, percentage: clinicalRate, fixed_amount: null, calculated_amount: clinAdj })
  if (operationalRate > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'riesgo_operativo', description: `Riesgo operativo (${input.operationalScore} pts)`, percentage: operationalRate, fixed_amount: null, calculated_amount: opAdj })
  if (scheduleRate > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'horario', description: `Ajuste por horario (${input.schedule})`, percentage: scheduleRate, fixed_amount: null, calculated_amount: schedAdj })
  if (urgencyRate > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'urgencia', description: `Ajuste por urgencia (${input.urgency})`, percentage: urgencyRate, fixed_amount: null, calculated_amount: urgAdj })
  if (locationRate > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'ubicacion', description: `Ajuste por ubicación (${input.locationType})`, percentage: locationRate, fixed_amount: null, calculated_amount: locAdj })
  if (reportFee > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'reporte', description: `Tipo de reporte (${input.reportType})`, percentage: null, fixed_amount: reportFee, calculated_amount: reportFee })
  if (supervisFee > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'supervision', description: `Supervisión (${input.supervisionType})`, percentage: null, fixed_amount: supervisFee, calculated_amount: supervisFee })
  if (medFee > 0)
    adjustments.push({ care_quote_id, adjustment_type: 'medicamentos', description: `Control de medicamentos (${input.medicationControlType})`, percentage: null, fixed_amount: medFee, calculated_amount: medFee })

  const quote: Omit<CareQuote, 'id' | 'created_at' | 'updated_at'> = {
    prospect_id:          input.prospectId,
    preassessment_id:     input.preassessmentId ?? null,
    service_request_id:   input.serviceRequestId ?? null,
    assessment_result_id: input.assessmentResultId ?? null,
    base_rate:            baseRate,
    physical_adjustment:  physAdj,
    clinical_adjustment:  clinAdj,
    operational_adjustment: opAdj,
    schedule_adjustment:  schedAdj,
    urgency_adjustment:   urgAdj,
    location_adjustment:  locAdj,
    supervision_fee:      supervisFee,
    report_fee:           reportFee,
    medication_control_fee: medFee,
    supplies_management_fee: 0,
    calculated_price:     calculatedPrice,
    suggested_price:      suggestedPrice,
    minimum_recommended_price: minimumPrice,
    final_price:          suggestedPrice,
    adjustment_reason:    null,
    authorized_by:        null,
    deposit_required:     getDepositRequired(suggestedPrice, '', validHours, input.riskColor),
    payment_terms:        null,
    quote_valid_until:    getQuoteValidUntil(input.riskColor),
    status:               'calculada',
  }

  return { quote, adjustments }
}

// ─── Validación de precio final ───────────────────────────────
export function validateFinalPrice(
  finalPrice: number,
  minimumPrice: number,
  riskColor: RiskColor,
): { valid: boolean; requiresAuth: boolean; message?: string } {
  if (finalPrice < minimumPrice) {
    if (riskColor === 'rojo') {
      return { valid: false, requiresAuth: true, message: 'Caso rojo: no se puede aplicar descuento sin autorización administrativa.' }
    }
    if (riskColor === 'naranja') {
      return { valid: true, requiresAuth: true, message: 'Descuento mayor al 5% en caso naranja: requiere autorización.' }
    }
    return { valid: true, requiresAuth: true, message: `El precio está por debajo del mínimo recomendado ($${minimumPrice.toLocaleString('es-MX')}). Requiere autorización.` }
  }
  return { valid: true, requiresAuth: false }
}

// ─── Helpers de etiquetas ─────────────────────────────────────
export const SCHEDULE_LABELS: Record<string, string> = {
  matutino:    'Matutino',
  vespertino:  'Vespertino',
  nocturno:    'Nocturno',
  mixto:       'Mixto',
  rotativo:    'Rotativo',
  festivo:     'Día festivo',
  domingo:     'Domingo',
  alta_demanda:'Fecha de alta demanda',
  por_definir: 'Por definir',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  una_sola_vez:       'Una sola vez',
  dias_especificos:   'Algunos días específicos',
  diario_temporal:    'Diario temporal',
  diario_indefinido:  'Diario indefinido',
  veinticuatro_siete: '24/7 con varios turnos',
  por_definir:        'Por definir',
}

export const DURATION_LABELS: Record<string, string> = {
  una_guardia:        'Solo una guardia',
  dos_tres_dias:      '2 a 3 días',
  una_semana:         'Una semana',
  dos_cuatro_semanas: '2 a 4 semanas',
  mas_mes:            'Más de un mes',
  indefinido:         'Indefinido',
  no_se_sabe:         'No se sabe',
}
