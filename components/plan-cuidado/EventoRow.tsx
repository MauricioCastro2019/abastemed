'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { actualizarStatusEvento } from '@/lib/actions/plan-cuidado'
import type { EventoIndicacion, StatusEvento } from '@/types'

const STATUS_CONFIG: Record<StatusEvento, { label: string; bg: string; text: string }> = {
  pendiente:    { label: 'Pendiente',    bg: '#FEF3C7', text: '#D97706' },
  confirmado:   { label: 'Confirmado',   bg: '#D1FAE5', text: '#059669' },
  omitido:      { label: 'Omitido',      bg: '#F3F4F6', text: '#4B5563' },
  reprogramado: { label: 'Reprogramado', bg: '#EDE9FE', text: '#7C3AED' },
  cancelado:    { label: 'Cancelado',    bg: '#FEE2E2', text: '#B91C1C' },
}

const TIPO_EMOJI: Record<string, string> = {
  medicamento_oral:       '💊',
  aplicacion_medicamento: '💉',
  curacion:               '🩹',
  signos_vitales:         '🩺',
  terapia:                '🏃',
  otra:                   '📋',
}

interface Props {
  evento: EventoIndicacion
}

export function EventoRow({ evento }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showOmitir, setShowOmitir] = useState(false)
  const [notas, setNotas] = useState('')

  const cfg = STATUS_CONFIG[evento.status] ?? STATUS_CONFIG.pendiente
  const ind  = evento.indicacion

  const hora = new Date(evento.fecha_hora_programada).toLocaleTimeString('es-MX', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City',
  })

  function doUpdate(status: 'confirmado' | 'omitido' | 'reprogramado' | 'cancelado', extra?: string) {
    startTransition(async () => {
      const result = await actualizarStatusEvento(evento.id, status, extra || notas || undefined)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Evento marcado como ${STATUS_CONFIG[status].label.toLowerCase()}`)
        setShowOmitir(false)
        setNotas('')
      }
    })
  }

  return (
    <div className={`px-5 py-3 transition-opacity ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-start gap-3">

        {/* Hora */}
        <div className="flex-shrink-0 w-12 text-center pt-0.5">
          <p className="text-sm font-bold tabular-nums" style={{ color: '#1B2B4B' }}>
            {hora}
          </p>
        </div>

        {/* Emoji tipo */}
        <div className="flex-shrink-0 text-lg leading-none mt-0.5">
          {TIPO_EMOJI[ind?.tipo ?? 'otra']}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-800">{ind?.nombre}</p>
            {ind?.dosis && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {ind.dosis}
              </span>
            )}
            {ind?.via && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {ind.via}
              </span>
            )}
          </div>

          {ind?.responsable && (
            <p className="text-xs text-gray-400 mt-0.5">Resp: {ind.responsable}</p>
          )}

          {evento.notas && (
            <p className="text-xs text-gray-400 italic mt-0.5">{evento.notas}</p>
          )}

          {/* Panel de omisión con nota */}
          {showOmitir && (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Motivo de omisión (opcional)"
                className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2AABBF]"
              />
              <button
                onClick={() => doUpdate('omitido')}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                Omitir
              </button>
              <button
                onClick={() => { setShowOmitir(false); setNotas('') }}
                className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600">
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Badge de estado + acciones */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: cfg.bg, color: cfg.text }}>
            {cfg.label}
          </span>

          {evento.status === 'pendiente' && !showOmitir && (
            <>
              <button
                onClick={() => doUpdate('confirmado')}
                title="Confirmar"
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                <Check size={14} />
              </button>
              <button
                onClick={() => setShowOmitir(true)}
                title="Omitir"
                className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors">
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
