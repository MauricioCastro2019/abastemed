'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Suspense } from 'react'

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
      // admin y jefe_enfermeros
      router.push('/dashboard')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F0' }}>
      <div className="w-full max-w-md px-6">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: '#1B2B4B' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4z"
                fill="#2AABBF" opacity="0.3" />
              <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="white" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-widest mb-1" style={{ color: '#1B2B4B' }}>
            ABASTEMED
          </h1>
          <p className="text-sm" style={{ color: '#2AABBF' }}>
            Tu aliado confiable en suministros hospitalarios
          </p>
        </div>

        {/* Mensaje de registro exitoso */}
        {justRegistered && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
            ¡Cuenta creada correctamente! Inicia sesión para continuar.
          </div>
        )}

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: '#1B2B4B' }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#1B2B4B' }}>
                Correo electrónico
              </label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B' }}
                onFocus={e => e.target.style.borderColor = '#2AABBF'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#1B2B4B' }}>
                Contraseña
              </label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B' }}
                onFocus={e => e.target.style.borderColor = '#2AABBF'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
            )}

            <Button type="submit" disabled={loading}
              className="w-full py-2.5 text-sm font-semibold rounded-lg transition-all text-white border-none"
              style={{ backgroundColor: loading ? '#94a3b8' : '#2AABBF' }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </div>

        {/* Accesos rápidos */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-2"
              style={{ backgroundColor: '#EBF8FB' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2AABBF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#1B2B4B' }}>Familiares</p>
            <p className="text-xs text-gray-400 leading-tight">Ingresa con tus credenciales de invitación</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-2"
              style={{ backgroundColor: '#EBF8FB' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2AABBF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#1B2B4B' }}>Enfermeros/as</p>
            <Link href="/registro" className="text-xs hover:underline" style={{ color: '#2AABBF' }}>
              Regístrate aquí
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2025 Abastemed · Todos los derechos reservados
        </p>
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
