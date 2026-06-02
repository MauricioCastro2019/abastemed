'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 62 / 56)} viewBox="0 0 56 62" fill="none">
      <defs>
        <linearGradient id="ac-lg" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18A0B5" />
          <stop offset="100%" stopColor="#2AABBF" />
        </linearGradient>
      </defs>
      <path d="M7 48 L23 6" stroke="url(#ac-lg)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M23 6 C23 6 48 6 48 26 C48 40 36 48 23 48 L17 48"
        stroke="url(#ac-lg)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <line x1="15" y1="31" x2="34" y2="31" stroke="url(#ac-lg)" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="24" y1="25" x2="24" y2="37" stroke="url(#ac-lg)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M2 56 L12 56 L15 50 L18 62 L21 52 L24 56 L54 56"
        stroke="url(#ac-lg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
    </svg>
  )
}

function ActualizarForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [ready, setReady]         = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const supabase = createClient()

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setInitError('El enlace no es válido o ya expiró. Solicita uno nuevo.')
        else setReady(true)
      })
    } else {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setReady(true)
        else router.replace('/recuperar-contrasena')
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('No se pudo actualizar la contraseña. Intenta de nuevo.')
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  const Bg = () => (
    <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 220" preserveAspectRatio="none"
      style={{ opacity: 0.12 }}>
      <path d="M0,128 C360,200 720,56 1080,128 C1260,164 1380,180 1440,160 L1440,220 L0,220 Z"
        fill="#2AABBF" />
    </svg>
  )

  const wrapper = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0B1934 0%, #0D2048 50%, #122454 100%)' }}>
      <Bg />
      <div className="w-full max-w-sm px-6 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <LogoMark size={64} />
          <h1 className="text-2xl font-black tracking-widest text-white mt-3">ABASTEMED</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  )

  if (initError) {
    return wrapper(
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#0D1B3E' }}>Enlace inválido</h2>
        <p className="text-sm text-gray-500 mb-6">{initError}</p>
        <Link href="/recuperar-contrasena" className="text-sm font-semibold hover:underline"
          style={{ color: '#2AABBF' }}>
          Solicitar nuevo enlace →
        </Link>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0B1934 0%, #0D2048 50%, #122454 100%)' }}>
        <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#2AABBF" strokeWidth="3" opacity="0.3" />
          <path d="M12 2 A10 10 0 0 1 22 12" stroke="#2AABBF" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  return wrapper(
    success ? (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: '#e6f7fa' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#2AABBF" strokeWidth="2" />
            <polyline points="9,12 11,14 15,10" stroke="#2AABBF" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#0D1B3E' }}>¡Contraseña actualizada!</h2>
        <p className="text-sm text-gray-500">Serás redirigido al inicio de sesión en un momento...</p>
      </div>
    ) : (
      <>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#0D1B3E' }}>Nueva contraseña</h2>
        <p className="text-sm text-gray-400 mb-6">Elige una contraseña segura de al menos 8 caracteres.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password"
              className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: '#1B2B4B' }}>
              Nueva contraseña
            </label>
            <input id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••" autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-gray-50"
              style={{ borderColor: '#e5e7eb', color: '#1B2B4B' }}
              onFocus={e => e.target.style.borderColor = '#2AABBF'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div>
            <label htmlFor="confirm"
              className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: '#1B2B4B' }}>
              Confirmar contraseña
            </label>
            <input id="confirm" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required placeholder="••••••••" autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-gray-50"
              style={{ borderColor: '#e5e7eb', color: '#1B2B4B' }}
              onFocus={e => e.target.style.borderColor = '#2AABBF'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 text-sm font-bold rounded-xl transition-all text-white tracking-wide"
            style={{ backgroundColor: loading ? '#94a3b8' : '#2AABBF' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3"
                    strokeLinecap="round" />
                </svg>
                Actualizando...
              </span>
            ) : 'Actualizar contraseña'}
          </button>
        </form>
      </>
    )
  )
}

export default function ActualizarContrasenaPage() {
  return (
    <Suspense>
      <ActualizarForm />
    </Suspense>
  )
}
