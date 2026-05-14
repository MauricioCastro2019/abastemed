'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Clock, User, CalendarDays } from 'lucide-react'
import { toggleIndicacion } from '@/lib/actions/plan-cuidado'
import type { Indicacion } from '@/types'

export const TIPO_LABELS: Record<string, string> = {
  medicamento_oral:        'Medicamento oral',
  aplicacion_medicamento:  'Aplicación',
  curacion:                'Curación',
  signos_vitales:          'Signos vitales',
  terapia:                 'Terapia',
  otra:                    'Otra',
}

export const TIPO_COLORS: Record<string, string> = {
  medicamento_oral:        '#2AABBF',
  aplicacion_medicamento:  '#8B5CF6',
  curacion:                '#F59E0B',
  signos_vitales:          '#10B981',
  terapia:                 '#3B82F6',
  otra:                    '#6B7280',
}

export const FRECUENCIA_LABELS: Record<string, string> = {
  cada_4h:                 'Cada 4 h',
  cada_6h:                 'Cada 6 h',
  cada_8h:                 'Cada 8 h',
  cada_12h:                'Cada 12 h',
  cada_24h:                'Cada 24 h',
  lunes_miercoles_viernes: 'Lun / Mié / Vie',
  una_vez:                 'Una vez',
  segun_necesidad:         'Según necesidad',
}

export const VIA_LABELS: Record<string, string> = {
  oral:          'Oral',
  intravenosa:   'IV',
  intramuscular: 'IM',
  subcutanea:    'SC',
  topica:        'Tópica',
  inhalatoria:   'Inhalatoria',
  sublingual:    'Sublingual',
  nasal:         'Nasal',
  otra:          'Otra vía',
}

interface Props {
  indicacion: Indicacion
  pacienteId: string
}

export function IndicacionCard({ indicacion, pacienteId }: Props) {
  const [isPending, startTransition] = useTransition()
  const color = TIPO_COLORS[indicacion.tipo] ?? '#6B7280'

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleIndicacion(indicacion.id, !indicacion.activa)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(indicacion.activa ? 'Indicación desactivada' : 'Indicación activada')
      }
    })
  }

  // Suppress unused warning — pacienteId available for future link use
  void pacienteId

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      <div className="flex">
        {/* Stripe lateral por tipo */}
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">

              {/* Tipo + nombre + dosis */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: color }}>
                  {TIPO_LABELS[indicacion.tipo]}
                </span>
                <h3 className="text-sm font-semibold truncate" style={{ color: '#1B2B4B' }}>
                  {indicacion.nombre}
                </h3>
                {indicacion.dosis && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {indicacion.dosis}
                  </span>
                )}
                {indicacion.via && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {VIA_LABELS[indicacion.via] ?? indicacion.via}
                  </span>
                )}
              </div>

              {/* Frecuencia + horarios */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={11} />
                  {FRECUENCIA_LABELS[indicacion.frecuencia]}
                </div>
                {indicacion.horarios.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="font-medium">Horarios:</span>
                    <span>{indicacion.horarios.join(' · ')}</span>
                  </div>
                )}
                {indicacion.responsable && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <User size={11} />
                    {indicacion.responsable}
                  </div>
                )}
              </div>

              {/* Fechas */}
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                <CalendarDays size={11} />
                Inicio: {indicacion.fecha_inicio}
                {indicacion.fecha_fin && ` · Fin: ${indicacion.fecha_fin}`}
              </div>

              {/* Notas */}
              {indicacion.notas && (
                <p className="mt-2 text-xs text-gray-400 italic leading-relaxed">
                  {indicacion.notas}
                </p>
              )}
            </div>

            {/* Botón activar/desactivar */}
            <button
              onClick={handleToggle}
              disabled={isPending}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                indicacion.activa
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              }`}>
              {indicacion.activa ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
