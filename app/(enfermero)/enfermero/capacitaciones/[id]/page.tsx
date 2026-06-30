import { getModuloConProgreso } from '@/lib/actions/capacitaciones'
import { notFound } from 'next/navigation'
import { CapacitacionDetailClient } from './CapacitacionDetailClient'

export default async function CapacitacionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { modulo, progreso } = await getModuloConProgreso(params.id)
  if (!modulo) notFound()

  return <CapacitacionDetailClient modulo={modulo} progreso={progreso} />
}
