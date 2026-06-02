import { getPreassessment } from '@/lib/actions/evaluaciones'
import { PrelevantamientoForm } from '@/components/admin/prospectos/PrelevantamientoForm'

export default async function PrelevantamientoPage({ params }: { params: { id: string } }) {
  const { id } = params
  const existing = await getPreassessment(id)
  return <PrelevantamientoForm prospectId={id} existing={existing} />
}
