import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Edit2, Calendar, DollarSign, User, FileText, Tag } from 'lucide-react'
import { getIngreso } from '@/lib/actions/finanzas'
import { Badge } from '@/components/ui/badge'
import { CancelarBtn } from '@/components/admin/finanzas/CancelarBtn'
import {
  TIPO_INGRESO_LABELS,
  ESTATUS_INGRESO_LABELS,
  ESTATUS_INGRESO_COLORS,
  METODO_PAGO_LABELS,
  formatMonto,
  formatFecha,
} from '@/lib/finanzas-labels'

function Row({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {Icon && <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{value}</p>
      </div>
    </div>
  )
}

export default async function IngresoDetallePage({ params }: { params: { id: string } }) {
  let ingreso: Awaited<ReturnType<typeof getIngreso>> | null = null
  try { ingreso = await getIngreso(params.id) } catch { notFound() }
  if (!ingreso) notFound()

  const color     = ESTATUS_INGRESO_COLORS[ingreso.estatus]
  const pendiente = Math.max(0, ingreso.monto_total - ingreso.monto_recibido)
  const pac       = ingreso.paciente as { id: string; nombre: string; apellido: string } | null
  const cas       = ingreso.caso as { id: string; titulo: string } | null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/finanzas/ingresos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{ingreso.folio}</h1>
            <Badge variant="outline" style={{
              borderColor: color.border, color: color.text, backgroundColor: color.bg,
            }}>
              {ESTATUS_INGRESO_LABELS[ingreso.estatus]}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{ingreso.concepto}</p>
        </div>
        {ingreso.estatus !== 'cancelado' && (
          <div className="flex items-center gap-2">
            <Link href={`/finanzas/ingresos/${ingreso.id}/editar`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Edit2 size={14} /> Editar
            </Link>
            <CancelarBtn tipo="ingreso" id={ingreso.id} folio={ingreso.folio} />
          </div>
        )}
      </div>

      {/* Montos — card destacada */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-400 mb-1">Monto total</p>
            <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>${formatMonto(ingreso.monto_total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Recibido</p>
            <p className="text-2xl font-bold" style={{ color: '#059669' }}>${formatMonto(ingreso.monto_recibido)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Pendiente</p>
            <p className="text-2xl font-bold" style={{ color: pendiente > 0 ? '#D97706' : '#059669' }}>
              ${formatMonto(pendiente)}
            </p>
          </div>
        </div>

        {pendiente > 0 && ingreso.estatus !== 'cancelado' && (
          <div className="mt-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (ingreso.monto_recibido / ingreso.monto_total) * 100)}%`,
                  backgroundColor: '#2AABBF',
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">
              {Math.round((ingreso.monto_recibido / ingreso.monto_total) * 100)}% cobrado
            </p>
          </div>
        )}
      </div>

      {/* Datos principales */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-4">Datos del ingreso</h3>
        <Row label="Tipo" value={TIPO_INGRESO_LABELS[ingreso.tipo_ingreso]} icon={Tag} />
        <Row label="Fecha de pago" value={formatFecha(ingreso.fecha_pago)} icon={Calendar} />
        <Row label="Responsable de pago" value={ingreso.responsable_pago_nombre} icon={User} />
        <Row label="Contacto" value={ingreso.responsable_pago_contacto} icon={User} />
        <Row label="Método de pago" value={METODO_PAGO_LABELS[ingreso.metodo_pago]} icon={DollarSign} />
        <Row label="Cuenta receptora" value={ingreso.cuenta_receptora} icon={DollarSign} />
        <Row label="Referencia de pago" value={ingreso.referencia_pago} icon={FileText} />
        {ingreso.periodo_cubierto_inicio && (
          <Row
            label="Periodo cubierto"
            value={`${formatFecha(ingreso.periodo_cubierto_inicio)}${ingreso.periodo_cubierto_fin ? ' — ' + formatFecha(ingreso.periodo_cubierto_fin) : ''}`}
            icon={Calendar}
          />
        )}
        {ingreso.fecha_limite_pago && (
          <Row label="Fecha límite de pago" value={formatFecha(ingreso.fecha_limite_pago)} icon={Calendar} />
        )}
      </div>

      {/* Relaciones */}
      {(pac || cas) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-4">Vinculaciones</h3>
          {pac && (
            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
              <div>
                <p className="text-xs text-gray-400">Paciente</p>
                <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{pac.nombre} {pac.apellido}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/pacientes/${pac.id}`} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Ver paciente
                </Link>
                <Link href={`/finanzas/paciente/${pac.id}`} className="text-xs px-3 py-1.5 rounded-lg border border-[#2AABBF] text-[#2AABBF] hover:bg-[#E0F7FA] transition-colors">
                  Balance
                </Link>
              </div>
            </div>
          )}
          {cas && (
            <div className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-xs text-gray-400">Caso / Servicio</p>
                <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{cas.titulo}</p>
              </div>
              <Link href={`/casos/${cas.id}`} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Ver caso
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Observaciones */}
      {ingreso.observaciones && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-2">Observaciones</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{ingreso.observaciones}</p>
        </div>
      )}

      {/* Cancelación */}
      {ingreso.estatus === 'cancelado' && ingreso.motivo_cancelacion && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-700 mb-1">Ingreso cancelado</p>
          <p className="text-sm text-red-600">{ingreso.motivo_cancelacion}</p>
          {ingreso.fecha_cancelacion && (
            <p className="text-xs text-red-400 mt-1">{formatFecha(ingreso.fecha_cancelacion.split('T')[0])}</p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-300">
        Registrado: {formatFecha(ingreso.created_at.split('T')[0])} · Actualizado: {formatFecha(ingreso.updated_at.split('T')[0])}
      </div>
    </div>
  )
}
