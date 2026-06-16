import { getTurnoConValidacion } from '@/lib/actions/turnos'
import { requireAuth } from '@/lib/actions/utils'
import { notFound } from 'next/navigation'
import ValidarTurnoClient from './ValidarTurnoClient'

interface Props {
  params: { id: string }
}

export default async function ValidarTurnoPage({ params }: Props) {
  const { perfil } = await requireAuth()
  if (!['admin', 'jefe_enfermeros'].includes(perfil.rol)) {
    return <div className="p-8 text-red-600">Acceso no autorizado.</div>
  }

  const turno = await getTurnoConValidacion(params.id)
  if (!turno) notFound()

  return <ValidarTurnoClient turno={turno} rol={perfil.rol} />
}
