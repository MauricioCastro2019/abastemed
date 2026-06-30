import { getEquipoCuidadoByEnfermero } from '@/lib/actions/equipo-cuidado'
import { MisPacientesClient } from './MisPacientesClient'
import type { EquipoCuidado } from '@/types'

export default async function MisPacientesPage() {
  let activos: EquipoCuidado[] = []
  let pendientes: EquipoCuidado[] = []
  let historial: EquipoCuidado[] = []

  try {
    const data = await getEquipoCuidadoByEnfermero()
    activos = data.activos
    pendientes = data.pendientes
    historial = data.historial
  } catch {
    // Sin datos — el componente muestra el empty state
  }

  return (
    <MisPacientesClient
      activos={activos}
      pendientes={pendientes}
      historial={historial}
    />
  )
}
