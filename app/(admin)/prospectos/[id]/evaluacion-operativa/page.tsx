import { getPreassessment, getOperationalAssessment } from '@/lib/actions/evaluaciones'
import { EvaluacionOperativaForm } from '@/components/admin/prospectos/EvaluacionOperativaForm'
import Link from 'next/link'

export default async function EvaluacionOperativaPage({ params }: { params: { id: string } }) {
  const { id } = params
  const preassessment = await getPreassessment(id)
  if (!preassessment) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-600">Primero completa el pre-levantamiento del paciente.</p>
        <Link href={`/prospectos/${id}`} className="text-[#2AABBF] text-sm mt-2 block">← Volver</Link>
      </div>
    )
  }
  const existing = await getOperationalAssessment(preassessment.id)
  return (
    <EvaluacionOperativaForm
      preassessmentId={preassessment.id}
      prospectId={id}
      existing={existing}
      patientName={preassessment.patient_name}
    />
  )
}
