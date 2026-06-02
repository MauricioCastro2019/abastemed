import { getPreassessment, getPhysicalAssessment } from '@/lib/actions/evaluaciones'
import { EvaluacionFisicaForm } from '@/components/admin/prospectos/EvaluacionFisicaForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EvaluacionFisicaPage({ params }: { params: { id: string } }) {
  const { id } = params
  const preassessment = await getPreassessment(id)
  if (!preassessment) notFound()

  const existing = await getPhysicalAssessment(preassessment.id)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/prospectos/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Evaluación física</h1>
          <p className="text-sm text-gray-500 mt-1">
            Paso 3 de 8 — Paciente: {preassessment.patient_name}
          </p>
        </div>
      </div>
      <EvaluacionFisicaForm
        preassessmentId={preassessment.id}
        prospectId={id}
        existing={existing}
      />
    </div>
  )
}
