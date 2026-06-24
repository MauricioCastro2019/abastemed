import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

/**
 * Banner visible en todas las páginas cuando la sesión activa pertenece al entorno demo.
 * Detectado por dominio de email (@demo.abastemed.com).
 * Servidor-side: no requiere estado de cliente.
 */
export async function DemoBanner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email?.endsWith('@demo.abastemed.com')) return null

  return (
    <div
      className="w-full flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium z-50 flex-shrink-0"
      style={{
        backgroundColor: '#78350f',
        borderBottom: '1px solid rgba(251,191,36,0.3)',
        color: '#fef3c7',
      }}
    >
      {/* Left: warning message */}
      <div className="flex items-center gap-2 min-w-0">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
          style={{ color: '#FBB924' }}
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <span className="truncate" style={{ color: '#fef3c7' }}>
          <span style={{ color: '#FBB924' }} className="font-bold">
            ENTORNO DEMO
          </span>
          {' — '}
          Todos los datos son ficticios. Cambios no afectan datos reales.
        </span>
      </div>

      {/* Right: switch role / exit */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/demo"
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
          style={{
            backgroundColor: 'rgba(251,191,36,0.15)',
            color: '#FBB924',
            border: '1px solid rgba(251,191,36,0.3)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          Cambiar perfil
        </Link>

        <DemoSignOut />
      </div>
    </div>
  )
}

// Botón de salida como server action
function DemoSignOut() {
  async function signOut() {
    'use server'
    const { createClient } = await import('@/lib/supabase/server')
    const { redirect } = await import('next/navigation')
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/demo')
  }

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex items-center gap-1 text-xs transition-colors"
        style={{ color: '#fef3c7', opacity: 0.7 }}
      >
        Salir demo
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </form>
  )
}
