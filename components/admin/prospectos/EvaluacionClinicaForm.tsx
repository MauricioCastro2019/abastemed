'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { upsertClinicalAssessment } from '@/lib/actions/evaluaciones'
import type { ClinicalAssessment } from '@/types'

const DEVICE_OPTIONS = [
  { value: 'sonda_foley',        label: 'Sonda Foley',                  score: 3 },
  { value: 'sonda_nasogastrica', label: 'Sonda nasogástrica',           score: 4 },
  { value: 'gastrostomia',       label: 'Gastrostomía',                 score: 5 },
  { value: 'colostomia',         label: 'Colostomía / ileostomía',      score: 5 },
  { value: 'drenaje_quirurgico', label: 'Drenaje quirúrgico',           score: 5 },
  { value: 'cateter_periferico', label: 'Catéter venoso periférico',    score: 4 },
  { value: 'cateter_central',    label: 'Catéter central / puerto',     score: 7, alert: true },
  { value: 'traqueostomia',      label: 'Traqueostomía',                score: 8, alert: true },
]

interface ClinicalQuestion {
  key: keyof ClinicalAssessment
  label: string
  options: { value: number; label: string; alert?: boolean }[]
  alertText?: string
}

const QUESTIONS: ClinicalQuestion[] = [
  { key: 'medication_status', label: '1. ¿El paciente requiere administración o supervisión de medicamentos durante la guardia?', alertText: 'Requiere receta, indicación médica clara y responsable familiar autorizado.',
    options: [{ value: 0, label: 'No requiere medicamentos durante la guardia' }, { value: 1, label: 'Solo recordatorio de medicamentos' }, { value: 2, label: 'Administración de medicamentos vía oral' }, { value: 3, label: 'Medicamentos con horarios estrictos' }, { value: 5, label: 'Medicamentos controlados o de alto riesgo', alert: true }] },
  { key: 'injectable_medications', label: '2. ¿Requiere medicamentos inyectables?', alertText: 'Medicamentos IV: requiere personal de enfermería capacitado.',
    options: [{ value: 0, label: 'No' }, { value: 2, label: 'Subcutáneos' }, { value: 3, label: 'Intramusculares' }, { value: 5, label: 'Intravenosos', alert: true }, { value: 2, label: 'No se sabe / por confirmar' }] },
  { key: 'vital_signs_frequency', label: '3. ¿Requiere toma de signos vitales?',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Una vez por guardia' }, { value: 2, label: 'Cada 8 horas' }, { value: 3, label: 'Cada 4 horas' }, { value: 4, label: 'Monitoreo frecuente o según evento' }] },
  { key: 'glucose_control', label: '4. ¿Requiere control de glucosa capilar?', alertText: 'Requiere indicación médica, horario, dosis y registro de glucosa.',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Ocasional' }, { value: 2, label: 'Una vez al día' }, { value: 3, label: 'Varias veces al día' }, { value: 5, label: 'Con aplicación de insulina', alert: true }] },
  { key: 'oxygen_use', label: '5. ¿El paciente usa oxígeno?', alertText: 'Requiere vigilancia respiratoria, registro de saturación y criterios de alarma.',
    options: [{ value: 0, label: 'No' }, { value: 2, label: 'Ocasional' }, { value: 3, label: 'Continuo por puntas nasales' }, { value: 4, label: 'Concentrador / tanque con vigilancia' }, { value: 6, label: 'Saturación inestable o episodios de dificultad respiratoria', alert: true }] },
  { key: 'nebulizations', label: '6. ¿Requiere nebulizaciones o apoyo respiratorio básico?',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Ocasional' }, { value: 2, label: 'Programadas durante la guardia' }, { value: 3, label: 'Varias veces al día' }, { value: 5, label: 'Con dificultad respiratoria asociada', alert: true }] },
  { key: 'wound_care', label: '8. ¿Requiere curaciones o cuidado de heridas?', alertText: 'Requiere valoración, plan de curación, insumos y registro evolutivo.',
    options: [{ value: 0, label: 'No' }, { value: 2, label: 'Herida simple / curación básica' }, { value: 3, label: 'Herida quirúrgica reciente' }, { value: 4, label: 'Escaras grado I-II' }, { value: 7, label: 'Escaras grado III-IV', alert: true }, { value: 7, label: 'Herida infectada, profunda o compleja', alert: true }] },
  { key: 'pain_status', label: '9. ¿El paciente presenta dolor importante?',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Dolor leve controlado' }, { value: 2, label: 'Dolor moderado' }, { value: 4, label: 'Dolor frecuente o difícil de controlar' }, { value: 5, label: 'Dolor intenso con necesidad de vigilancia', alert: true }] },
  { key: 'postoperative_status', label: '10. ¿El paciente está en recuperación postquirúrgica reciente?',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Cirugía hace más de 30 días' }, { value: 3, label: 'Cirugía en los últimos 30 días' }, { value: 5, label: 'Cirugía en los últimos 7 días' }, { value: 5, label: 'Alta reciente del hospital', alert: true }] },
  { key: 'neurological_events', label: '11. ¿Ha presentado crisis convulsivas, desmayos u otros eventos neurológicos?',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Antecedente antiguo sin eventos recientes' }, { value: 3, label: 'Evento en los últimos 6 meses' }, { value: 5, label: 'Evento reciente en el último mes' }, { value: 7, label: 'Riesgo activo o eventos recurrentes', alert: true }] },
  { key: 'secretion_aspiration', label: '12. ¿Requiere aspiración de secreciones?', alertText: 'Requiere personal con experiencia clínica. No cotizar como servicio básico.',
    options: [{ value: 0, label: 'No' }, { value: 4, label: 'Ocasional' }, { value: 5, label: 'Programada' }, { value: 7, label: 'Frecuente' }, { value: 9, label: 'Asociada a traqueostomía', alert: true }] },
  { key: 'fluid_output_record', label: '13. ¿Requiere registro de líquidos, evacuaciones u orina?',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Registro simple' }, { value: 2, label: 'Registro por indicación médica' }, { value: 4, label: 'Balance de líquidos' }, { value: 4, label: 'Vigilancia por retención, diarrea, vómito o deshidratación' }] },
  { key: 'medical_indications_status', label: '14. ¿La familia cuenta con indicaciones médicas claras por escrito?', alertText: 'Solicitar receta antes de iniciar. Evitar administrar medicamentos sin respaldo.',
    options: [{ value: 0, label: 'Sí, completas y recientes' }, { value: 1, label: 'Sí, pero incompletas' }, { value: 2, label: 'Solo indicaciones verbales' }, { value: 3, label: 'No tienen indicaciones' }, { value: 4, label: 'No saben qué medicamentos requiere', alert: true }] },
  { key: 'emergency_contact_status', label: '15. ¿Hay médico tratante o contacto clínico disponible en emergencia?',
    options: [{ value: 0, label: 'Sí, médico tratante identificado' }, { value: 1, label: 'Hay contacto familiar, pero no médico' }, { value: 2, label: 'No hay médico tratante claro' }, { value: 4, label: 'No hay contacto de emergencia confiable', alert: true }] },
]

function getClinicalScore(scores: Record<string, number>, devicesScore: number): number {
  return Object.values(scores).reduce((a, b) => a + b, 0) + devicesScore
}

function getClinicalLevelLabel(score: number) {
  if (score <= 4)  return { label: 'Sin necesidades clínicas', color: '#22c55e' }
  if (score <= 12) return { label: 'Necesidades básicas',      color: '#84cc16' }
  if (score <= 24) return { label: 'Necesidades moderadas',    color: '#eab308' }
  if (score <= 39) return { label: 'Necesidades altas',        color: '#f97316' }
  return                   { label: 'Alta complejidad clínica',color: '#dc2626' }
}

interface Props {
  preassessmentId: string
  prospectId: string
  existing: ClinicalAssessment | null
  patientName: string
}

export function EvaluacionClinicaForm({ preassessmentId, prospectId, existing, patientName }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error,   setError]   = useState('')

  const init: Record<string, number> = {}
  if (existing) {
    QUESTIONS.forEach(q => { init[q.key as string] = (existing as unknown as Record<string, unknown>)[q.key] as number ?? 0 })
  }
  const [scores,  setScores]  = useState<Record<string, number>>(init)
  const [devices, setDevices] = useState<string[]>(existing?.devices_list ?? [])

  const devicesScore = devices.reduce((sum, d) => {
    const opt = DEVICE_OPTIONS.find(o => o.value === d)
    return sum + (opt?.score ?? 0)
  }, 0)

  const totalScore = getClinicalScore(scores, devicesScore)
  const level = getClinicalLevelLabel(totalScore)

  function toggleDevice(val: string) {
    setDevices(prev => prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(scores).forEach(([k, v]) => fd.set(k, String(v)))
    devices.forEach(d => fd.append('devices_list', d))
    if (devices.length === 0) fd.append('devices_list', 'ninguno')

    startTransition(async () => {
      const res = await upsertClinicalAssessment(preassessmentId, prospectId, fd)
      if (res.error) { setError(res.error); return }
      router.push(`/prospectos/${prospectId}`)
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/prospectos/${prospectId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Evaluación clínica</h1>
          <p className="text-sm text-gray-500 mt-1">Paso 4 de 8 — Paciente: {patientName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Score en tiempo real */}
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Score clínico actual</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#1B2B4B' }}>{totalScore} pts</p>
            <p className="text-sm font-medium mt-1" style={{ color: level.color }}>{level.label}</p>
          </div>
          <div className="text-right text-sm text-gray-400">
            <p>0-4: Sin necesidades</p>
            <p>5-12: Básicas</p>
            <p>13-24: Moderadas</p>
            <p>25-39: Altas</p>
            <p>40+: Alta complejidad</p>
          </div>
        </div>

        {/* Preguntas con radio buttons */}
        {QUESTIONS.map(q => {
          const curVal = scores[q.key as string] ?? 0
          const hasAlert = q.alertText && q.options.find(o => o.value === curVal && o.alert)
          return (
            <div key={q.key as string} className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-800 mb-3">{q.label}</p>
              <div className="space-y-2">
                {q.options.map((opt, idx) => (
                  <label key={idx} className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${curVal === opt.value ? 'bg-[#EBF8FB]' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name={q.key as string} value={opt.value}
                      checked={curVal === opt.value}
                      onChange={() => setScores(p => ({ ...p, [q.key as string]: opt.value }))}
                      className="mt-0.5 accent-[#2AABBF]" />
                    <span className="text-sm text-gray-700">
                      {opt.label}
                      <span className="ml-2 text-xs font-medium" style={{ color: opt.value === 0 ? '#059669' : opt.value >= 5 ? '#dc2626' : '#d97706' }}>
                        +{opt.value} pts
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {hasAlert && q.alertText && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-red-500 flex-shrink-0 mt-0.5">⚠</span>
                  <p className="text-sm text-red-700">{q.alertText}</p>
                </div>
              )}
            </div>
          )
        })}

        {/* Dispositivos — multi-select */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-800 mb-1">7. ¿El paciente tiene sondas o dispositivos que vigilar?</p>
          <p className="text-xs text-gray-400 mb-3">Selección múltiple</p>
          <div className="space-y-2">
            {DEVICE_OPTIONS.map(opt => {
              const isSelected = devices.includes(opt.value)
              return (
                <label key={opt.value} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-[#EBF8FB]' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleDevice(opt.value)} className="w-4 h-4 accent-[#2AABBF]" />
                  <span className="text-sm text-gray-700">
                    {opt.label}
                    <span className="ml-2 text-xs font-medium" style={{ color: opt.score >= 7 ? '#dc2626' : '#d97706' }}>+{opt.score} pts</span>
                  </span>
                  {opt.alert && <span className="ml-auto text-xs text-red-500 font-medium">⚠ Crítico</span>}
                </label>
              )
            })}
          </div>
          {devices.some(d => ['cateter_central', 'cateter_puerto', 'traqueostomia'].includes(d)) && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">⚠ Dispositivo crítico — Requiere valoración previa y personal clínico especializado.</p>
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={pending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#2AABBF' }}>
            {pending ? 'Guardando...' : 'Guardar evaluación clínica'}
          </button>
        </div>
      </form>
    </div>
  )
}
