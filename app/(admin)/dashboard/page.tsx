import { createClient } from '@/lib/supabase/server'
import { AdminDashboard } from '@/components/admin/dashboard/AdminDashboard'
import { JefeDashboard } from '@/components/admin/dashboard/JefeDashboard'
import { RealtimeRefresh } from '@/components/RealtimeRefresh'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, nombre')
    .eq('id', user.id)
    .single()

  if (perfil?.rol === 'coordinador') {
    return (
      <>
        <RealtimeRefresh tables={['turnos', 'casos', 'alertas', 'alertas_activas', 'pendientes_caso', 'entregas_turno_guiadas']} />
        <JefeDashboard nombre={perfil.nombre} />
      </>
    )
  }

  return (
    <>
      <RealtimeRefresh tables={['turnos', 'casos', 'alertas', 'levantamientos_paciente', 'cobranza_items']} />
      <AdminDashboard />
    </>
  )
}
