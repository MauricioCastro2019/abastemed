'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Clock } from 'lucide-react'
import { marcarSalidaPagada, marcarSalidaPorComprobar } from '@/lib/actions/finanzas'

interface Props {
  id:     string
  estatus: string
}

export function MarcarSalidaBtn({ id, estatus }: Props) {
  const [isPending, startTransition] = useTransition()

  function handlePagado() {
    startTransition(async () => {
      const result = await marcarSalidaPagada(id)
      if (result?.error) toast.error(result.error)
      else toast.success('Salida marcada como pagada')
    })
  }

  function handleComprobar() {
    startTransition(async () => {
      const result = await marcarSalidaPorComprobar(id)
      if (result?.error) toast.error(result.error)
      else toast.success('Salida marcada por comprobar')
    })
  }

  if (estatus === 'cancelado' || estatus === 'pagado') return null

  return (
    <div className="flex items-center gap-2">
      {estatus !== 'por_comprobar' && (
        <button
          onClick={handleComprobar}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors disabled:opacity-60"
        >
          <Clock size={13} />
          Por comprobar
        </button>
      )}
      <button
        onClick={handlePagado}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border text-green-700 border-green-200 hover:bg-green-50 transition-colors disabled:opacity-60"
      >
        <CheckCircle size={13} />
        Marcar pagado
      </button>
    </div>
  )
}
