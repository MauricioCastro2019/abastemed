'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calculator } from 'lucide-react'
import { calcularCotizacion } from '@/lib/actions/cotizacion'
import { CotizacionCard } from './CotizacionCard'
import type { CareQuote, QuoteAdjustment, AssessmentResult, ServiceRequest } from '@/types'

const PROFILE_OPTIONS = [
  { value: 'cuidador',               label: 'Cuidador / acompañante' },
  { value: 'auxiliar',               label: 'Auxiliar / cuidador experimentado' },
  { value: 'enfermero_general',      label: 'Enfermero general' },
  { value: 'enfermero_especializado',label: 'Enfermero especializado' },
]

interface Props {
  prospectId: string
  preassessmentId: string | null
  result: AssessmentResult
  serviceRequest: ServiceRequest
  quote: CareQuote | null
  adjustments: QuoteAdjustment[]
}

export function CotizacionPageClient({ prospectId, preassessmentId, result, serviceRequest, quote, adjustments }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleCalculate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await calcularCotizacion(prospectId, preassessmentId ?? '', serviceRequest.id, result.id, fd)
      if (res.error) { setError(res.error); return }
      router.refresh()
    })
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-6">
      <form onSubmit={handleCalculate} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="text-base font-semibold" style={{ color: '#1B2B4B' }}>
          {quote ? 'Recalcular cotización' : 'Calcular cotización'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Perfil del personal</label>
            <select name="override_profile" defaultValue={result.recommended_profile} className={inputCls}>
              {PROFILE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}{o.value === result.recommended_profile ? ' (Recomendado)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Urgencia (ajuste de precio)</label>
            <select name="urgency" defaultValue="sin_fecha" className={inputCls}>
              <option value="hoy_mismo">Hoy mismo (+15%)</option>
              <option value="manana">Mañana (+5%)</option>
              <option value="esta_semana">Esta semana (0%)</option>
              <option value="cotizando">Cotizando opciones (0%)</option>
              <option value="sin_fecha">Sin fecha definida (0%)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Score: {result.physical_score}F + {result.clinical_score}C + {result.operational_score}O = {result.total_score} total · {serviceRequest.shift_duration_hours ?? 8}h
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#2AABBF' }}>
            <Calculator size={15} />
            {pending ? 'Calculando...' : quote ? 'Recalcular' : 'Calcular precio'}
          </button>
        </div>
      </form>

      {quote && (
        <>
          <CotizacionCard
            quote={quote}
            adjustments={adjustments}
            result={result}
            serviceRequest={serviceRequest}
            prospectId={prospectId}
            isAdmin={true}
          />
          <div className="flex justify-end">
            <Link href={`/prospectos/${prospectId}/propuesta`}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90"
              style={{ backgroundColor: '#1B2B4B' }}>
              Generar propuesta →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
