import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { getBalanceCaso } from '@/lib/actions/finanzas'
import { Badge } from '@/components/ui/badge'
import {
  TIPO_INGRESO_LABELS,
  TIPO_SALIDA_LABELS,
  ESTATUS_INGRESO_LABELS,
  ESTATUS_INGRESO_COLORS,
  ESTATUS_SALIDA_LABELS,
  ESTATUS_SALIDA_COLORS,
  formatMonto,
  formatFecha,
} from '@/lib/finanzas-labels'

export default async function BalanceServicioPage({ params }: { params: { id: string } }) {
  let balance: Awaited<ReturnType<typeof getBalanceCaso>> | null = null
  try { balance = await getBalanceCaso(params.id) } catch { notFound() }
  if (!balance) notFound()

  const { caso, incomes, expenses } = balance
  const pac     = (caso as { paciente?: { id: string; nombre: string; apellido: string } }).paciente
  const positivo = balance.utilidad >= 0

  const activosI    = incomes.filter(i => i.estatus !== 'cancelado')
  const activosE    = expenses.filter(e => e.estatus !== 'cancelado')
  const cancelados  = [...incomes.filter(i => i.estatus === 'cancelado'), ...expenses.filter(e => e.estatus === 'cancelado')]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/finanzas" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
            Balance · {(caso as { titulo: string }).titulo}
          </h1>
          {pac && (
            <p className="text-sm text-gray-500 mt-0.5">
              Paciente: {pac.nombre} {pac.apellido}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/casos/${params.id}`}
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Ver caso
          </Link>
          <Link href={`/finanzas/ingresos/nuevo`}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={14} /> Ingreso
          </Link>
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-5">Resumen del servicio</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Ingresos confirmados</p>
            <p className="text-xl font-bold" style={{ color: '#059669' }}>${formatMonto(balance.ingresosConfirmados)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Por cobrar</p>
            <p className="text-xl font-bold" style={{ color: '#D97706' }}>${formatMonto(balance.totalPorCobrar)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Salidas pagadas</p>
            <p className="text-xl font-bold" style={{ color: '#DC2626' }}>${formatMonto(balance.salidasPagadas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Movimientos</p>
            <p className="text-xl font-bold" style={{ color: '#1B2B4B' }}>{activosI.length + activosE.length}</p>
          </div>
        </div>
        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {positivo
              ? <TrendingUp size={20} style={{ color: '#059669' }} />
              : <TrendingDown size={20} style={{ color: '#DC2626' }} />
            }
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Utilidad estimada</p>
              <p className="text-xs text-gray-400">Margen: {balance.margen.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: positivo ? '#059669' : '#DC2626' }}>
            {positivo ? '' : '-'}${formatMonto(Math.abs(balance.utilidad))}
          </p>
        </div>
      </div>

      {/* Ingresos */}
      <section>
        <h2 className="font-semibold mb-3" style={{ color: '#1B2B4B' }}>Ingresos ({activosI.length})</h2>
        {activosI.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl p-4 shadow-sm">Sin ingresos en este servicio</p>
        ) : (
          <div className="space-y-2">
            {activosI.map(ing => {
              const color     = ESTATUS_INGRESO_COLORS[ing.estatus]
              const pendiente = Math.max(0, ing.monto_total - ing.monto_recibido)
              return (
                <Link key={ing.id} href={`/finanzas/ingresos/${ing.id}`}
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow block">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-xs font-bold" style={{ color: '#2AABBF' }}>{ing.folio}</span>
                      <Badge variant="outline" style={{
                        borderColor: color.border, color: color.text, backgroundColor: color.bg,
                        fontSize: '10px', padding: '1px 6px',
                      }}>
                        {ESTATUS_INGRESO_LABELS[ing.estatus]}
                      </Badge>
                      <span className="text-xs text-gray-400">{TIPO_INGRESO_LABELS[ing.tipo_ingreso]}</span>
                    </div>
                    <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>{ing.concepto}</p>
                    <p className="text-xs text-gray-400">{ing.responsable_pago_nombre} · {formatFecha(ing.fecha_pago)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: '#059669' }}>${formatMonto(ing.monto_recibido)}</p>
                    {pendiente > 0 && <p className="text-xs" style={{ color: '#D97706' }}>-${formatMonto(pendiente)}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Salidas */}
      <section>
        <h2 className="font-semibold mb-3" style={{ color: '#1B2B4B' }}>Salidas ({activosE.length})</h2>
        {activosE.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl p-4 shadow-sm">Sin salidas en este servicio</p>
        ) : (
          <div className="space-y-2">
            {activosE.map(sal => {
              const color = ESTATUS_SALIDA_COLORS[sal.estatus]
              return (
                <Link key={sal.id} href={`/finanzas/salidas/${sal.id}`}
                  className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between gap-3 hover:shadow-md transition-shadow block">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-mono text-xs font-bold" style={{ color: '#2AABBF' }}>{sal.folio}</span>
                      <Badge variant="outline" style={{
                        borderColor: color.border, color: color.text, backgroundColor: color.bg,
                        fontSize: '10px', padding: '1px 6px',
                      }}>
                        {ESTATUS_SALIDA_LABELS[sal.estatus]}
                      </Badge>
                      <span className="text-xs text-gray-400">{TIPO_SALIDA_LABELS[sal.tipo_salida]}</span>
                    </div>
                    <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>{sal.concepto}</p>
                    <p className="text-xs text-gray-400">{sal.beneficiario_nombre} · {formatFecha(sal.fecha_salida)}</p>
                  </div>
                  <p className="font-bold flex-shrink-0" style={{ color: '#DC2626' }}>${formatMonto(sal.monto)}</p>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {cancelados.length > 0 && (
        <details className="bg-gray-50 rounded-xl p-4">
          <summary className="cursor-pointer text-xs font-medium text-gray-400">
            Movimientos cancelados ({cancelados.length})
          </summary>
          <div className="mt-3 space-y-1">
            {cancelados.map(mov => {
              const isIngreso = 'monto_recibido' in mov
              return (
                <Link key={mov.id}
                  href={isIngreso ? `/finanzas/ingresos/${mov.id}` : `/finanzas/salidas/${mov.id}`}
                  className="flex items-center justify-between text-xs text-gray-400 hover:text-gray-600 py-1">
                  <span>{mov.folio} · {mov.concepto}</span>
                  <span className="line-through">
                    ${formatMonto(isIngreso ? (mov as { monto_recibido: number }).monto_recibido : (mov as { monto: number }).monto)}
                  </span>
                </Link>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
