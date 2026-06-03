import Link from 'next/link'
import { getCuentasPorCobrar } from '@/lib/actions/finanzas'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import { AlertCircle, Plus } from 'lucide-react'
import {
  TIPO_INGRESO_LABELS,
  ESTATUS_INGRESO_COLORS,
  ESTATUS_INGRESO_LABELS,
  formatMonto,
  formatFecha,
} from '@/lib/finanzas-labels'

export default async function CuentasPorCobrarPage() {
  let items: Awaited<ReturnType<typeof getCuentasPorCobrar>> = []
  try { items = await getCuentasPorCobrar() } catch { /* sin datos */ }

  const hoy     = new Date().toISOString().split('T')[0]
  const totalPC = items.reduce((s, i) => s + Math.max(0, i.monto_total - i.monto_recibido), 0)
  const vencidos = items.filter(i => i.fecha_limite_pago && i.fecha_limite_pago < hoy)

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Cuentas por cobrar</h1>
          <p className="text-sm text-gray-500 mt-1">Adeudos pendientes de pacientes y familias</p>
        </div>
        <Link href="/finanzas/ingresos/nuevo"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={15} /> Registrar pago
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total por cobrar</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#D97706' }}>${formatMonto(totalPC)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Pendientes</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#1B2B4B' }}>{items.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Vencidos</p>
          <p className="text-xl font-bold mt-1" style={{ color: vencidos.length > 0 ? '#DC2626' : '#059669' }}>
            {vencidos.length}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <AlertCircle size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-400">Sin cuentas por cobrar</p>
          <p className="text-xs text-gray-300 mt-1">Todos los pagos están al día</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const pendiente   = Math.max(0, item.monto_total - item.monto_recibido)
            const vencido     = item.fecha_limite_pago && item.fecha_limite_pago < hoy
            const diasAtraso  = vencido && item.fecha_limite_pago
              ? Math.floor((new Date(hoy).getTime() - new Date(item.fecha_limite_pago).getTime()) / 86_400_000)
              : 0
            const pac = item.paciente as { id: string; nombre: string; apellido: string } | null
            const color = ESTATUS_INGRESO_COLORS[item.estatus]

            return (
              <div key={item.id}
                className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${vencido ? 'border-l-red-400' : 'border-l-yellow-400'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link href={`/finanzas/ingresos/${item.id}`}
                        className="font-mono text-xs font-bold hover:underline" style={{ color: '#2AABBF' }}>
                        {item.folio}
                      </Link>
                      <Badge variant="outline" style={{
                        borderColor: color.border, color: color.text, backgroundColor: color.bg,
                        fontSize: '10px', padding: '1px 6px',
                      }}>
                        {ESTATUS_INGRESO_LABELS[item.estatus]}
                      </Badge>
                      {vencido && (
                        <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          {diasAtraso}d vencido
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{TIPO_INGRESO_LABELS[item.tipo_ingreso]}</span>
                    </div>
                    <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>{item.concepto}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                      <span>{item.responsable_pago_nombre}</span>
                      {pac && <span>· {pac.nombre} {pac.apellido}</span>}
                      {item.fecha_limite_pago && (
                        <span>· Límite: {formatFecha(item.fecha_limite_pago)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="font-bold" style={{ color: '#D97706' }}>${formatMonto(pendiente)}</p>
                    <p className="text-xs text-gray-400">de ${formatMonto(item.monto_total)}</p>
                    <div className="flex gap-2 justify-end">
                      {pac && (
                        <Link href={`/finanzas/paciente/${pac.id}`}
                          className="text-xs px-2 py-1 rounded border border-[#2AABBF] text-[#2AABBF] hover:bg-[#E0F7FA] transition-colors">
                          Balance
                        </Link>
                      )}
                      <Link href={`/finanzas/ingresos/nuevo`}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        + Pago
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
