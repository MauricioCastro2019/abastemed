'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Calendar, User, LogOut, Menu, X, Package, ClipboardList, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/enfermero/dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/enfermero/turnos',         label: 'Mis turnos',      icon: Calendar },
  { href: '/enfermero/agenda-cuidado', label: 'Plan de Cuidado', icon: ClipboardList },
  { href: '/enfermero/insumos',        label: 'Insumos',         icon: Package },
  { href: '/enfermero/perfil',         label: 'Mi perfil',       icon: User },
]

interface Props {
  perfil: { nombre: string; apellido: string; email: string } | null
}

export function SidebarEnfermero({ perfil }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const Content = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg width="34" height="37" viewBox="0 0 56 62" fill="none">
              <defs>
                <linearGradient id="elg" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#18A0B5" />
                  <stop offset="100%" stopColor="#2AABBF" />
                </linearGradient>
              </defs>
              <path d="M7 48 L23 6" stroke="url(#elg)" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M23 6 C23 6 48 6 48 26 C48 40 36 48 23 48 L17 48"
                stroke="url(#elg)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <line x1="15" y1="31" x2="34" y2="31" stroke="url(#elg)" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="24" y1="25" x2="24" y2="37" stroke="url(#elg)" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M2 56 L10 56 L13 50 L16 62 L19 52 L22 56 L50 56"
                stroke="url(#elg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-widest leading-none">ABASTEMED</p>
            <p className="text-white/40 text-xs mt-0.5 tracking-wide">Portal Enfermero</p>
          </div>
        </div>
      </div>

      {/* Usuario */}
      {perfil && (
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#1B2B4B] flex-shrink-0"
              style={{ backgroundColor: '#2AABBF' }}>
              {perfil.nombre?.[0]}{perfil.apellido?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {perfil.nombre} {perfil.apellido}
              </p>
              <p className="text-white/40 text-xs truncate">{perfil.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#2AABBF] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}>
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Acciones de cuenta */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <Link href="/actualizar-contrasena"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all w-full">
          <KeyRound size={18} />
          Cambiar contraseña
        </Link>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all w-full">
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 h-screen"
        style={{ background: 'linear-gradient(180deg, #0D1B3E 0%, #162B4C 100%)' }}>
        <Content />
      </aside>

      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ backgroundColor: '#0D1B3E' }}
        onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <aside className="flex flex-col w-60 h-full pt-16"
            style={{ background: 'linear-gradient(180deg, #0D1B3E 0%, #162B4C 100%)' }}>
            <Content />
          </aside>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}

