'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarEnfermero } from '@/lib/actions/registro'
import Link from 'next/link'

const INPUT = "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none transition-all"
const LABEL = "block text-sm font-medium mb-1.5"

export default function RegistroEnfermeroPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError]     = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await registrarEnfermero(formData)
      if (!result.ok) {
        setError(result.error)
      } else {
        router.push('/login?registered=1')
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" style={{ backgroundColor: '#F5F5F0' }}>
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ backgroundColor: '#1B2B4B' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4z"
                fill="#2AABBF" opacity="0.3" />
              <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-widest" style={{ color: '#1B2B4B' }}>ABASTEMED</h1>
          <p className="text-sm mt-1" style={{ color: '#2AABBF' }}>Registro de enfermero/a</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#1B2B4B' }}>
            Crear cuenta profesional
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Nombre y apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Nombre *</label>
                <input name="nombre" required placeholder="María"
                  className={INPUT} style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Apellido *</label>
                <input name="apellido" required placeholder="González"
                  className={INPUT} style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
            </div>

            {/* Cédula y teléfono */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Cédula *</label>
                <input name="cedula" required placeholder="V-12345678"
                  className={INPUT} style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Teléfono *</label>
                <input name="telefono" required placeholder="+58 412 000 0000"
                  className={INPUT} style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={LABEL} style={{ color: '#1B2B4B' }}>Correo electrónico *</label>
              <input name="email" type="email" required placeholder="tu@correo.com"
                className={INPUT} style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B' }}
                onFocus={e => e.target.style.borderColor = '#2AABBF'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            {/* Especialidades */}
            <div>
              <label className={LABEL} style={{ color: '#1B2B4B' }}>
                Especialidades
                <span className="text-gray-400 font-normal ml-1">(opcional — una por línea)</span>
              </label>
              <textarea name="especialidades" rows={3}
                placeholder={"Cuidados intensivos\nGeriatría\nPediatría"}
                className={INPUT} style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B', resize: 'none' }}
                onFocus={e => e.target.style.borderColor = '#2AABBF'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            {/* Contraseña */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Contraseña *</label>
                <input name="password" type="password" required placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={INPUT} style={{ backgroundColor: '#F5F5F0', color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Confirmar *</label>
                <input type="password" required placeholder="••••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  className={INPUT}
                  style={{
                    backgroundColor: '#F5F5F0',
                    color: '#1B2B4B',
                    borderColor: confirm && confirm !== password ? '#ef4444' : '#e5e7eb'
                  }}
                  onFocus={e => e.target.style.borderColor = confirm !== password ? '#ef4444' : '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = confirm !== password ? '#ef4444' : '#e5e7eb'} />
              </div>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-red-500 -mt-3">Las contraseñas no coinciden</p>
            )}

            {/* Error */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
            )}

            {/* Info */}
            <div className="bg-[#EBF8FB] rounded-lg px-4 py-3">
              <p className="text-xs" style={{ color: '#1B2B4B' }}>
                Tu cuenta quedará <strong>pendiente de aprobación</strong> por el administrador antes de poder recibir turnos.
                Podrás entrar de inmediato y completar tu perfil.
              </p>
            </div>

            {/* Submit */}
            <button type="submit" disabled={isPending}
              className="w-full py-2.5 text-sm font-semibold rounded-lg transition-all text-white"
              style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
              {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium hover:underline" style={{ color: '#2AABBF' }}>
            Inicia sesión
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4">
          © 2025 Abastemed · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
