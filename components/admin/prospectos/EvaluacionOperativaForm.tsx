'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { upsertOperationalAssessment } from '@/lib/actions/evaluaciones'
import type { OperationalRiskAssessment } from '@/types'

interface OpQuestion {
  key: keyof OperationalRiskAssessment
  label: string
  options: { value: number; label: string; alert?: boolean }[]
  alertText?: string
}

const QUESTIONS: OpQuestion[] = [
  { key: 'orientation_status', label: '1. ¿El paciente está orientado en tiempo, lugar y persona?',
    options: [{ value: 0, label: 'Sí, está orientado' }, { value: 2, label: 'A veces se confunde' }, { value: 3, label: 'Frecuentemente se confunde' }, { value: 4, label: 'No está orientado', alert: true }, { value: 2, label: 'No se sabe / por confirmar' }] },
  { key: 'cognitive_impairment', label: '2. ¿Tiene diagnóstico o sospecha de deterioro cognitivo, demencia o delirium?',
    options: [{ value: 0, label: 'No' }, { value: 2, label: 'Sospecha leve' }, { value: 4, label: 'Diagnóstico confirmado' }, { value: 5, label: 'Deterioro avanzado', alert: true }, { value: 2, label: 'No se sabe' }] },
  { key: 'agitation_or_aggression', label: '3. ¿El paciente se muestra inquieto, agitado, agresivo o difícil de manejar?', alertText: 'No iniciar sin valoración previa, condiciones de seguridad y responsable familiar disponible.',
    options: [{ value: 0, label: 'No' }, { value: 2, label: 'Inquietud ocasional' }, { value: 4, label: 'Agitación frecuente' }, { value: 5, label: 'Agresividad verbal' }, { value: 8, label: 'Agresividad física o riesgo para el personal', alert: true }] },
  { key: 'device_removal_risk', label: '4. ¿El paciente intenta retirarse sondas, oxígeno u otros dispositivos?',
    options: [{ value: 0, label: 'No' }, { value: 2, label: 'Ocasionalmente' }, { value: 4, label: 'Frecuentemente' }, { value: 6, label: 'Ya ha provocado caídas o retiro de dispositivos', alert: true }, { value: 2, label: 'No se sabe / por confirmar' }] },
  { key: 'communication_ability', label: '5. ¿El paciente puede comunicarse claramente?',
    options: [{ value: 0, label: 'Sí, comunica bien sus necesidades' }, { value: 1, label: 'Se comunica con dificultad' }, { value: 2, label: 'No habla, pero responde con señas o gestos' }, { value: 4, label: 'No puede comunicar necesidades' }, { value: 3, label: 'Presenta lenguaje incoherente o confuso' }] },
  { key: 'emotional_state', label: '6. ¿Cómo describen el estado emocional actual del paciente?',
    options: [{ value: 0, label: 'Tranquilo / cooperador' }, { value: 1, label: 'Ansioso o temeroso' }, { value: 1, label: 'Triste o apático' }, { value: 2, label: 'Irritable' }, { value: 3, label: 'Muy angustiado o resistente al cuidado', alert: true }] },
  { key: 'family_decision_structure', label: '7. ¿Cuántas personas estarán tomando decisiones sobre el cuidado?', alertText: 'Definir un solo contacto autorizado antes de iniciar.',
    options: [{ value: 0, label: 'Una persona responsable clara' }, { value: 1, label: 'Dos personas responsables' }, { value: 2, label: 'Varias personas opinan, pero hay un responsable principal' }, { value: 4, label: 'Varias personas dan instrucciones distintas' }, { value: 5, label: 'No hay responsable claro', alert: true }] },
  { key: 'payment_clarity', label: '8. ¿Está claro quién pagará el servicio y con qué frecuencia?', alertText: 'No iniciar sin responsable de pago, anticipo y condiciones aceptadas.',
    options: [{ value: 0, label: 'Sí, responsable y frecuencia definidos' }, { value: 1, label: 'Responsable definido, frecuencia pendiente' }, { value: 3, label: 'Hay intención de pago, pero no está formalizado' }, { value: 4, label: 'Se dividirá entre familiares' }, { value: 6, label: 'No está claro quién pagará', alert: true }] },
  { key: 'family_conflict_level', label: '9. ¿Se perciben desacuerdos o conflicto entre familiares respecto al cuidado?',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Leve / normal' }, { value: 2, label: 'Hay diferencias de opinión' }, { value: 4, label: 'Hay conflicto visible', alert: true }, { value: 6, label: 'Antecedentes de reclamos, amenazas o trato difícil', alert: true }] },
  { key: 'service_expectations', label: '10. ¿La familia entiende qué incluye y qué no incluye el servicio?', alertText: 'Aclarar límites del servicio antes de iniciar.',
    options: [{ value: 0, label: 'Sí, expectativas claras' }, { value: 1, label: 'Requiere explicación' }, { value: 3, label: 'Esperan funciones fuera del alcance', alert: true }, { value: 4, label: 'Piden actividades no relacionadas al cuidado del paciente', alert: true }, { value: 2, label: 'No se ha explicado todavía' }] },
  { key: 'supplies_availability', label: '11. ¿La familia cuenta con los insumos necesarios para el cuidado?',
    options: [{ value: 0, label: 'Sí, todo disponible' }, { value: 1, label: 'Faltan algunos insumos menores' }, { value: 3, label: 'Faltan insumos importantes' }, { value: 3, label: 'No saben qué insumos necesitan' }, { value: 4, label: 'Esperan que Abastemed los proporcione sin cotización', alert: true }] },
  { key: 'home_safety', label: '12. ¿El domicilio y entorno son seguros para el personal?',
    options: [{ value: 0, label: 'Sí, seguro y accesible' }, { value: 1, label: 'Acceso complicado pero seguro' }, { value: 2, label: 'Zona con acceso difícil' }, { value: 3, label: 'Hay horarios de riesgo o poca iluminación' }, { value: 6, label: 'Se percibe riesgo para el personal', alert: true }] },
]

function getOpLevel(score: number) {
  if (score <= 5)  return { label: 'Claro y manejable',         color: '#22c55e' }
  if (score <= 12) return { label: 'Riesgo operativo leve',     color: '#84cc16' }
  if (score <= 22) return { label: 'Riesgo operativo moderado', color: '#eab308' }
  if (score <= 35) return { label: 'Riesgo operativo alto',     color: '#f97316' }
  return                   { label: 'Riesgo crítico',           color: '#dc2626' }
}

interface Props {
  preassessmentId: string
  prospectId: string
  existing: OperationalRiskAssessment | null
  patientName: string
}

export function EvaluacionOperativaForm({ preassessmentId, prospectId, existing, patientName }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const init: Record<string, number> = {}
  if (existing) {
    QUESTIONS.forEach(q => { init[q.key as string] = (existing as unknown as Record<string, unknown>)[q.key] as number ?? 0 })
  }
  const [scores, setScores] = useState<Record<string, number>>(init)
  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  const level = getOpLevel(total)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(scores).forEach(([k, v]) => fd.set(k, String(v)))
    startTransition(async () => {
      const res = await upsertOperationalAssessment(preassessmentId, prospectId, fd)
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
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Evaluación conductual y familiar</h1>
          <p className="text-sm text-gray-500 mt-1">Paso 5 de 8 — Paciente: {patientName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Score operativo actual</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#1B2B4B' }}>{total} pts</p>
            <p className="text-sm font-medium mt-1" style={{ color: level.color }}>{level.label}</p>
          </div>
          <div className="text-right text-sm text-gray-400">
            <p>0-5: Claro</p><p>6-12: Leve</p><p>13-22: Moderado</p><p>23-35: Alto</p><p>36+: Crítico</p>
          </div>
        </div>

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
                    {opt.alert && <span className="ml-auto text-xs text-red-500 font-medium flex-shrink-0">⚠</span>}
                  </label>
                ))}
              </div>
              {hasAlert && q.alertText && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-red-500 flex-shrink-0">⚠</span>
                  <p className="text-sm text-red-700">{q.alertText}</p>
                </div>
              )}
            </div>
          )
        })}

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={pending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#2AABBF' }}>
            {pending ? 'Guardando...' : 'Guardar evaluación operativa'}
          </button>
        </div>
      </form>
    </div>
  )
}
