import { getCareQuote, getCareQuoteAdjustments } from '@/lib/actions/cotizacion'
import { getAssessmentResult, getServiceRequest, getPreassessment } from '@/lib/actions/evaluaciones'
import { CotizacionPageClient } from '@/components/admin/prospectos/CotizacionPageClient'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { CareQuote, QuoteAdjustment } from '@/types'

export default async function CotizacionPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [preassessment, result, serviceRequest] = await Promise.all([
    getPreassessment(id),
    getAssessmentResult(id),
    getServiceRequest(id),
  ])

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/prospectos/${id}`} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Cotización</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-amber-700 font-semibold mb-2">Primero calcula el resultado de evaluación</p>
          <Link href={`/prospectos/${id}/resultado`} className="text-sm text-[#2AABBF] hover:underline">Ir al resultado →</Link>
        </div>
      </div>
    )
  }

  if (!serviceRequest) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/prospectos/${id}`} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Cotización</h1>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-amber-700 font-semibold mb-2">Primero completa los datos comerciales del servicio</p>
          <Link href={`/prospectos/${id}/datos-comerciales`} className="text-sm text-[#2AABBF] hover:underline">Ir a datos comerciales →</Link>
        </div>
      </div>
    )
  }

  let quote: CareQuote | null = null
  let adjustments: QuoteAdjustment[] = []
  quote = await getCareQuote(id)
  if (quote) adjustments = await getCareQuoteAdjustments(quote.id)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/prospectos/${id}`} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Cotización</h1>
          <p className="text-sm text-gray-500 mt-1">Paso 8 de 8 — Motor de precio</p>
        </div>
      </div>

      <CotizacionPageClient
        prospectId={id}
        preassessmentId={preassessment?.id ?? null}
        result={result}
        serviceRequest={serviceRequest}
        quote={quote}
        adjustments={adjustments}
      />
    </div>
  )
}
