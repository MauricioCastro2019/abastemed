import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Activity, Pill, CalendarDays, CreditCard, Phone } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/familiar/dashboard',  label: 'Inicio',      icon: LayoutDashboard },
  { href: '/familiar/evolucion',  label: 'Evolución',   icon: Activity },
  { href: '/familiar/medicamentos', label: 'Medicamentos', icon: Pill },
  { href: '/familiar/agenda',     label: 'Agenda',      icon: CalendarDays },
  { href: '/familiar/cobranza',   label: 'Estado',      icon: CreditCard },
  { href: '/familiar/contacto',   label: 'Contacto',    icon: Phone },
]

export default async function FamiliarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, nombre, apellido, email, parentesco')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.rol === 'admin') redirect('/dashboard')
  if (perfil.rol === 'enfermero') redirect('/enfermero/dashboard')
  if (perfil.rol === 'coordinador') redirect('/dashboard')

  async function handleLogout() {
    'use server'
    const s = await createClient()
    await s.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0F4F8' }}>
      {/* ─── Barra superior ─── */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: '#1B2B4B', borderColor: '#162240' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#2AABBF' }}
            >
              <svg width="13" height="13" viewBox="0 0 32 32" fill="none">
                <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="white" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-sm tracking-widest text-white">ABASTEMED</span>
              <span className="block text-[10px] text-blue-300 leading-none">Portal Familiar</span>
            </div>
          </div>

          {/* Usuario y acciones */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-white leading-tight">
                {perfil.nombre} {perfil.apellido}
              </p>
              {perfil.parentesco && (
                <p className="text-[10px] text-blue-300 leading-tight capitalize">{perfil.parentesco}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/familiar/configuracion"
                className="text-xs text-blue-300 hover:text-white transition-colors hidden sm:block"
              >
                Mi cuenta
              </Link>
              <span className="text-blue-700 hidden sm:block">|</span>
              <form action={handleLogout}>
                <button
                  type="submit"
                  className="text-xs text-blue-300 hover:text-white transition-colors"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Contenido principal ─── */}
      <main className="max-w-2xl mx-auto px-4 py-5 pb-24">
        {children}
      </main>

      {/* ─── Navegación inferior móvil ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{ backgroundColor: 'white', borderColor: '#E5E7EB' }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-stretch h-16">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-[#2AABBF] transition-colors group"
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
