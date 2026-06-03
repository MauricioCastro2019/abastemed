import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Edit2, Calendar, DollarSign, User, FileText } from 'lucide-react'
import { getSalida } from '@/lib/actions/finanzas'
import { Badge } from '@/components/ui/badge'
import { CancelarBtn } from '@/components/admin/finanzas/CancelarBtn'
import { MarcarSalidaBtn } from '@/components/admin/finanzas/MarcarSalidaBtn'
import {
  TIPO_SALIDA_LABELS,
  ESTATUS_SALIDA_LABELS,
  ESTATUS_SALIDA_COLORS,
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

export default async function SalidaDetallePage({ params }: { params: { id: string } }) {
  let salida: Awaited<ReturnType<typeof getSalida>> | null = null
  try { salida = await getSalida(params.id) } catch { notFound() }
  if (!salida) notFound()

  const color = ESTATUS_SALIDA_COLORS[salida.estatus]
  const pac   = salida.paciente as { id: string; nombre: string; apellido: string } | null
  const cas   = salida.caso    as { id: string; titulo: string } | null
  const enf   = salida.enfermero as { id: string; nombre: string; apellido: string } | null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/finanzas/salidas" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{salida.folio}</h1>
            <Badge variant="outline" style={{
              borderColor: color.border, color: color.text, backgroundColor: color.bg,
            }}>
              {ESTATUS_SALIDA_LABELS[salida.estatus]}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{salida.concepto}</p>
        </div>
        {salida.estatus !== 'cancelado' && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <MarcarSalidaBtn id={salida.id} estatus={salida.estatus} />
            <Link href={`/finanzas/salidas/${salida.id}/editar`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Edit2 size={14} /> Editar
            </Link>
            <CancelarBtn tipo="salida" id={salida.id} folio={salida.folio} />
          </div>
        )}
      </div>

      {/* Monto */}
      <div className="bg-white rounded-xl p-6 shadow-sm text-center">
        <p className="text-xs text-gray-400 mb-1">Monto</p>
        <p className="text-4xl font-bold" style={{ color: '#DC2626' }}>${formatMonto(salida.monto)}</p>
        <p className="text-sm text-gray-400 mt-1">{TIPO_SALIDA_LABELS[salida.tipo_salida]}</p>
      </div>

      {/* Datos */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-4">Datos de la salida</h3>
        <Row label="Fecha" value={formatFecha(salida.fecha_salida)} icon={Calendar} />
        <Row label="Beneficiario" value={salida.beneficiario_nombre} icon={User} />
        <Row label="Contacto" value={salida.beneficiario_contacto} icon={User} />
        <Row label="Método de pago" value={METODO_PAGO_LABELS[salida.metodo_pago]} icon={DollarSign} />
        <Row label="Cuenta de origen" value={salida.cuenta_origen} icon={DollarSign} />
        <Row label="Referencia de pago" value={salida.referencia_pago} icon={FileText} />
      </div>

      {/* Relaciones */}
      {(enf || pac || cas) && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-4">Vinculaciones</h3>
          {enf && (
            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
              <div>
                <p className="text-xs text-gray-400">Enfermero/a</p>
                <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{enf.nombre} {enf.apellido}</p>
              </div>
              <Link href={`/enfermeros/${enf.id}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Ver perfil
              </Link>
            </div>
          )}
          {pac && (
            <div className="flex items-center justify-between py-2.5 border-b border-gray-50">
              <div>
                <p className="text-xs text-gray-400">Paciente</p>
                <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{pac.nombre} {pac.apellido}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/pacientes/${pac.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Ver paciente
                </Link>
                <Link href={`/finanzas/paciente/${pac.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#2AABBF] text-[#2AABBF] hover:bg-[#E0F7FA] transition-colors">
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
              <Link href={`/casos/${cas.id}`}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Ver caso
              </Link>
            </div>
          )}
        </div>
      )}

      {salida.observaciones && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-2">Observaciones</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{salida.observaciones}</p>
        </div>
      )}

      {salida.estatus === 'cancelado' && salida.motivo_cancelacion && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-5">
          <p className="text-sm font-semibold text-red-700 mb-1">Salida cancelada</p>
          <p className="text-sm text-red-600">{salida.motivo_cancelacion}</p>
          {salida.fecha_cancelacion && (
            <p className="text-xs text-red-400 mt-1">{formatFecha(salida.fecha_cancelacion.split('T')[0])}</p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-300">
        Registrado: {formatFecha(salida.created_at.split('T')[0])} · Actualizado: {formatFecha(salida.updated_at.split('T')[0])}
      </div>
    </div>
  )
}
