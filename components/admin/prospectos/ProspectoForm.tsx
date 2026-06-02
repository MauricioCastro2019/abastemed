'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearProspecto, actualizarProspecto } from '@/lib/actions/prospectos'
import type { Prospect } from '@/types'

interface Props {
  prospect?: Prospect
}

const RELATIONSHIP_OPTIONS = [
  { value: 'hijo_a',       label: 'Hijo/a' },
  { value: 'esposo_a',     label: 'Esposo/a' },
  { value: 'hermano_a',    label: 'Hermano/a' },
  { value: 'nieto_a',      label: 'Nieto/a' },
  { value: 'familiar',     label: 'Familiar' },
  { value: 'tutor',        label: 'Tutor / responsable legal' },
  { value: 'medico',       label: 'Médico' },
  { value: 'trab_social',  label: 'Trabajador social' },
  { value: 'otro',         label: 'Otro' },
]

const SOURCE_OPTIONS = [
  { value: 'whatsapp',          label: 'WhatsApp' },
  { value: 'llamada',           label: 'Llamada' },
  { value: 'recomendacion',     label: 'Recomendación' },
  { value: 'hospital',          label: 'Hospital' },
  { value: 'medico',            label: 'Médico' },
  { value: 'redes_sociales',    label: 'Redes sociales' },
  { value: 'cliente_anterior',  label: 'Cliente anterior' },
  { value: 'otro',              label: 'Otro' },
]

const URGENCY_OPTIONS = [
  { value: 'hoy_mismo',     label: 'Hoy mismo — URGENTE' },
  { value: 'manana',        label: 'Mañana' },
  { value: 'esta_semana',   label: 'Esta semana' },
  { value: 'cotizando',     label: 'Estoy cotizando opciones' },
  { value: 'sin_fecha',     label: 'Aún no tengo fecha definida' },
]

export function ProspectoForm({ prospect }: Props) {
  const router    = useRouter()
  const [pending, startTransition] = useTransition()
  const [error,   setError]   = useState('')
  const [isAuthorizer, setIsAuthorizer] = useState(prospect?.is_authorizer ?? true)
  const [isPayer,      setIsPayer]      = useState(prospect?.is_payer ?? true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('is_authorizer', String(isAuthorizer))
    fd.set('is_payer',      String(isPayer))

    startTransition(async () => {
      if (prospect) {
        const res = await actualizarProspecto(prospect.id, fd)
        if (res.error) { setError(res.error); return }
        router.push(`/prospectos/${prospect.id}`)
      } else {
        const res = await crearProspecto(fd)
        if (res.error) { setError(res.error); return }
        if (res.id) router.push(`/prospectos/${res.id}?success=1`)
      }
    })
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ─── Datos del solicitante ─── */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold mb-5" style={{ color: '#1B2B4B' }}>
          Datos del solicitante
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input name="requester_name" defaultValue={prospect?.requester_name} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Teléfono *</label>
            <input name="requester_phone" defaultValue={prospect?.requester_phone} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>WhatsApp</label>
            <input name="requester_whatsapp" defaultValue={prospect?.requester_whatsapp ?? ''} className={inputCls} placeholder="Si es diferente al teléfono" />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico</label>
            <input name="requester_email" type="email" defaultValue={prospect?.requester_email ?? ''} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Parentesco con el paciente *</label>
            <select name="relationship_to_patient" defaultValue={prospect?.relationship_to_patient ?? ''} required className={inputCls}>
              <option value="">Seleccionar...</option>
              {RELATIONSHIP_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Autorización */}
        <div className="mt-5 p-4 bg-gray-50 rounded-lg space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAuthorizer}
              onChange={e => setIsAuthorizer(e.target.checked)}
              className="w-4 h-4 accent-[#2AABBF]"
            />
            <span className="text-sm text-gray-700">El solicitante es quien autoriza el servicio</span>
          </label>
          {!isAuthorizer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className={labelCls}>Nombre del responsable de autorización</label>
                <input name="authorization_responsible_name" defaultValue={prospect?.authorization_responsible_name ?? ''} className={inputCls} />
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPayer}
              onChange={e => setIsPayer(e.target.checked)}
              className="w-4 h-4 accent-[#2AABBF]"
            />
            <span className="text-sm text-gray-700">El solicitante es quien pagará el servicio</span>
          </label>
          {!isPayer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className={labelCls}>Nombre del responsable de pago</label>
                <input name="payment_responsible_name" defaultValue={prospect?.payment_responsible_name ?? ''} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Teléfono del responsable de pago</label>
                <input name="payment_responsible_phone" defaultValue={prospect?.payment_responsible_phone ?? ''} className={inputCls} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Origen y urgencia ─── */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold mb-5" style={{ color: '#1B2B4B' }}>
          Origen y urgencia
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>¿Por qué medio llegó? *</label>
            <select name="source" defaultValue={prospect?.source ?? ''} required className={inputCls}>
              <option value="">Seleccionar...</option>
              {SOURCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Urgencia del servicio *</label>
            <select name="urgency" defaultValue={prospect?.urgency ?? ''} required className={inputCls}>
              <option value="">Seleccionar...</option>
              {URGENCY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Observaciones iniciales</label>
            <textarea
              name="initial_observations"
              defaultValue={prospect?.initial_observations ?? ''}
              rows={3}
              className={inputCls}
              placeholder="Contexto inicial, preocupaciones de la familia, etc."
            />
          </div>
        </div>
      </section>

      {/* ─── Error + Submit ─── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#2AABBF' }}>
          {pending ? 'Guardando...' : prospect ? 'Actualizar prospecto' : 'Registrar prospecto'}
        </button>
      </div>
    </form>
  )
}
