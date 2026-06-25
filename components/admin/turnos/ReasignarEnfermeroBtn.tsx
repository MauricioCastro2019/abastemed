'use client'

import { useState, useTransition } from 'react'
import { reasignarEnfermero } from '@/lib/actions/turnos'
import { UserCheck, X, Check } from 'lucide-react'

interface Enfermero {
  id: string
  nombre: string
  apellido: string
  cedula: string
}

interface Props {
  turnoId: string
  enfermeroActualId: string
  enfermeros: Enfermero[]
}

export function ReasignarEnfermeroBtn({ turnoId, enfermeroActualId, enfermeros }: Props) {
  const [open, setOpen]           = useState(false)
  const [selected, setSelected]   = useState(enfermeroActualId)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected === enfermeroActualId) { setOpen(false); return }
    setError(null)
    startTransition(async () => {
      const result = await reasignarEnfermero(turnoId, selected)
      if (result?.error) { setError(result.error); return }
      setOpen(false)
      window.location.reload()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all"
      >
        <UserCheck size={13} />
        Reasignar enfermero/a
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-[#2AABBF]/30 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Cambiar enfermero/a asignado/a</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Seleccionar enfermero/a</label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
            required
          >
            {enfermeros.map(enf => (
              <option key={enf.id} value={enf.id}>
                {enf.nombre} {enf.apellido} — {enf.cedula}
              </option>
            ))}
          </select>
        </div>

        {selected !== enfermeroActualId && (
          <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            El calendario semanal se actualizará con el nuevo enfermero/a.
          </div>
        )}

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending || selected === enfermeroActualId}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50"
            style={{ backgroundColor: '#2AABBF' }}
          >
            <Check size={14} />
            {isPending ? 'Guardando...' : 'Guardar cambio'}
          </button>
        </div>
      </form>
    </div>
  )
}
