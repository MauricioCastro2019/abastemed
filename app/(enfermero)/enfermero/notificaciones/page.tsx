import { getNotificaciones } from '@/lib/actions/notificaciones'
import { NotificacionesClient } from './NotificacionesClient'
import type { Notificacion } from '@/types'

export default async function NotificacionesPage() {
  let notificaciones: Notificacion[] = []
  try {
    notificaciones = await getNotificaciones()
  } catch {
    // Sin datos
  }

  return <NotificacionesClient notificaciones={notificaciones} />
}
