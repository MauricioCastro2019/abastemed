import { SidebarEnfermero } from '@/components/enfermero/SidebarEnfermero'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'

async function getNotifCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient()
    const { count } = await supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('perfil_id', userId)
      .eq('leida', false)
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function EnfermeroLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, nombre, apellido, email')
    .eq('id', user.id)
    .single()

  if (perfil?.rol === 'admin') redirect('/dashboard')

  const notifNoLeidas = await getNotifCount(user.id)

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F5F0' }}>
      <Toaster position="top-right" richColors closeButton />
      <SidebarEnfermero perfil={perfil} notifNoLeidas={notifNoLeidas} />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
