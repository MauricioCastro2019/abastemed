'use client'

import { useState, useTransition } from 'react'
import { enviarSolicitudContacto } from '@/lib/actions/familiar-portal'
import { Phone, MessageCircle, Send, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

const TIPOS_SOLICITUD = [
  { value: 'necesito_llamada',      label: 'Necesito una llamada' },
  { value: 'reportar_pago',         label: 'Reportar pago' },
  { value: 'duda_medicamento',      label: 'Duda sobre medicamento' },
  { value: 'confirmar_cita',        label: 'Confirmar cita' },
  { value: 'solicitar_documento',   label: 'Solicitar documento' },
  { value: 'informar_cambio',       label: 'Informar un cambio' },
  { value: 'otro',                  label: 'Otro' },
]

const INPUT = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#2AABBF] focus:ring-2 focus:ring-[#2AABBF]/10 transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-600 mb-1.5"

export default function ContactoPage() {
  const [isPending, startTransition] = useTransition()
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await enviarSolicitudContacto(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setEnviado(true)
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Contacto</h1>
        <p className="text-sm text-gray-500 mt-0.5">Comunícate con el equipo de Abastemed</p>
      </div>

      {/* Canales directos */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="tel:4791054012"
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm text-center hover:shadow-md transition-all"
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#EBF8FB' }}
          >
            <Phone size={20} style={{ color: '#2AABBF' }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>Llamar</p>
            <p className="text-[10px] text-gray-400">479 105 4012</p>
          </div>
        </a>

        <a
          href="https://wa.me/4791054012"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm text-center hover:shadow-md transition-all"
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#F0FDF4' }}
          >
            <MessageCircle size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>WhatsApp</p>
            <p className="text-[10px] text-gray-400">479 105 4012</p>
          </div>
        </a>
      </div>

      {/* Horario */}
      <div className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <Clock size={16} className="text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>Horario de atención</p>
          <p className="text-[10px] text-gray-400">Lunes a viernes 8:00 – 18:00 · Urgencias 24/7</p>
        </div>
      </div>

      {/* Formulario de solicitud */}
      {enviado ? (
        <div className="bg-emerald-50 rounded-2xl p-6 text-center border border-emerald-100">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 mb-1">Mensaje enviado</p>
          <p className="text-xs text-emerald-600">
            Tu solicitud fue recibida. El equipo de Abastemed te responderá a la brevedad.
          </p>
          <button
            onClick={() => setEnviado(false)}
            className="mt-4 text-xs text-emerald-600 underline"
          >
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-gray-50">
            <h2 className="text-sm font-bold" style={{ color: '#1B2B4B' }}>Enviar solicitud</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Deja un mensaje y te contactamos a la brevedad
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className={LABEL}>Tipo de solicitud *</label>
              <select name="tipo" required className={INPUT} defaultValue="">
                <option value="" disabled>Selecciona el motivo</option>
                {TIPOS_SOLICITUD.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL}>Asunto *</label>
              <input
                name="asunto"
                required
                minLength={3}
                maxLength={200}
                className={INPUT}
                placeholder="¿En qué podemos ayudarte?"
              />
            </div>

            <div>
              <label className={LABEL}>Mensaje (opcional)</label>
              <textarea
                name="mensaje"
                rows={4}
                maxLength={2000}
                className={`${INPUT} resize-none`}
                placeholder="Proporciona más detalles si lo deseas..."
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white rounded-xl transition-all"
              style={{ backgroundColor: isPending ? '#94A3B8' : '#2AABBF' }}
            >
              {isPending ? 'Enviando...' : (
                <>
                  <Send size={14} />
                  Enviar solicitud
                </>
              )}
            </button>

            <p className="text-[10px] text-gray-400 text-center">
              También puedes llamar directamente al 479 105 4012
            </p>
          </form>
        </div>
      )}

      {/* Info adicional */}
      <div className="bg-slate-50 rounded-xl p-4">
        <p className="text-xs font-semibold mb-2" style={{ color: '#1B2B4B' }}>¿Urgencia médica?</p>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
          Si tu familiar presenta una emergencia médica (paro cardiaco, convulsiones, dificultad respiratoria severa),
          llama primero al <strong>911</strong> y después informa al equipo de Abastemed.
        </p>
        <a
          href="tel:911"
          className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold text-white rounded-xl"
          style={{ backgroundColor: '#DC2626' }}
        >
          <Phone size={13} />
          Emergencias: 911
        </a>
      </div>
    </div>
  )
}
