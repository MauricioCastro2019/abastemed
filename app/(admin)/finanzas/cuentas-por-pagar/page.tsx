import Link from 'next/link'
import { getCuentasPorPagar } from '@/lib/actions/finanzas'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import { DollarSign, Plus } from 'lucide-react'
import {
  TIPO_SALIDA_LABELS,
  ESTATUS_SALIDA_COLORS,
  ESTATUS_SALIDA_LABELS,
  formatMonto,
  formatFecha,
} from '@/lib/finanzas-labels'
import { MarcarSalidaBtn } from '@/components/admin/finanzas/MarcarSalidaBtn'

export default async function CuentasPorPagarPage() {
  let items: Awaited<ReturnType<typeof getCuentasPorPagar>> = []
  try { items = await getCuentasPorPagar() } catch { /* sin datos */ }

  const totalPP  = items.filter(i => i.estatus === 'pendiente').reduce((s, e) => s + e.monto, 0)
  const totalCPC = items.filter(i => i.estatus === 'por_comprobar').reduce((s, e) => s + e.monto, 0)

  const personal = items.filter(i =>
    ['pago_enfermero', 'pago_jefe_enfermeria', 'pago_coordinador'].includes(i.tipo_salida)
  )
  const otros = items.filter(i =>
    !['pago_enfermero', 'pago_jefe_enfermeria', 'pago_coordinador'].includes(i.tipo_salida)
  )

  function Group({ title, list }: { title: string; list: typeof items }) {
    if (list.length === 0) return null
    return (
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h2>
        {list.map(item => {
          const color = ESTATUS_SALIDA_COLORS[item.estatus]
          const pac   = item.paciente as { id: string; nombre: string; apellido: string } | null
          const enf   = item.enfermero as { id: string; nombre: string; apellido: string } | null
          return (
            <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link href={`/finanzas/salidas/${item.id}`}
                      className="font-mono text-xs font-bold hover:underline" style={{ color: '#2AABBF' }}>
                      {item.folio}
                    </Link>
                    <Badge variant="outline" style={{
                      borderColor: color.border, color: color.text, backgroundColor: color.bg,
                      fontSize: '10px', padding: '1px 6px',
                    }}>
                      {ESTATUS_SALIDA_LABELS[item.estatus]}
                    </Badge>
                    <span className="text-xs text-gray-400">{TIPO_SALIDA_LABELS[item.tipo_salida]}</span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>{item.concepto}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                    <span>{item.beneficiario_nombre}</span>
                    {enf && <span>· {enf.nombre} {enf.apellido}</span>}
                    {pac && <span>· {pac.nombre} {pac.apellido}</span>}
                    <span>· {formatFecha(item.fecha_salida)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-2">
                  <p className="font-bold text-base" style={{ color: '#DC2626' }}>${formatMonto(item.monto)}</p>
                  <MarcarSalidaBtn id={item.id} estatus={item.estatus} />
                </div>
              </div>
            </div>
          )
        })}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Cuentas por pagar</h1>
          <p className="text-sm text-gray-500 mt-1">Pagos pendientes a personal, proveedores y gastos por comprobar</p>
        </div>
        <Link href="/finanzas/salidas/nueva"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={15} /> Nueva salida
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Por pagar</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#DC2626' }}>${formatMonto(totalPP)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Por comprobar</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#EA580C' }}>${formatMonto(totalCPC)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total pendiente</p>
          <p className="text-xl font-bold mt-1" style={{ color: '#1B2B4B' }}>{items.length} mov.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <DollarSign size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-400">Sin cuentas por pagar</p>
          <p className="text-xs text-gray-300 mt-1">Todos los pagos están al día</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Group title="Pagos a personal" list={personal} />
          <Group title="Gastos y otros pagos" list={otros} />
        </div>
      )}
    </div>
  )
}
