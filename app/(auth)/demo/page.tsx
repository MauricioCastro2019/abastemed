'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const DEMO_ROLES = [
  {
    key: 'coordinadora',
    label: 'Coordinadora operativa',
    email: 'coordinadora@demo.abastemed.com',
    description: 'Dashboard de control, turnos, incidencias, cobranza y equipo completo.',
    redirect: '/dashboard',
    color: '#2AABBF',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18v18H3z" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    key: 'enfermera',
    label: 'Enfermera diurna',
    email: 'andrea@demo.abastemed.com',
    description: 'Portal de turnos, registro de actividades, incidencias y entregas.',
    redirect: '/enfermero/dashboard',
    color: '#10B981',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" />
        <path d="m18 15-2-2" />
        <path d="m15 18-2-2" />
      </svg>
    ),
  },
  {
    key: 'familiar',
    label: 'Familiar — Laura Ramírez',
    email: 'laura@demo.abastemed.com',
    description: 'Portal familiar: estado de Elena, evolución, turnos, recibos y contacto.',
    redirect: '/familiar/dashboard',
    color: '#8B5CF6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'enfermero_nocturno',
    label: 'Enfermero nocturno',
    email: 'salvador@demo.abastemed.com',
    description: 'Vista del portal de turnos nocturnos, vigilancia y entregas de guardia.',
    redirect: '/enfermero/dashboard',
    color: '#F59E0B',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ),
  },
]

const PASSWORD = 'Demo2024!'

function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 62 / 56)} viewBox="0 0 56 62" fill="none">
      <defs>
        <linearGradient id="lg-demo" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18A0B5" />
          <stop offset="100%" stopColor="#2AABBF" />
        </linearGradient>
      </defs>
      <path d="M7 48 L23 6" stroke="url(#lg-demo)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M23 6 C23 6 48 6 48 26 C48 40 36 48 23 48 L17 48"
        stroke="url(#lg-demo)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <line x1="15" y1="31" x2="34" y2="31" stroke="url(#lg-demo)" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="24" y1="25" x2="24" y2="37" stroke="url(#lg-demo)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M2 56 L12 56 L15 50 L18 62 L21 52 L24 56 L54 56"
        stroke="url(#lg-demo)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
    </svg>
  )
}

export default function DemoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRoleLogin(email: string, redirect: string, roleKey: string) {
    setLoading(roleKey)
    setError(null)

    const supabase = createClient()

    // Sign out any existing session first
    await supabase.auth.signOut()

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: PASSWORD,
    })

    if (loginError) {
      setError(
        'No se pudo acceder al entorno demo. Verifica que el seed haya sido ejecutado en Supabase.'
      )
      setLoading(null)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0B1934 0%, #0D2048 50%, #122454 100%)' }}
    >
      {/* Olas decorativas */}
      <svg className="absolute bottom-0 left-0 w-full pointer-events-none" viewBox="0 0 1440 220" preserveAspectRatio="none" style={{ opacity: 0.1 }}>
        <path d="M0,128 C360,200 720,56 1080,128 C1260,164 1380,180 1440,160 L1440,220 L0,220 Z" fill="#2AABBF" />
      </svg>

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-4 px-6">
        <LogoMark size={52} />
        <h1 className="text-3xl font-black tracking-widest text-white mt-4">ABASTEMED</h1>
        <p className="text-sm mt-1 font-medium" style={{ color: '#2AABBF' }}>
          Cuidado profesional en casa
        </p>

        {/* Demo badge */}
        <div
          className="mt-6 px-5 py-2 rounded-full text-sm font-bold tracking-wide border"
          style={{
            backgroundColor: 'rgba(251,191,36,0.1)',
            borderColor: 'rgba(251,191,36,0.4)',
            color: '#FBB924',
          }}
        >
          ⚠ Entorno de demostración — Todos los datos son ficticios
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pb-16">
        <div className="w-full max-w-2xl">

          {/* Intro */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white mb-2">
              Elige un perfil para explorar la plataforma
            </h2>
            <p className="text-sm text-white/60 max-w-lg mx-auto leading-relaxed">
              Cada perfil muestra Abastemed desde una perspectiva diferente.
              El caso de demostración es{' '}
              <span className="text-white font-medium">Elena Ramírez Torres</span>
              , con una semana completa de operación documentada.
            </p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {DEMO_ROLES.map((role) => (
              <button
                key={role.key}
                onClick={() => handleRoleLogin(role.email, role.redirect, role.key)}
                disabled={loading !== null}
                className="group relative text-left rounded-2xl border transition-all duration-200 overflow-hidden"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderColor: loading === role.key ? role.color : 'rgba(255,255,255,0.1)',
                  opacity: loading !== null && loading !== role.key ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (loading === null) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.09)'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = role.color
                  }
                }}
                onMouseLeave={e => {
                  if (loading !== role.key) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                {/* Color accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-200"
                  style={{
                    backgroundColor: role.color,
                    opacity: loading === role.key ? 1 : 0.4,
                  }}
                />

                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${role.color}22`, color: role.color }}
                    >
                      {loading === role.key ? (
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                          <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      ) : role.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm leading-tight">{role.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: role.color }}>
                        {role.email}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-white/55 leading-relaxed">{role.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-950/50 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-300 text-sm text-center">{error}</p>
              <p className="text-red-400/70 text-xs text-center mt-1">
                Ejecuta <code className="bg-red-900/40 px-1 rounded">supabase/seed_demo.sql</code> en el SQL Editor de Supabase.
              </p>
            </div>
          )}

          {/* Narrative info */}
          <div
            className="rounded-2xl border p-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <h3 className="text-white/80 text-xs font-bold uppercase tracking-wider mb-3">
              El caso de demostración incluye
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {[
                '1 semana completa de operación documentada',
                '12 turnos completados y validados',
                '1 incidencia de hipertensión resuelta',
                '1 hallazgo clínico de piel (resuelto)',
                '1 sustitución de enfermera (cobertura)',
                'Entrega guiada de turno documentada',
                'Alertas activas y vigilancias',
                'Kardex de medicamentos con historial',
                'Portal familiar con estado del paciente',
                'Cobranza y recibo de servicio simulados',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-white/55">
                  <span style={{ color: '#2AABBF' }}>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials reference */}
          <div className="mt-4 rounded-xl border px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <p className="text-white/30 text-xs text-center">
              Contraseña de todos los perfiles demo: <code className="text-white/50">Demo2024!</code>
              {' · '}
              <a href="/login" className="hover:text-white/60 transition-colors underline">
                Ir al login real
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
