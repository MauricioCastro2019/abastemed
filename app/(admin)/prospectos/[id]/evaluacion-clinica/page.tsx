import { getPreassessment, getClinicalAssessment } from '@/lib/actions/evaluaciones'
import { EvaluacionClinicaForm } from '@/components/admin/prospectos/EvaluacionClinicaForm'
import Link from 'next/link'

export default async function EvaluacionClinicaPage({ params }: { params: { id: string } }) {
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
  const existing = await getClinicalAssessment(preassessment.id)
  return (
    <EvaluacionClinicaForm
      preassessmentId={preassessment.id}
      prospectId={id}
      existing={existing}
      patientName={preassessment.patient_name}
    />
  )
}
