import { getNotificaciones } from '@/lib/actions/notificaciones'
import { NotificacionesClient } from './NotificacionesClient'

export default async function NotificacionesPage() {
  let notificaciones = []
  try {
    notificaciones = await getNotificaciones()
  } catch {
    // Sin datos
  }

  return <NotificacionesClient notificaciones={notificaciones} />
}
