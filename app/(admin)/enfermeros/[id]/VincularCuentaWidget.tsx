'use client'

import { useState, useTransition } from 'react'
import { vincularCuentaEnfermero } from '@/lib/actions/enfermeros'
import { useRouter } from 'next/navigation'
import { Link2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  enfermeroId: string
  yaVinculado: boolean
  emailVinculado?: string
}

export function VincularCuentaWidget({ enfermeroId, yaVinculado, emailVinculado }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)

  if (yaVinculado && !abierto) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl"
        style={{ backgroundColor: '#ECFDF5', border: '1px solid #86efac' }}>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={14} style={{ color: '#059669' }} />
          <span className="text-xs font-medium" style={{ color: '#059669' }}>
            Cuenta vinculada{emailVinculado ? ` — ${emailVinculado}` : ''}
          </span>
        </div>
        <button onClick={() => setAbierto(true)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Cambiar
        </button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setExito(null)
    startTransition(async () => {
      const result = await vincularCuentaEnfermero(enfermeroId, email)
      if (result.error) {
        setError(result.error)
      } else {
        setExito(`Cuenta de ${result.perfilNombre} vinculada correctamente.`)
        setEmail('')
        setAbierto(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      {exito && (
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{ backgroundColor: '#ECFDF5', border: '1px solid #86efac' }}>
          <CheckCircle2 size={14} style={{ color: '#059669' }} />
          <p className="text-xs font-medium" style={{ color: '#059669' }}>{exito}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Email de la cuenta de acceso del enfermero
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="enfermero@ejemplo.com"
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">
            El enfermero debe haberse registrado con este email en la plataforma.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #fca5a5' }}>
            <AlertCircle size={13} style={{ color: '#dc2626' }} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          {yaVinculado && (
            <button type="button" onClick={() => { setAbierto(false); setError(null) }}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-all">
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isPending || !email.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: '#2AABBF' }}>
            {isPending
              ? <><Loader2 size={12} className="animate-spin" /> Vinculando...</>
              : <><Link2 size={12} /> Vincular cuenta</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
