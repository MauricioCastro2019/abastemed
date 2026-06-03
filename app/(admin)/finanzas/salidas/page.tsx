import Link from 'next/link'
import { getSalidas } from '@/lib/actions/finanzas'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import { Plus, TrendingDown, Search } from 'lucide-react'
import {
  TIPO_SALIDA_LABELS,
  ESTATUS_SALIDA_LABELS,
  ESTATUS_SALIDA_COLORS,
  METODO_PAGO_LABELS,
  formatMonto,
  formatFecha,
} from '@/lib/finanzas-labels'
import { MarcarSalidaBtn } from '@/components/admin/finanzas/MarcarSalidaBtn'

export default async function SalidasPage({
  searchParams,
}: {
  searchParams: { q?: string; estatus?: string; tipo?: string }
}) {
  const q       = searchParams.q?.trim()
  const estatus = searchParams.estatus
  const tipo    = searchParams.tipo

  let salidas: Awaited<ReturnType<typeof getSalidas>> = []
  try {
    salidas = await getSalidas({ q, estatus, tipo_salida: tipo })
  } catch { /* sin datos */ }

  const activas       = salidas.filter(s => s.estatus !== 'cancelado')
  const totalPagado   = activas.filter(s => s.estatus === 'pagado' || s.estatus === 'por_comprobar').reduce((s, e) => s + e.monto, 0)
  const totalPendiente = activas.filter(s => s.estatus === 'pendiente' || s.estatus === 'en_revision').reduce((s, e) => s + e.monto, 0)

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Salidas</h1>
          <p className="text-sm text-gray-500 mt-1">Gastos, pagos a personal y egresos</p>
        </div>
        <Link href="/finanzas/salidas/nueva"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={15} /> Nueva salida
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total pagado</p>
          <p className="text-lg font-bold mt-1" style={{ color: '#DC2626' }}>${formatMonto(totalPagado)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Pendiente de pago</p>
          <p className="text-lg font-bold mt-1" style={{ color: '#D97706' }}>${formatMonto(totalPendiente)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500">Total movimientos</p>
          <p className="text-lg font-bold mt-1" style={{ color: '#1B2B4B' }}>{salidas.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 items-center bg-white rounded-xl p-4 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar folio, concepto, beneficiario..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/40"
          />
        </div>
        <select name="estatus" defaultValue={estatus ?? ''} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Todos los estatus</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagado">Pagado</option>
          <option value="por_comprobar">Por comprobar</option>
          <option value="cancelado">Cancelado</option>
          <option value="en_revision">En revisión</option>
        </select>
        <select name="tipo" defaultValue={tipo ?? ''} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_SALIDA_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button type="submit" className="px-3 py-2 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: '#2AABBF' }}>
          Filtrar
        </button>
        {(q || estatus || tipo) && (
          <Link href="/finanzas/salidas" className="text-xs text-gray-400 hover:text-gray-600">Limpiar</Link>
        )}
      </form>

      {salidas.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <TrendingDown size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-400">Sin salidas registradas</p>
          <p className="text-xs text-gray-300 mt-1">Registra la primera salida con el botón superior</p>
        </div>
      ) : (
        <div className="space-y-2">
          {salidas.map(sal => {
            const color = ESTATUS_SALIDA_COLORS[sal.estatus]
            const pac   = sal.paciente as { nombre: string; apellido: string } | null
            const enf   = sal.enfermero as { nombre: string; apellido: string } | null
            return (
              <div key={sal.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link href={`/finanzas/salidas/${sal.id}`}
                        className="font-mono text-xs font-bold hover:underline" style={{ color: '#2AABBF' }}>
                        {sal.folio}
                      </Link>
                      <Badge variant="outline" style={{
                        borderColor: color.border, color: color.text, backgroundColor: color.bg,
                        fontSize: '10px', padding: '1px 6px',
                      }}>
                        {ESTATUS_SALIDA_LABELS[sal.estatus]}
                      </Badge>
                      <span className="text-xs text-gray-400">{TIPO_SALIDA_LABELS[sal.tipo_salida]}</span>
                    </div>
                    <Link href={`/finanzas/salidas/${sal.id}`}>
                      <p className="text-sm font-medium truncate hover:underline" style={{ color: '#1B2B4B' }}>{sal.concepto}</p>
                    </Link>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400">{sal.beneficiario_nombre}</span>
                      {enf && <span className="text-xs text-gray-400">· {enf.nombre} {enf.apellido}</span>}
                      {pac && <span className="text-xs text-gray-400">· {pac.nombre} {pac.apellido}</span>}
                      <span className="text-xs text-gray-400">· {METODO_PAGO_LABELS[sal.metodo_pago]}</span>
                      <span className="text-xs text-gray-400">· {formatFecha(sal.fecha_salida)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-2">
                    <p className="font-bold text-base" style={{ color: '#DC2626' }}>${formatMonto(sal.monto)}</p>
                    <MarcarSalidaBtn id={sal.id} estatus={sal.estatus} />
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
