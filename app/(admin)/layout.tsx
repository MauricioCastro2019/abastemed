import { Sidebar } from '@/components/admin/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, nombre, apellido')
    .eq('id', user.id)
    .single()

  if (perfil?.rol === 'enfermero')     redirect('/enfermero/dashboard')
  if (perfil?.rol === 'familiar')      redirect('/familiar/dashboard')
  // admin y jefe_enfermeros pasan aquí

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F5F0' }}>
      <Sidebar rol={perfil?.rol ?? 'admin'} nombre={perfil?.nombre} apellido={perfil?.apellido} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
