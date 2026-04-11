import { getCasos } from '@/lib/actions/casos'
import { getEnfermeros } from '@/lib/actions/enfermeros'
import { TurnoForm } from '@/components/admin/turnos/TurnoForm'
import type { Caso, Enfermero } from '@/types'

export default async function NuevoTurnoPage({
  searchParams,
}: {
  searchParams: { caso_id?: string }
}) {
  let casos: Caso[] = []
  let enfermeros: Enfermero[] = []

  try {
    ;[casos, enfermeros] = await Promise.all([getCasos(), getEnfermeros()])
  } catch {
    // sin datos
  }

  return (
    <TurnoForm
      casos={casos}
      enfermeros={enfermeros}
      defaultCasoId={searchParams.caso_id}
    />
  )
}
