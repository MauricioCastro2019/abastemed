import { getActivationChecklist, getCareQuote } from '@/lib/actions/cotizacion'
import { getPreassessment } from '@/lib/actions/evaluaciones'
import { ActivacionChecklistForm } from '@/components/admin/prospectos/ActivacionChecklistForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ActivacionPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [preassessment, checklist, quote] = await Promise.all([
    getPreassessment(id),
    getActivationChecklist(id),
    getCareQuote(id),
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/prospectos/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Checklist de activación</h1>
          <p className="text-sm text-gray-500 mt-1">Valida todas las condiciones antes de convertir en paciente activo</p>
        </div>
      </div>

      {!quote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-amber-700 font-medium">Se requiere una cotización aceptada antes de activar.</p>
          <Link href={`/prospectos/${id}/cotizacion`} className="text-sm text-[#2AABBF] hover:underline mt-1 block">
            Ir a cotización →
          </Link>
        </div>
      )}

      <ActivacionChecklistForm
        prospectId={id}
        preassessmentId={preassessment?.id ?? null}
        quoteId={quote?.id ?? null}
        existing={checklist}
      />
    </div>
  )
}
