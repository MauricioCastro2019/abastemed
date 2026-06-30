import { getCasos } from '@/lib/actions/casos'
import { getEnfermeros } from '@/lib/actions/enfermeros'
import { getEquipoCuidadoByCaso } from '@/lib/actions/equipo-cuidado'
import { TurnoForm } from '@/components/admin/turnos/TurnoForm'
import type { Caso, Enfermero, EquipoCuidado } from '@/types'

export default async function NuevoTurnoPage({
  searchParams,
}: {
  searchParams: { caso_id?: string }
}) {
  let casos: Caso[] = []
  let enfermeros: Enfermero[] = []
  let equipoHabitual: EquipoCuidado[] = []

  try {
    const fetchTasks: Promise<unknown>[] = [getCasos(), getEnfermeros()]
    if (searchParams.caso_id) {
      fetchTasks.push(getEquipoCuidadoByCaso(searchParams.caso_id))
    }
    const results = await Promise.all(fetchTasks)
    casos = results[0] as Caso[]
    enfermeros = results[1] as Enfermero[]
    if (searchParams.caso_id) {
      equipoHabitual = (results[2] as EquipoCuidado[]) ?? []
    }
  } catch {
    // sin datos
  }

  return (
    <TurnoForm
      casos={casos}
      enfermeros={enfermeros}
      defaultCasoId={searchParams.caso_id}
      equipoHabitual={equipoHabitual}
    />
  )
}
