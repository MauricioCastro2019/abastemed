'use client'

import { useTransition } from 'react'
import { marcarReciboPagado } from '@/lib/actions/recibos'
import { CheckCircle } from 'lucide-react'

interface Props {
  reciboId: string
  folio: string
}

export function MarcarPagadoBtn({ reciboId, folio }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const ok = window.confirm(`¿Marcar el recibo ${folio} como pagado? Se creará un ingreso en finanzas automáticamente.`)
    if (!ok) return
    startTransition(async () => {
      const res = await marcarReciboPagado(reciboId)
      if (res?.error) alert(res.error)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title="Marcar como pagado"
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
      style={{ backgroundColor: '#EAFAF5', color: '#178C93', border: '1px solid #b2e8df' }}
    >
      <CheckCircle size={13} />
      {isPending ? '...' : 'Pagar'}
    </button>
  )
}
