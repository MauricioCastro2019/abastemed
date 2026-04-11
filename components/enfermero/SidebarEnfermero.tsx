'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Calendar, User, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/enfermero/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/enfermero/turnos',    label: 'Mis turnos',  icon: Calendar },
  { href: '/enfermero/perfil',    label: 'Mi perfil',   icon: User },
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
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#2AABBF' }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="white" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-widest">ABASTEMED</p>
            <p className="text-white/50 text-xs">Portal Enfermero</p>
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

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
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
        style={{ backgroundColor: '#1B2B4B' }}>
        <Content />
      </aside>

      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg"
        style={{ backgroundColor: '#1B2B4B' }}
        onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <aside className="flex flex-col w-60 h-full pt-16" style={{ backgroundColor: '#1B2B4B' }}>
            <Content />
          </aside>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}
