import { getPreassessment, getServiceRequest } from '@/lib/actions/evaluaciones'
import { DatosComerciales_Form } from '@/components/admin/prospectos/DatosComerciales_Form'

export default async function DatosComerciales({ params }: { params: { id: string } }) {
  const { id } = params
  const [preassessment, existing] = await Promise.all([
    getPreassessment(id),
    getServiceRequest(id),
  ])
  return (
    <DatosComerciales_Form
      prospectId={id}
      preassessmentId={preassessment?.id ?? null}
      existing={existing}
    />
  )
}
