import Link from 'next/link'
import { getIngresos } from '@/lib/actions/finanzas'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import { Plus, TrendingUp, Search } from 'lucide-react'
import {
  TIPO_INGRESO_LABELS,
  ESTATUS_INGRESO_LABELS,
  ESTATUS_INGRESO_COLORS,
  METODO_PAGO_LABELS,
  formatMonto,
  formatFecha,
} from '@/lib/finanzas-labels'

export default async function IngresosPage({
  searchParams,
}: {
  searchParams: { q?: string; estatus?: string; tipo?: string }
}) {
  const q       = searchParams.q?.trim()
  const estatus = searchParams.estatus
  const tipo    = searchParams.tipo

  let ingresos: Awaited<ReturnType<typeof getIngresos>> = []
  try {
    ingresos = await getIngresos({ q, estatus, tipo_ingreso: tipo })
  } catch { /* sin datos */ }

  const activos    = ingresos.filter(i => i.estatus !== 'cancelado')
  const totalRecib = activos.reduce((s, i) => s + i.monto_recibido, 0)
  const totalPend  = activos.reduce((s, i) => s + Math.max(0, i.monto_total - i.monto_recibido), 0)

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Ingresos</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de todos los pagos recibidos</p>
        </div>
        <Link href="/finanzas/ingresos/nuevo"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={15} /> Nuevo ingreso
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total recibido</p>
          <p className="text-lg font-bold mt-1" style={{ color: '#059669' }}>${formatMonto(totalRecib)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500">Pendiente por cobrar</p>
          <p className="text-lg font-bold mt-1" style={{ color: '#D97706' }}>${formatMonto(totalPend)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500">Total movimientos</p>
          <p className="text-lg font-bold mt-1" style={{ color: '#1B2B4B' }}>{ingresos.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 items-center bg-white rounded-xl p-4 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar folio, concepto, responsable..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/40"
          />
        </div>
        <select name="estatus" defaultValue={estatus ?? ''} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Todos los estatus</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Parcial</option>
          <option value="confirmado">Confirmado</option>
          <option value="cancelado">Cancelado</option>
          <option value="en_revision">En revisión</option>
        </select>
        <select name="tipo" defaultValue={tipo ?? ''} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_INGRESO_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button type="submit" className="px-3 py-2 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: '#2AABBF' }}>
          Filtrar
        </button>
        {(q || estatus || tipo) && (
          <Link href="/finanzas/ingresos" className="text-xs text-gray-400 hover:text-gray-600">Limpiar</Link>
        )}
      </form>

      {/* Lista */}
      {ingresos.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <TrendingUp size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-400">Sin ingresos registrados</p>
          <p className="text-xs text-gray-300 mt-1">Registra el primer ingreso con el botón superior</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ingresos.map(ing => {
            const color   = ESTATUS_INGRESO_COLORS[ing.estatus]
            const pendiente = Math.max(0, ing.monto_total - ing.monto_recibido)
            const pac  = ing.paciente as { nombre: string; apellido: string } | null
            return (
              <Link key={ing.id} href={`/finanzas/ingresos/${ing.id}`}
                className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between gap-3 hover:shadow-md transition-shadow block">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400">{ing.responsable_pago_nombre}</span>
                    {pac && <span className="text-xs text-gray-400">· {pac.nombre} {pac.apellido}</span>}
                    <span className="text-xs text-gray-400">· {METODO_PAGO_LABELS[ing.metodo_pago]}</span>
                    <span className="text-xs text-gray-400">· {formatFecha(ing.fecha_pago)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-base" style={{ color: '#1B2B4B' }}>${formatMonto(ing.monto_recibido)}</p>
                  {pendiente > 0 && (
                    <p className="text-xs" style={{ color: '#D97706' }}>−${formatMonto(pendiente)} pendiente</p>
                  )}
                  <p className="text-xs text-gray-400">de ${formatMonto(ing.monto_total)}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
