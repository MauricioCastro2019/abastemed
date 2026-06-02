'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 62 / 56)} viewBox="0 0 56 62" fill="none">
      <defs>
        <linearGradient id="rc-lg" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18A0B5" />
          <stop offset="100%" stopColor="#2AABBF" />
        </linearGradient>
      </defs>
      <path d="M7 48 L23 6" stroke="url(#rc-lg)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M23 6 C23 6 48 6 48 26 C48 40 36 48 23 48 L17 48"
        stroke="url(#rc-lg)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <line x1="15" y1="31" x2="34" y2="31" stroke="url(#rc-lg)" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="24" y1="25" x2="24" y2="37" stroke="url(#rc-lg)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M2 56 L12 56 L15 50 L18 62 L21 52 L24 56 L54 56"
        stroke="url(#rc-lg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
    </svg>
  )
}

function RecuperarForm() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/actualizar-contrasena`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      setError('No se pudo enviar el correo. Verifica que el email sea correcto.')
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0B1934 0%, #0D2048 50%, #122454 100%)' }}>

      <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 220" preserveAspectRatio="none"
        style={{ opacity: 0.12 }}>
        <path d="M0,128 C360,200 720,56 1080,128 C1260,164 1380,180 1440,160 L1440,220 L0,220 Z"
          fill="#2AABBF" />
      </svg>

      <div className="w-full max-w-sm px-6 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <LogoMark size={64} />
          <h1 className="text-2xl font-black tracking-widest text-white mt-3">ABASTEMED</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#e6f7fa' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z"
                    stroke="#2AABBF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="22,6 12,13 2,6" stroke="#2AABBF" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: '#0D1B3E' }}>Revisa tu correo</h2>
              <p className="text-sm text-gray-500 mb-6">
                Te enviamos un enlace a <strong>{email}</strong> para restablecer tu contraseña.
              </p>
              <Link href="/login" className="text-sm font-semibold hover:underline"
                style={{ color: '#2AABBF' }}>
                ← Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#0D1B3E' }}>Recuperar contraseña</h2>
              <p className="text-sm text-gray-400 mb-6">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email"
                    className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                    style={{ color: '#1B2B4B' }}>
                    Correo electrónico
                  </label>
                  <input id="email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    required placeholder="tu@correo.com" autoComplete="email"
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
                      Enviando...
                    </span>
                  ) : 'Enviar instrucciones'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login"
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RecuperarContrasenaPage() {
  return (
    <Suspense>
      <RecuperarForm />
    </Suspense>
  )
}
