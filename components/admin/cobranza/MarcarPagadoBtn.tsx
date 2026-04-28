'use client'

import { useTransition } from 'react'
import { marcarPagado } from '@/lib/actions/cobranza'
import { toast } from 'sonner'

export function MarcarPagadoBtn({ itemId }: { itemId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        await marcarPagado(itemId)
        toast.success('Marcado como pagado')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al marcar pagado')
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all disabled:opacity-50"
      style={{ backgroundColor: isPending ? '#94a3b8' : '#059669' }}
    >
      {isPending ? '...' : 'Marcar pagado'}
    </button>
  )
}
