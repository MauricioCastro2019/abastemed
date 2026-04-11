'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F5F5F0' }}
    >
      <div className="w-full max-w-md px-6">
        {/* Logo y marca */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: '#1B2B4B' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4z"
                fill="#2AABBF"
                opacity="0.3"
              />
              <path
                d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z"
                fill="white"
              />
            </svg>
          </div>
          <h1
            className="text-3xl font-bold tracking-widest mb-1"
            style={{ color: '#1B2B4B' }}
          >
            ABASTEMED
          </h1>
          <p className="text-sm" style={{ color: '#2AABBF' }}>
            Tu aliado confiable en suministros hospitalarios
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2
            className="text-xl font-semibold mb-6"
            style={{ color: '#1B2B4B' }}
          >
            Iniciar sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#1B2B4B' }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                style={{
                  backgroundColor: '#F5F5F0',
                  color: '#1B2B4B',
                }}
                onFocus={e => (e.target.style.borderColor = '#2AABBF')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#1B2B4B' }}
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                style={{
                  backgroundColor: '#F5F5F0',
                  color: '#1B2B4B',
                }}
                onFocus={e => (e.target.style.borderColor = '#2AABBF')}
                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold rounded-lg transition-all"
              style={{
                backgroundColor: '#2AABBF',
                color: 'white',
                border: 'none',
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="#"
              className="text-sm"
              style={{ color: '#2AABBF' }}
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 Abastemed · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
