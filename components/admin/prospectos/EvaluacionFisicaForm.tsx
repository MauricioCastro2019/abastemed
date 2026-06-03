'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertPhysicalAssessment } from '@/lib/actions/evaluaciones'
import type { PhysicalAssessment } from '@/types'

interface Props {
  preassessmentId: string
  prospectId: string
  existing?: PhysicalAssessment | null
}

interface Question {
  key: keyof PhysicalAssessment
  label: string
  options: { value: number; label: string; alert?: boolean }[]
  alertText?: string
}

const QUESTIONS: Question[] = [
  {
    key: 'mobility_status',
    label: '1. ¿Cómo se moviliza actualmente el paciente?',
    options: [
      { value: 0, label: 'Camina solo sin apoyo' },
      { value: 1, label: 'Camina con bastón, andadera o apoyo ligero' },
      { value: 2, label: 'Camina con apoyo de una persona' },
      { value: 3, label: 'No camina, pero puede sentarse' },
      { value: 4, label: 'Está completamente encamado' },
    ],
  },
  {
    key: 'fall_risk',
    label: '2. ¿Tiene riesgo de caídas?',
    alertText: 'Requiere vigilancia preventiva y evaluación del entorno.',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Bajo' },
      { value: 2, label: 'Moderado' },
      { value: 3, label: 'Alto', alert: true },
      { value: 4, label: 'Ya ha tenido caídas recientes', alert: true },
    ],
  },
  {
    key: 'bed_status',
    label: '3. ¿El paciente permanece en cama la mayor parte del día?',
    options: [
      { value: 0, label: 'No, se levanta normalmente' },
      { value: 1, label: 'Pasa varias horas en cama, pero se levanta' },
      { value: 2, label: 'Está en cama la mayor parte del día' },
      { value: 3, label: 'Está encamado y requiere ayuda para moverse' },
      { value: 4, label: 'Está encamado y no puede moverse por sí mismo' },
    ],
  },
  {
    key: 'position_changes',
    label: '4. ¿Requiere cambios de posición durante la guardia?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Ocasionalmente' },
      { value: 2, label: 'Cada 4 horas' },
      { value: 3, label: 'Cada 2 horas' },
      { value: 4, label: 'Con frecuencia especial por riesgo de escaras' },
    ],
  },
  {
    key: 'diaper_or_bathroom',
    label: '5. ¿Usa pañal o requiere apoyo para ir al baño?',
    alertText: 'Requiere apoyo en higiene, prevención de lesiones en piel y registro de evacuaciones/orina.',
    options: [
      { value: 0, label: 'No, va solo al baño' },
      { value: 1, label: 'Requiere acompañamiento al baño' },
      { value: 2, label: 'Usa pañal ocasionalmente' },
      { value: 3, label: 'Usa pañal todo el tiempo' },
      { value: 4, label: 'Usa pañal y requiere cambios frecuentes', alert: true },
    ],
  },
  {
    key: 'hygiene_support',
    label: '6. ¿Qué apoyo requiere para baño e higiene personal?',
    options: [
      { value: 0, label: 'Se baña solo' },
      { value: 1, label: 'Requiere supervisión por seguridad' },
      { value: 2, label: 'Requiere apoyo parcial' },
      { value: 3, label: 'Requiere baño en silla o asistencia completa' },
      { value: 4, label: 'Requiere baño en cama' },
    ],
  },
  {
    key: 'feeding_status',
    label: '7. ¿Cómo se alimenta el paciente?',
    alertText: 'Requiere manejo clínico. No cotizar como cuidado básico.',
    options: [
      { value: 0, label: 'Come solo' },
      { value: 1, label: 'Requiere preparación o acercamiento de alimentos' },
      { value: 2, label: 'Requiere apoyo para comer' },
      { value: 3, label: 'Requiere alimentación asistida completa' },
      { value: 5, label: 'Alimentación por sonda o gastrostomía', alert: true },
    ],
  },
  {
    key: 'hydration_support',
    label: '8. ¿Requiere apoyo o vigilancia para mantenerse hidratado?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Recordatorios ocasionales' },
      { value: 2, label: 'Requiere vigilancia frecuente' },
      { value: 3, label: 'Tiene restricción o indicación médica de líquidos' },
      { value: 3, label: 'Hay riesgo de deshidratación o rechazo de líquidos' },
    ],
  },
  {
    key: 'night_watch_status',
    label: '9. Durante la noche, el paciente:',
    alertText: 'La guardia nocturna requiere personal alerta y activo, no solo acompañamiento.',
    options: [
      { value: 0, label: 'Duerme normalmente' },
      { value: 1, label: 'Despierta ocasionalmente' },
      { value: 2, label: 'Despierta varias veces' },
      { value: 3, label: 'Requiere asistencia durante la noche' },
      { value: 4, label: 'Requiere vigilancia constante', alert: true },
    ],
  },
  {
    key: 'daily_life_support',
    label: '10. En general, ¿qué nivel de apoyo requiere en sus actividades diarias?',
    options: [
      { value: 0, label: 'Independiente' },
      { value: 1, label: 'Apoyo ligero' },
      { value: 2, label: 'Apoyo moderado' },
      { value: 3, label: 'Apoyo alto' },
      { value: 4, label: 'Dependencia total' },
    ],
  },
]

