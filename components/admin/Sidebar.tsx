'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FolderOpen,
  Calendar,
  CalendarRange,
  Receipt,
  Heart,
  LogOut,
  Menu,
  X,
  Shield,
  FileText,
  Package,
  ClipboardList,
  ScrollText,
  ClipboardCheck,
  KeyRound,
  UserPlus,
  Banknote,
  CheckSquare,
  Wallet,
  Activity,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ADMIN = [
  { href: '/dashboard',           label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/prospectos',          label: 'Prospectos',      icon: UserPlus },
  { href: '/levantamientos',      label: 'Levantamientos',  icon: ClipboardCheck },
  { href: '/pacientes',           label: 'Pacientes',       icon: Users },
  { href: '/enfermeros',          label: 'Enfermeros',      icon: Stethoscope },
  { href: '/casos',               label: 'Casos',           icon: FolderOpen },
  { href: '/plan-cuidado',         label: 'Plan de Cuidado', icon: ClipboardList },
  { href: '/turnos',              label: 'Turnos',          icon: Calendar },
  { href: '/turnos/semana',       label: 'Horarios',        icon: CalendarRange },
  { href: '/turnos/validacion',   label: 'Validación',      icon: CheckSquare },
  { href: '/cortes',              label: 'Cortes y Pagos',  icon: Wallet },
  { href: '/insumos',             label: 'Insumos',         icon: Package },
  { href: '/familiares',          label: 'Familiares',      icon: Heart },
  { href: '/cobranza',            label: 'Cobranza',        icon: Receipt },
  { href: '/recibos',             label: 'Recibos',         icon: FileText },
  { href: '/finanzas',            label: 'Finanzas',        icon: Banknote },
  { href: '/bitacora',            label: 'Bitácora',        icon: ScrollText },
  { href: '/salud-sistema',       label: 'Salud del Sistema', icon: Activity },
]

const NAV_COORDINADOR = [
  { href: '/dashboard',           label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/prospectos',          label: 'Prospectos',      icon: UserPlus },
  { href: '/levantamientos',      label: 'Levantamientos',  icon: ClipboardCheck },
  { href: '/pacientes',           label: 'Pacientes',       icon: Users },
  { href: '/enfermeros',          label: 'Enfermeros',      icon: Stethoscope },
  { href: '/casos',               label: 'Casos',           icon: FolderOpen },
  { href: '/plan-cuidado',        label: 'Plan de Cuidado', icon: ClipboardList },
  { href: '/turnos',              label: 'Turnos',          icon: Calendar },
  { href: '/turnos/semana',       label: 'Horarios',        icon: CalendarRange },
  { href: '/turnos/validacion',   label: 'Validación',      icon: CheckSquare },
  { href: '/cortes',              label: 'Cortes',          icon: Wallet },
  { href: '/insumos',             label: 'Insumos',         icon: Package },
  { href: '/familiares',          label: 'Familiares',      icon: Heart },
]

interface Props {
  rol?: string
  nombre?: string
  apellido?: string
}

const BG = 'linear-gradient(180deg, #0D1B3E 0%, #162B4C 100%)'

export function Sidebar({ rol, nombre, apellido }: Props) {
  const pathname    = usePathname()
  const router      = useRouter()
  const [open, setOpen] = useState(false)

  const NAV_ITEMS = rol === 'coordinador' ? NAV_COORDINADOR : NAV_ADMIN
  const rolLabel  = rol === 'coordinador' ? 'Coordinador' : 'Admin'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo — fijo arriba */}
      <div className="flex-shrink-0 px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg width="34" height="37" viewBox="0 0 56 62" fill="none">
              <defs>
                <linearGradient id="slg" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="#18A0B5" />
                  <stop offset="100%" stopColor="#2AABBF" />
                </linearGradient>
              </defs>
              <path d="M7 48 L23 6" stroke="url(#slg)" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M23 6 C23 6 48 6 48 26 C48 40 36 48 23 48 L17 48"
                stroke="url(#slg)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <line x1="15" y1="31" x2="34" y2="31" stroke="url(#slg)" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="24" y1="25" x2="24" y2="37" stroke="url(#slg)" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M2 56 L10 56 L13 50 L16 62 L19 52 L22 56 L50 56"
                stroke="url(#slg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-widest leading-none">ABASTEMED</p>
            <p className="text-white/40 text-xs mt-0.5 tracking-wide">{rolLabel}</p>
          </div>
        </div>
      </div>

      {/* Usuario — fijo */}
      {nombre && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#2AABBF', color: '#1B2B4B' }}>
              {nombre[0]}{apellido?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{nombre} {apellido}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield size={10} className="text-white/40" />
                <p className="text-white/40 text-xs">{rolLabel}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav — scrollable, ocupa el espacio restante */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5
        [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // Active si es exacto, o si ningún otro item del nav es match más específico
          const isActive = pathname === href || (
            pathname.startsWith(href + '/') &&
            !NAV_ITEMS.some(n => n.href !== href && pathname.startsWith(n.href) && n.href.startsWith(href + '/'))
          )
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#2AABBF] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Acciones de cuenta — siempre visibles al fondo */}
      <div className="flex-shrink-0 px-3 py-4 border-t border-white/10 space-y-0.5">
        <Link
          href="/actualizar-contrasena"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all w-full"
        >
          <KeyRound size={18} className="flex-shrink-0" />
          Cambiar contraseña
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all w-full"
        >
          <LogOut size={18} className="flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── DESKTOP: sidebar fijo lateral ─────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-60 flex-shrink-0 h-screen"
        style={{ background: BG }}
      >
        <NavContent />
      </aside>

      {/* ── MOBILE: barra superior fija ───────────────────────── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 h-14 px-4 border-b border-white/10"
        style={{ background: BG }}
      >
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <span className="text-white font-black text-sm tracking-widest">ABASTEMED</span>
        {nombre && (
          <div className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: '#2AABBF', color: '#1B2B4B' }}>
            {nombre[0]}{apellido?.[0]}
          </div>
        )}
      </header>

      {/* ── MOBILE: drawer ────────────────────────────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Sidebar drawer */}
          <aside
            className="flex flex-col w-72 h-full"
            style={{ background: BG }}
          >
            {/* Botón cerrar dentro del drawer */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
              <span className="text-white font-black text-sm tracking-widest">ABASTEMED</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>
            <NavContent onNavigate={() => setOpen(false)} />
          </aside>

          {/* Overlay */}
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        </div>
      )}
    </>
  )
}
