'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LogoMark({ size = 72 }: { size?: number }) {
  const s = size
  const vb = `0 0 56 62`
  return (
    <svg width={s} height={Math.round(s * 62 / 56)} viewBox={vb} fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18A0B5" />
          <stop offset="100%" stopColor="#2AABBF" />
        </linearGradient>
      </defs>
      <path d="M7 48 L23 6" stroke="url(#lg)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M23 6 C23 6 48 6 48 26 C48 40 36 48 23 48 L17 48"
        stroke="url(#lg)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <line x1="15" y1="31" x2="34" y2="31" stroke="url(#lg)" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="24" y1="25" x2="24" y2="37" stroke="url(#lg)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M2 56 L12 56 L15 50 L18 62 L21 52 L24 56 L54 56"
        stroke="url(#lg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    if (perfil?.rol === 'enfermero') {
      router.push('/enfermero/dashboard')
    } else if (perfil?.rol === 'familiar') {
      router.push('/familiar/dashboard')
    } else {
      router.push('/dashboard')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-stretch relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0B1934 0%, #0D2048 50%, #122454 100%)' }}>

      {/* Olas decorativas */}
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 220" preserveAspectRatio="none"
        style={{ opacity: 0.12 }}>
        <path d="M0,128 C360,200 720,56 1080,128 C1260,164 1380,180 1440,160 L1440,220 L0,220 Z"
          fill="#2AABBF" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 160" preserveAspectRatio="none"
        style={{ opacity: 0.07 }}>
        <path d="M0,80 C480,160 960,0 1440,80 L1440,160 L0,160 Z"
          fill="#2AABBF" />
      </svg>

      {/* Panel izquierdo — branding (solo desktop) */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 px-16 relative z-10">
        <div className="flex flex-col items-center gap-6 select-none">
          {/* Glow detrás del logo */}
          <div className="relative">
            <div className="absolute inset-0 blur-3xl rounded-full scale-150"
              style={{ backgroundColor: '#2AABBF', opacity: 0.15 }} />
            <LogoMark size={110} />
          </div>

          <div className="text-center">
            <h1 className="text-5xl font-black tracking-widest text-white mb-2">
              ABASTEMED
            </h1>
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px flex-1 max-w-16" style={{ backgroundColor: '#2AABBF', opacity: 0.4 }} />
              <svg width="60" height="14" viewBox="0 0 60 14" fill="none">
                <path d="M0 7 L12 7 L15 2 L18 12 L21 4 L24 7 L60 7"
                  stroke="#2AABBF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="h-px flex-1 max-w-16" style={{ backgroundColor: '#2AABBF', opacity: 0.4 }} />
            </div>
            <p className="text-lg font-medium tracking-wide" style={{ color: '#2AABBF' }}>
              Cuidado profesional en casa
            </p>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-col items-center justify-center w-full lg:w-auto lg:min-w-[440px] px-6 py-10 relative z-10">

        {/* Logo mobile */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <LogoMark size={64} />
          <h1 className="text-3xl font-black tracking-widest text-white mt-3">ABASTEMED</h1>
          <p className="text-sm mt-1" style={{ color: '#2AABBF' }}>Cuidado profesional en casa</p>
        </div>

        <div className="w-full max-w-sm">
          {justRegistered && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 text-sm text-emerald-700">
              ¡Cuenta creada! Inicia sesión para continuar.
            </div>
          )}

          {/* Card login */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold mb-1" style={{ color: '#0D1B3E' }}>Bienvenido</h2>
            <p className="text-sm text-gray-400 mb-6">Ingresa tus credenciales para continuar</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: '#1B2B4B' }}>
                  Correo electrónico
                </label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="tu@correo.com" autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-gray-50"
                  style={{ borderColor: '#e5e7eb', color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#1B2B4B' }}>
                    Contraseña
                  </label>
                  <Link href="/recuperar-contrasena"
                    className="text-xs hover:underline"
                    style={{ color: '#2AABBF' }}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-gray-50"
                  style={{ borderColor: '#e5e7eb', color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 text-sm font-bold rounded-xl transition-all text-white mt-2 tracking-wide"
                style={{ backgroundColor: loading ? '#94a3b8' : '#2AABBF' }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Ingresando...
                  </span>
                ) : 'Ingresar'}
              </button>
            </form>
          </div>

          {/* Acceso enfermeros */}
          <div className="mt-4 bg-white/8 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
            <p className="text-white/60 text-xs mb-1">¿Eres enfermero/a?</p>
            <Link href="/registro" className="text-sm font-semibold hover:underline"
              style={{ color: '#2AABBF' }}>
              Regístrate aquí →
            </Link>
          </div>

          <p className="text-center text-xs text-white/25 mt-6">
            © 2025 Abastemed · Cuidado profesional en casa
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
