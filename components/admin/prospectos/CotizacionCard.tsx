'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { actualizarPrecioFinal, aceptarCotizacion } from '@/lib/actions/cotizacion'
import type { CareQuote, QuoteAdjustment, AssessmentResult, ServiceRequest } from '@/types'

interface Props {
  quote: CareQuote
  adjustments: QuoteAdjustment[]
  result: AssessmentResult
  serviceRequest: ServiceRequest
  prospectId: string
  isAdmin: boolean
}

const PROFILE_LABELS: Record<string, string> = {
  cuidador:               'Cuidador / acompañante',
  auxiliar:               'Auxiliar / cuidador experimentado',
  enfermero_general:      'Enfermero general',
  enfermero_especializado:'Enfermero especializado',
}

const ADJ_TYPE_LABELS: Record<string, string> = {
  complejidad_fisica:  'Complejidad física',
  complejidad_clinica: 'Complejidad clínica',
  riesgo_operativo:    'Riesgo operativo',
  horario:             'Ajuste por horario',
  urgencia:            'Ajuste por urgencia',
  ubicacion:           'Ajuste por ubicación',
  reporte:             'Tipo de reporte',
  supervision:         'Supervisión',
  medicamentos:        'Control de medicamentos',
  insumos:             'Gestión de insumos',
  descuento:           'Descuento',
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function CotizacionCard({ quote, adjustments, result, serviceRequest, prospectId, isAdmin }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [editPrice, setEditPrice]   = useState(false)
  const [finalPrice, setFinalPrice] = useState(Number(quote.final_price ?? quote.suggested_price))
  const [reason, setReason]         = useState(quote.adjustment_reason ?? '')

  // Aceptación admin
  const [notaAceptacion, setNotaAceptacion] = useState('')
  const [acceptPending, startAcceptTransition] = useTransition()
  const [acceptError, setAcceptError] = useState('')

  const yaAceptada = quote.status === 'aceptada'

  function handleAceptar() {
    setAcceptError('')
    startAcceptTransition(async () => {
      const res = await aceptarCotizacion(quote.id, prospectId, notaAceptacion)
      if (res.error) { setAcceptError(res.error); return }
      router.refresh()
    })
  }

  const isBelowMinimum = finalPrice < Number(quote.minimum_recommended_price)

  function handleSavePrice() {
    setError('')
    setSuccess('')
    if (isBelowMinimum && !reason.trim()) {
      setError('El motivo de ajuste es obligatorio cuando el precio está por debajo del mínimo recomendado.')
      return
    }
    const fd = new FormData()
    fd.set('final_price', String(finalPrice))
    fd.set('adjustment_reason', reason)

    startTransition(async () => {
      const res = await actualizarPrecioFinal(quote.id, prospectId, fd)
      if (res.error) { setError(res.error); return }
      setSuccess('Precio guardado correctamente.')
      setEditPrice(false)
    })
  }

  return (
    <div className="space-y-5">

      {/* Encabezado */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Perfil asignado</p>
            <p className="text-base font-semibold" style={{ color: '#1B2B4B' }}>
              {PROFILE_LABELS[result.recommended_profile] ?? result.recommended_profile}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Guardia de {serviceRequest.shift_duration_hours ?? 8} horas — {serviceRequest.shift_schedule ?? ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Precio sugerido</p>
            <p className="text-4xl font-bold" style={{ color: '#2AABBF' }}>{fmt(Number(quote.suggested_price))}</p>
            <p className="text-xs text-gray-400">por guardia</p>
          </div>
        </div>
      </div>

      {/* Desglose */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Desglose de cotización</h3>
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tarifa base ({PROFILE_LABELS[result.recommended_profile]}, {serviceRequest.shift_duration_hours ?? 8}h)</span>
            <span className="font-medium">{fmt(Number(quote.base_rate))}</span>
          </div>

          {adjustments.map((adj, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-500">
                {ADJ_TYPE_LABELS[adj.adjustment_type] ?? adj.adjustment_type}
                {adj.percentage ? <span className="text-xs ml-1 text-gray-400">(+{(adj.percentage * 100).toFixed(0)}%)</span> : null}
              </span>
              <span className="text-orange-600 font-medium">+{fmt(Number(adj.calculated_amount))}</span>
            </div>
          ))}

          <div className="border-t border-gray-100 pt-2.5 flex justify-between text-sm">
            <span className="text-gray-600">Precio calculado</span>
            <span className="font-medium">{fmt(Number(quote.calculated_price))}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span style={{ color: '#1B2B4B' }}>Precio sugerido (redondeado)</span>
            <span style={{ color: '#2AABBF' }}>{fmt(Number(quote.suggested_price))}</span>
          </div>
          {isAdmin && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>Precio mínimo recomendado</span>
              <span>{fmt(Number(quote.minimum_recommended_price))}</span>
            </div>
          )}
        </div>
      </div>

      {/* Precio final editable */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Precio final</h3>
            {!editPrice && (
              <button
                onClick={() => setEditPrice(true)}
                className="text-xs text-[#2AABBF] hover:underline">
                Editar
              </button>
            )}
          </div>

          {editPrice ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio final ($)</label>
                <input
                  type="number"
                  value={finalPrice}
                  onChange={e => setFinalPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF]"
                />
                {isBelowMinimum && (
                  <p className="mt-1 text-xs text-orange-600">
                    ⚠ Precio por debajo del mínimo ({fmt(Number(quote.minimum_recommended_price))}). Motivo de ajuste obligatorio.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de ajuste</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF]"
                  placeholder="Cliente habitual, acuerdo comercial, etc."
                />
              </div>
              {error   && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <div className="flex gap-2">
                <button onClick={handleSavePrice} disabled={pending}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: '#2AABBF' }}>
                  {pending ? 'Guardando...' : 'Guardar precio'}
                </button>
                <button onClick={() => { setEditPrice(false); setFinalPrice(Number(quote.final_price ?? quote.suggested_price)) }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-3xl font-bold" style={{ color: '#1B2B4B' }}>{fmt(Number(quote.final_price ?? quote.suggested_price))}</p>
              {quote.adjustment_reason && (
                <p className="text-sm text-gray-500 mt-1">Motivo: {quote.adjustment_reason}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Anticipo y condiciones */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Condiciones de pago</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Anticipo requerido</span>
            <span className="font-semibold text-gray-800">{fmt(Number(quote.deposit_required ?? quote.final_price ?? quote.suggested_price))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Vigencia de cotización</span>
            <span className="text-gray-700">{quote.quote_valid_until ? new Date(quote.quote_valid_until + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '3 días'}</span>
          </div>
          {quote.payment_terms && (
            <div className="flex justify-between">
              <span className="text-gray-600">Condiciones</span>
              <span className="text-gray-700">{quote.payment_terms}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Aceptación admin ───────────────────────────────────── */}
      {isAdmin && (
        <div className={`rounded-xl shadow-sm p-6 border-2 ${yaAceptada ? 'bg-green-50 border-green-200' : 'bg-white border-dashed border-gray-200'}`}>
          {yaAceptada ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-700">Cotización aceptada</p>
                <p className="text-sm text-green-600 mt-0.5">
                  Esta cotización fue aceptada y el prospecto está listo para levantamiento.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                  Aceptar cotización (Admin)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Úsalo cuando la familia confirmó verbalmente o por WhatsApp sin una cuenta en el sistema.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nota de aceptación (opcional)
                </label>
                <input
                  type="text"
                  value={notaAceptacion}
                  onChange={e => setNotaAceptacion(e.target.value)}
                  placeholder="Ej: Familia confirmó por WhatsApp el 16-jun"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white"
                />
              </div>
              {acceptError && (
                <p className="text-sm text-red-600">{acceptError}</p>
              )}
              <button
                onClick={handleAceptar}
                disabled={acceptPending}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition-all"
                style={{ backgroundColor: '#166534' }}
              >
                {acceptPending
                  ? <><Loader2 size={15} className="animate-spin" /> Aceptando…</>
                  : <><CheckCircle2 size={15} /> Marcar como aceptada</>
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
