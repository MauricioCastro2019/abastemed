'use client'

import { useTransition } from 'react'
import { aprobarEnfermero } from '@/lib/actions/enfermeros'

export function AprobarBtn({ enfermeroId }: { enfermeroId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => aprobarEnfermero(enfermeroId))}
      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-50"
      style={{ backgroundColor: '#059669' }}
    >
      {isPending ? '...' : 'Aprobar'}
    </button>
  )
}
