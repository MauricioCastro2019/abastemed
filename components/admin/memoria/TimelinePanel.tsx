'use client'

import { useState } from 'react'
import {
  ScanLine, AlertTriangle, ListTodo, ShieldAlert,
  ClipboardList, ArrowLeftRight, Filter
} from 'lucide-react'
import type { EventoTimeline, TipoEventoTimeline } from '@/types'

// ─── Helpers ────────────────────────────────────────────────
const TIPO_CONFIG: Record<TipoEventoTimeline, {
  label: string
  icon: React.ReactNode
  color: string
  bg: string
  border: string
}> = {
  hallazgo:      { label: 'Hallazgo',       icon: <ScanLine size={13} />,       color: '#dc2626', bg: '#FEF2F2', border: '#fca5a5' },
  incidencia:    { label: 'Incidencia',     icon: <AlertTriangle size={13} />,  color: '#d97706', bg: '#FEF3C7', border: '#fcd34d' },
  pendiente:     { label: 'Pendiente',      icon: <ListTodo size={13} />,       color: '#2563eb', bg: '#EFF6FF', border: '#bfdbfe' },
  alerta:        { label: 'Alerta',         icon: <ShieldAlert size={13} />,    color: '#7c3aed', bg: '#F5F3FF', border: '#c4b5fd' },
  reporte_turno: { label: 'Reporte turno',  icon: <ClipboardList size={13} />,  color: '#059669', bg: '#ECFDF5', border: '#86efac' },
  entrega_turno: { label: 'Entrega turno',  icon: <ArrowLeftRight size={13} />, color: '#1B2B4B', bg: '#EBF8FB', border: '#2AABBF' },
}

const NIVEL_COLOR: Record<string, string> = {
  leve:     '#059669',
  moderada: '#d97706',
  grave:    '#dc2626',
  critica:  '#7c2d12',
  urgente:  '#dc2626',
  alta:     '#d97706',
  normal:   '#2563eb',
  baja:     '#6b7280',
  bajo:     '#059669',
  moderado: '#d97706',
  alto:     '#dc2626',
  critico:  '#7c2d12',
}

function formatFechaTimeline(f: string) {
  return new Date(f).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatDia(f: string) {
  const d = new Date(f)
  const hoy = new Date()
  const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1)

  if (d.toDateString() === hoy.toDateString()) return 'Hoy'
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Agrupa eventos por día
function agruparPorDia(eventos: EventoTimeline[]): { dia: string; eventos: EventoTimeline[] }[] {
  const grupos: Record<string, EventoTimeline[]> = {}
  for (const e of eventos) {
    const dia = new Date(e.created_at).toDateString()
    if (!grupos[dia]) grupos[dia] = []
    grupos[dia].push(e)
  }
  return Object.entries(grupos).map(([dia, eventos]) => ({
    dia: formatDia(new Date(eventos[0].created_at).toISOString()),
    eventos,
  }))
}

// ─── Ítem de timeline ────────────────────────────────────────
function TimelineItem({ evento }: { evento: EventoTimeline }) {
  const config  = TIPO_CONFIG[evento.tipo_evento]
  const nivelColor = NIVEL_COLOR[evento.nivel] ?? '#6b7280'

  return (
    <div className="flex gap-3 group">
      {/* Línea y punto */}
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border"
          style={{ backgroundColor: config.bg, borderColor: config.border, color: config.color }}>
          {config.icon}
        </div>
        <div className="w-px flex-1 mt-1 bg-gray-100" />
      </div>

      {/* Contenido */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-semibold" style={{ color: config.color }}>
            {config.label}
          </span>
          {evento.nivel && evento.nivel !== 'normal' && evento.nivel !== 'registrado' && (
            <span className="text-xs font-medium capitalize" style={{ color: nivelColor }}>
              · {evento.nivel}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">
            {formatFechaTimeline(evento.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-snug">{evento.texto}</p>
        {evento.subtipo && evento.subtipo !== evento.texto && (
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{evento.subtipo.replace(/_/g, ' ')}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs px-1.5 py-0.5 rounded-full capitalize"
            style={{ backgroundColor: config.bg, color: config.color }}>
            {evento.estado.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Panel principal ─────────────────────────────────────────
interface TimelinePanelProps {
  eventos: EventoTimeline[]
}

const FILTROS: { key: TipoEventoTimeline | 'todos'; label: string }[] = [
  { key: 'todos',         label: 'Todos' },
  { key: 'hallazgo',      label: 'Hallazgos' },
  { key: 'incidencia',    label: 'Incidencias' },
  { key: 'pendiente',     label: 'Pendientes' },
  { key: 'alerta',        label: 'Alertas' },
  { key: 'reporte_turno', label: 'Reportes' },
  { key: 'entrega_turno', label: 'Entregas' },
]

export function TimelinePanel({ eventos }: TimelinePanelProps) {
  const [filtro, setFiltro] = useState<TipoEventoTimeline | 'todos'>('todos')

  const eventosFiltrados = filtro === 'todos'
    ? eventos
    : eventos.filter(e => e.tipo_evento === filtro)

  const grupos = agruparPorDia(eventosFiltrados)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Línea de tiempo
          </h2>
          <span className="text-xs text-gray-400">{eventosFiltrados.length} eventos</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Filter size={11} />
          <span>Filtrar</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key as TipoEventoTimeline | 'todos')}
            className="flex-shrink-0 text-xs px-3 py-1 rounded-full transition-colors"
            style={filtro === f.key
              ? { backgroundColor: '#1B2B4B', color: 'white' }
              : { backgroundColor: '#F5F5F0', color: '#6b7280' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {eventosFiltrados.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Sin eventos registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(({ dia, eventos: evsDia }) => (
            <div key={dia}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs font-semibold text-gray-400 flex-shrink-0">{dia}</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="space-y-0">
                {evsDia.map((e, i) => (
                  <TimelineItem key={`${e.origen_id}-${i}`} evento={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
