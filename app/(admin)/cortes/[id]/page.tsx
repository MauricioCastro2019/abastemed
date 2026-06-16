import { getPayrollPeriod, getResumenPorEnfermero } from '@/lib/actions/payroll'
import { requireAuth } from '@/lib/actions/utils'
import { notFound } from 'next/navigation'
import CorteDetalleClient from './CorteDetalleClient'

interface Props {
  params: { id: string }
}

export default async function CorteDetallePage({ params }: Props) {
  const { perfil } = await requireAuth()
  if (!['admin', 'jefe_enfermeros'].includes(perfil.rol)) {
    return <div className="p-8 text-red-600">Acceso no autorizado.</div>
  }

  const [periodo, resumen] = await Promise.all([
    getPayrollPeriod(params.id),
    getResumenPorEnfermero(params.id),
  ])

  if (!periodo) notFound()

  return (
    <CorteDetalleClient
      periodo={periodo}
      resumen={resumen}
      rol={perfil.rol}
    />
  )
}
