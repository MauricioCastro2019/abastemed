'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { eliminarTurno } from '@/lib/actions/turnos'
import { Trash2, X, AlertTriangle } from 'lucide-react'

interface Props {
  turnoId: string
}

export function EliminarTurnoBtn({ turnoId }: Props) {
  const [open, setOpen]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleEliminar() {
    setError(null)
    startTransition(async () => {
      const result = await eliminarTurno(turnoId)
      if (result?.error) { setError(result.error); return }
      router.push('/turnos')
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
      >
        <Trash2 size={13} />
        Eliminar turno
      </button>
    )
  }

  return (
    <div className="bg-red-50 rounded-xl p-5 border border-red-200 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">¿Eliminar este turno?</p>
          <p className="text-xs text-red-600 mt-1">
            Esta acción no se puede deshacer. Solo es posible eliminar turnos que aún no han iniciado y no tienen reportes.
          </p>
        </div>
        <button onClick={() => setOpen(false)} className="text-red-400 hover:text-red-600 ml-auto">
          <X size={16} />
        </button>
      </div>

      {error && <p className="text-xs text-red-700 bg-red-100 px-3 py-2 rounded-lg">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm font-medium border border-red-200 rounded-lg text-red-600 hover:bg-white transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleEliminar}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50"
        >
          <Trash2 size={14} />
          {isPending ? 'Eliminando...' : 'Sí, eliminar'}
        </button>
      </div>
    </div>
  )
}
