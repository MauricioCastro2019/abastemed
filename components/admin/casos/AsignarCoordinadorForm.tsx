'use client'

import { useState, useTransition } from 'react'
import { asignarCoordinador } from '@/lib/actions/casos'
import type { PerfilUsuario } from '@/types'
import { UserCheck } from 'lucide-react'

interface Props {
  casoId: string
  coordinadores: PerfilUsuario[]
  coordinadorActual?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'> | null
}

export function AsignarCoordinadorForm({ casoId, coordinadores, coordinadorActual }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState(coordinadorActual?.id ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const result = await asignarCoordinador(casoId, selectedId || null)
      if (result?.error) setError(result.error)
      else setSaved(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
      <select
        value={selectedId}
        onChange={e => { setSelectedId(e.target.value); setSaved(false) }}
        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] bg-white transition-all"
      >
        <option value="">Sin asignar</option>
        {coordinadores.map(c => (
          <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all flex-shrink-0"
        style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}
      >
        <UserCheck size={14} />
        {isPending ? 'Guardando...' : 'Asignar'}
      </button>
      {saved && <span className="text-xs text-emerald-600">Guardado</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </form>
  )
}
