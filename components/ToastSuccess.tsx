'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

const MESSAGES: Record<string, string> = {
  created:  'Creado correctamente',
  updated:  'Actualizado correctamente',
  deleted:  'Eliminado correctamente',
  paid:     'Marcado como pagado',
  approved: 'Aprobado correctamente',
}

export function ToastSuccess() {
  const searchParams = useSearchParams()
  const ok = searchParams.get('ok')

  useEffect(() => {
    if (ok && MESSAGES[ok]) {
      toast.success(MESSAGES[ok])
      const url = new URL(window.location.href)
      url.searchParams.delete('ok')
      window.history.replaceState({}, '', url.toString())
    }
  }, [ok])

  return null
}
