import { Sidebar } from '@/components/admin/Sidebar'
import { DemoBanner } from '@/components/DemoBanner'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'

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
  // admin, coordinador, superadmin, administrativo, auditor pasan aquí

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#F5F5F0' }}>
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        <Toaster position="top-right" richColors closeButton />
        <Sidebar rol={perfil?.rol ?? 'admin'} nombre={perfil?.nombre} apellido={perfil?.apellido} />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