function getLevel(score: number) {
  if (score <= 5)  return { label: 'Apoyo ligero', color: '#059669' }
  if (score <= 12) return { label: 'Apoyo moderado', color: '#d97706' }
  if (score <= 22) return { label: 'Alta dependencia física', color: '#ea580c' }
  return { label: 'Dependencia física severa', color: '#dc2626' }
}

export function EvaluacionFisicaForm({ preassessmentId, prospectId, existing }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const defaultValues: Record<string, number> = {}
  if (existing) {
    QUESTIONS.forEach(q => {
      defaultValues[q.key as string] = (existing as unknown as Record<string, unknown>)[q.key] as number ?? 0
    })
  }

  const [scores, setScores] = useState<Record<string, number>>(defaultValues)
  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  const level = getLevel(total)

  function handleChange(key: string, val: number) {
    setScores(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(scores).forEach(([k, v]) => fd.set(k, String(v)))

    startTransition(async () => {
      const res = await upsertPhysicalAssessment(preassessmentId, prospectId, fd)
      if (res.error) { setError(res.error); return }
      router.push(`/prospectos/${prospectId}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Score en tiempo real */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Score físico actual</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#1B2B4B' }}>{total} pts</p>
          <p className="text-sm font-medium mt-1" style={{ color: level.color }}>{level.label}</p>
        </div>
        <div className="text-right text-sm text-gray-400">
          <p>0-5: Apoyo ligero</p>
          <p>6-12: Moderado</p>
          <p>13-22: Alta dependencia</p>
          <p>23+: Severa</p>
        </div>
      </div>

      {/* Preguntas */}
      {QUESTIONS.map(q => {
        const currentVal = scores[q.key as string] ?? 0
        const hasAlert   = q.alertText && q.options.find(o => o.value === currentVal && o.alert)

        return (
          <div key={q.key as string} className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">{q.label}</p>
            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <label key={idx} className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${currentVal === opt.value ? 'bg-[#EBF8FB]' : 'hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name={q.key as string}
                    value={opt.value}
                    checked={currentVal === opt.value}
                    onChange={() => handleChange(q.key as string, opt.value)}
                    className="mt-0.5 accent-[#2AABBF]"
                  />
                  <span className="text-sm text-gray-700">
                    {opt.label}
                    <span className="ml-2 text-xs font-medium" style={{ color: opt.value === 0 ? '#059669' : opt.value >= 4 ? '#dc2626' : '#d97706' }}>
                      +{opt.value} pts
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {hasAlert && q.alertText && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <span className="text-orange-500 flex-shrink-0 mt-0.5">⚠</span>
                <p className="text-sm text-orange-700">{q.alertText}</p>
              </div>
            )}
          </div>
        )
      })}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={pending}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#2AABBF' }}>
          {pending ? 'Guardando...' : 'Guardar evaluación física'}
        </button>
      </div>
    </form>
  )
}
