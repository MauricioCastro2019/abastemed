'use client'

import { useTransition } from 'react'
import { cambiarStatusTurno } from '@/lib/actions/turnos'

interface Props {
  turnoId: string
  nuevoStatus: 'activo' | 'completado'
  label: string
  className?: string
  style?: React.CSSProperties
}

export function TurnoStatusBtn({ turnoId, nuevoStatus, label, className, style }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (nuevoStatus === 'completado') {
      const ok = window.confirm('¿Marcar este turno como completado? Esta acción generará el cobro automáticamente.')
      if (!ok) return
    }
    startTransition(async () => {
      await cambiarStatusTurno(turnoId, nuevoStatus)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={className}
      style={style}
    >
      {isPending ? '...' : label}
    </button>
  )
}
