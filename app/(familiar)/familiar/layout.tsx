import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function FamiliarLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, nombre, apellido, email')
    .eq('id', user.id)
    .single()

  if (perfil?.rol === 'admin') redirect('/dashboard')
  if (perfil?.rol === 'enfermero') redirect('/enfermero/dashboard')

  async function handleLogout() {
    'use server'
    const s = await createClient()
    await s.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F0' }}>
      {/* Navbar top */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#1B2B4B' }}>
              <svg width="13" height="13" viewBox="0 0 32 32" fill="none">
                <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="#2AABBF" />
              </svg>
            </div>
            <span className="font-bold text-sm tracking-widest" style={{ color: '#1B2B4B' }}>
              ABASTEMED
            </span>
          </div>

          <div className="flex items-center gap-4">
            {perfil && (
              <span className="text-xs text-gray-500">
                {perfil.nombre} {perfil.apellido}
              </span>
            )}
            <form action={handleLogout}>
              <button type="submit" className="text-xs text-gray-400 hover:text-[#1B2B4B] transition-colors">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
