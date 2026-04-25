'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { eliminarRecibo } from '@/lib/actions/recibos'
import { Trash2 } from 'lucide-react'

interface Props {
  id: string
}

export function EliminarReciboBtn({ id }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!confirm('¿Eliminar este recibo? Esta acción no se puede deshacer.')) return

    startTransition(async () => {
      try {
        await eliminarRecibo(id)
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
          alert('Error al eliminar: ' + err.message)
        } else {
          router.push('/recibos')
        }
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
    >
      <Trash2 size={16} />
      {isPending ? 'Eliminando...' : 'Eliminar'}
    </button>
  )
}
