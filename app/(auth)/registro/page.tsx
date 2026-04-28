'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarEnfermero } from '@/lib/actions/registro'
import Link from 'next/link'

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none transition-all bg-gray-50"
const LABEL = "block text-xs font-semibold mb-1.5 uppercase tracking-wider"

function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 62 / 56)} viewBox="0 0 56 62" fill="none">
      <defs>
        <linearGradient id="rlg" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18A0B5" />
          <stop offset="100%" stopColor="#2AABBF" />
        </linearGradient>
      </defs>
      <path d="M7 48 L23 6" stroke="url(#rlg)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M23 6 C23 6 48 6 48 26 C48 40 36 48 23 48 L17 48"
        stroke="url(#rlg)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <line x1="15" y1="31" x2="34" y2="31" stroke="url(#rlg)" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="24" y1="25" x2="24" y2="37" stroke="url(#rlg)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M2 56 L10 56 L13 50 L16 62 L19 52 L22 56 L50 56"
        stroke="url(#rlg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  )
}

export default function RegistroEnfermeroPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError]     = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await registrarEnfermero(formData)
      if (!result.ok) setError(result.error)
      else router.push('/login?registered=1')
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0B1934 0%, #0D2048 50%, #122454 100%)' }}>

      {/* Olas */}
      <svg className="absolute bottom-0 left-0 w-full pointer-events-none" viewBox="0 0 1440 180"
        preserveAspectRatio="none" style={{ opacity: 0.1 }}>
        <path d="M0,100 C360,160 720,40 1080,100 C1260,130 1380,150 1440,130 L1440,180 L0,180 Z"
          fill="#2AABBF" />
      </svg>

      <div className="w-full max-w-lg relative z-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoMark size={60} />
          </div>
          <h1 className="text-3xl font-black tracking-widest text-white">ABASTEMED</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: '#2AABBF' }}>
            Registro de enfermero/a
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold mb-1" style={{ color: '#0D1B3E' }}>Crear cuenta profesional</h2>
          <p className="text-xs text-gray-400 mb-6">Tu cuenta quedará pendiente de aprobación por el administrador.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Nombre *</label>
                <input name="nombre" required placeholder="María" className={INPUT}
                  style={{ color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Apellido *</label>
                <input name="apellido" required placeholder="González" className={INPUT}
                  style={{ color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Cédula *</label>
                <input name="cedula" required placeholder="V-12345678" className={INPUT}
                  style={{ color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Teléfono *</label>
                <input name="telefono" required placeholder="+58 412 000 0000" className={INPUT}
                  style={{ color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
            </div>

            <div>
              <label className={LABEL} style={{ color: '#1B2B4B' }}>Correo electrónico *</label>
              <input name="email" type="email" required placeholder="tu@correo.com" className={INPUT}
                style={{ color: '#1B2B4B' }}
                onFocus={e => e.target.style.borderColor = '#2AABBF'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            <div>
              <label className={LABEL} style={{ color: '#1B2B4B' }}>
                Especialidades
                <span className="text-gray-400 font-normal normal-case ml-1">(opcional — una por línea)</span>
              </label>
              <textarea name="especialidades" rows={3}
                placeholder={"Cuidados intensivos\nGeriatría\nPediatría"}
                className={INPUT} style={{ color: '#1B2B4B', resize: 'none' }}
                onFocus={e => e.target.style.borderColor = '#2AABBF'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Contraseña *</label>
                <input name="password" type="password" required placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={INPUT} style={{ color: '#1B2B4B' }}
                  onFocus={e => e.target.style.borderColor = '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
              </div>
              <div>
                <label className={LABEL} style={{ color: '#1B2B4B' }}>Confirmar *</label>
                <input type="password" required placeholder="••••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  className={INPUT}
                  style={{
                    color: '#1B2B4B',
                    borderColor: confirm && confirm !== password ? '#ef4444' : '#e5e7eb',
                  }}
                  onFocus={e => e.target.style.borderColor = confirm !== password ? '#ef4444' : '#2AABBF'}
                  onBlur={e => e.target.style.borderColor = confirm !== password ? '#ef4444' : '#e5e7eb'} />
              </div>
            </div>
            {confirm && password !== confirm && (
              <p className="text-xs text-red-500 -mt-2">Las contraseñas no coinciden</p>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={isPending}
              className="w-full py-3 text-sm font-bold rounded-xl transition-all text-white tracking-wide"
              style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
              {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/50 mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: '#2AABBF' }}>
            Inicia sesión
          </Link>
        </p>

        <p className="text-center text-xs text-white/20 mt-4">
          © 2025 Abastemed · Cuidado profesional en casa
        </p>
      </div>
    </div>
  )
}
