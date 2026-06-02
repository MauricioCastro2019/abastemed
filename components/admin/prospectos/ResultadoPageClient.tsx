'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { calcularResultado } from '@/lib/actions/evaluaciones'
import { ResultadoCard } from './ResultadoCard'
import type { AssessmentResult } from '@/types'

interface Props {
  prospectId: string
  preassessmentId: string | null
  existingResult: AssessmentResult | null
  canCalculate: boolean
  missingItems: string[]
}

export function ResultadoPageClient({ prospectId, preassessmentId, existingResult, canCalculate, missingItems }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleCalculate() {
    if (!preassessmentId) return
    setError('')
    startTransition(async () => {
      const res = await calcularResultado(prospectId, preassessmentId)
      if (res.error) { setError(res.error); return }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {missingItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-amber-700 mb-2">Para calcular el resultado necesitas completar:</p>
          <ul className="space-y-1">
            {missingItems.map((m, i) => (
              <li key={i} className="text-sm text-amber-600 flex items-center gap-2">
                <span>•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleCalculate}
          disabled={!canCalculate || pending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: canCalculate ? '#2AABBF' : '#9ca3af' }}>
          <RefreshCw size={15} className={pending ? 'animate-spin' : ''} />
          {pending ? 'Calculando...' : existingResult ? 'Recalcular' : 'Calcular resultado'}
        </button>
        {existingResult && (
          <Link href={`/prospectos/${prospectId}/cotizacion`}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: '#1B2B4B' }}>
            Ir a cotización →
          </Link>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

      {existingResult && <ResultadoCard result={existingResult} />}

      {!existingResult && canCalculate && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500 text-sm">Presiona "Calcular resultado" para generar el score de evaluación.</p>
        </div>
      )}
    </div>
  )
}
