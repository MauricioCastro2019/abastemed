'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { marcarLeida, marcarTodasLeidas } from '@/lib/actions/notificaciones'
import {
  Bell, BellOff, CheckCheck, Users, Calendar, AlertTriangle,
  Heart, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import type { Notificacion } from '@/types'

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  nueva_asignacion:     { label: 'Nueva asignación',    color: '#6366F1', bg: '#EEF2FF', icon: Users },
  asignacion_finalizada:{ label: 'Asignación finalizada',color: '#6b7280', bg: '#F3F4F6', icon: Users },
  guardia_programada:   { label: 'Guardia programada',   color: '#2AABBF', bg: '#ECFEFF', icon: Calendar },
  guardia_cancelada:    { label: 'Guardia cancelada',    color: '#dc2626', bg: '#FEF2F2', icon: Calendar },
  plan_cuidado:         { label: 'Plan de cuidado',      color: '#059669', bg: '#ECFDF5', icon: Heart },
  alerta:               { label: 'Alerta',               color: '#d97706', bg: '#FEF3C7', icon: AlertTriangle },
}

function getTipoConfig(tipo: string) {
  return TIPO_CONFIG[tipo] ?? {
    label: 'Notificación', color: '#6b7280', bg: '#F3F4F6', icon: Bell,
  }
}

function formatTiempo(created_at: string) {
  const diff = Date.now() - new Date(created_at).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `Hace ${d} día${d !== 1 ? 's' : ''}`
  return new Date(created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

interface Props {
  notificaciones: Notificacion[]
}

export function NotificacionesClient({ notificaciones }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [soloNoLeidas, setSoloNoLeidas] = useState(false)

  const mostrar = soloNoLeidas ? notificaciones.filter(n => !n.leida) : notificaciones
  const noLeidasCount = notificaciones.filter(n => !n.leida).length

  function handleMarcarLeida(id: string) {
    startTransition(async () => {
      await marcarLeida(id)
      router.refresh()
    })
  }

  function handleMarcarTodas() {
    startTransition(async () => {
      await marcarTodasLeidas()
      router.refresh()
    })
  }

  function getActionUrl(n: Notificacion): string | null {
    const meta = n.metadata as Record<string, string> | undefined
    if (!meta) return null
    if (n.tipo === 'nueva_asignacion' || n.tipo === 'asignacion_finalizada') {
      return '/enfermero/mis-pacientes'
    }
    if (n.tipo === 'guardia_programada' || n.tipo === 'guardia_cancelada') {
      return '/enfermero/turnos'
    }
    if (meta.paciente_id) return `/pacientes/${meta.paciente_id}`
    return null
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Notificaciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {noLeidasCount > 0
              ? `${noLeidasCount} sin leer`
              : 'Todo al día'}
          </p>
        </div>
        {noLeidasCount > 0 && (
          <button
            onClick={handleMarcarTodas}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white disabled:opacity-50">
            <CheckCheck size={13} /> Marcar todo como leído
          </button>
        )}
      </div>

      {/* Filtro */}
      {notificaciones.length > 0 && (
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 w-fit">
          <button
            onClick={() => setSoloNoLeidas(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !soloNoLeidas ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            Todas ({notificaciones.length})
          </button>
          <button
            onClick={() => setSoloNoLeidas(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              soloNoLeidas ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            Sin leer ({noLeidasCount})
          </button>
        </div>
      )}

      {/* Lista */}
      {mostrar.length === 0 ? (
        <div className="min-h-64 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
              <BellOff size={24} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">
              {soloNoLeidas ? 'No tienes notificaciones sin leer' : 'Sin notificaciones aún'}
            </p>
            <p className="text-xs text-gray-400 max-w-xs">
              Aquí aparecerán tus asignaciones, guardias y alertas importantes.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {mostrar.map(n => {
            const cfg = getTipoConfig(n.tipo)
            const Icon = cfg.icon
            const actionUrl = getActionUrl(n)
            return (
              <div
                key={n.id}
                className={`group relative bg-white rounded-xl border transition-all ${
                  !n.leida
                    ? 'border-l-4 shadow-sm'
                    : 'border-gray-100 opacity-75 hover:opacity-100'
                }`}
                style={!n.leida ? { borderLeftColor: cfg.color } : undefined}>
                <div className="flex items-start gap-3 p-4">
                  {/* Icono */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: cfg.bg }}>
                    <Icon size={16} style={{ color: cfg.color }} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${n.leida ? 'text-gray-600' : 'text-gray-900'}`}>
                          {n.titulo}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.cuerpo}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.leida && (
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cfg.color }} />
                        )}
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTiempo(n.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Acciones inline */}
                    <div className="flex items-center gap-2 mt-2.5">
                      {!n.leida && (
                        <button
                          onClick={() => handleMarcarLeida(n.id)}
                          disabled={isPending}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
                          <CheckCheck size={11} /> Marcar como leída
                        </button>
                      )}
                      {actionUrl && (
                        <Link
                          href={actionUrl}
                          onClick={() => !n.leida && handleMarcarLeida(n.id)}
                          className="text-xs font-medium flex items-center gap-0.5 transition-colors"
                          style={{ color: cfg.color }}>
                          Ver <ChevronRight size={11} />
                        </Link>
                      )}
                    </div>
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
