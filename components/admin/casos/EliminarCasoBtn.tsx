'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { eliminarCaso } from '@/lib/actions/casos'

export function EliminarCasoBtn({ casoId, titulo }: { casoId: string; titulo: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm(`¿Eliminar el caso "${titulo}"? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      try {
        await eliminarCaso(casoId)
        window.location.href = '/casos'
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50"
    >
      <Trash2 size={14} />
      {isPending ? 'Eliminando...' : 'Eliminar caso'}
    </button>
  )
}
