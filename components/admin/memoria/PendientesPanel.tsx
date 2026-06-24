'use client'

import { useState } from 'react'
import { ListTodo, Plus, CheckCircle2, Clock, X, ArrowRight, Circle } from 'lucide-react'
import { crearPendiente, actualizarEstadoPendiente } from '@/lib/actions/pendientes-caso'
import type { PendienteCaso, PrioridadPendiente, EstadoPendiente } from '@/types'

// ─── Helpers ────────────────────────────────────────────────
const PRIORIDAD_CONFIG: Record<PrioridadPendiente, { label: string; color: string; bg: string }> = {
  urgente: { label: 'Urgente', color: '#dc2626', bg: '#FEF2F2' },
  alta:    { label: 'Alta',    color: '#d97706', bg: '#FEF3C7' },
  normal:  { label: 'Normal',  color: '#2563eb', bg: '#EFF6FF' },
  baja:    { label: 'Baja',    color: '#6b7280', bg: '#F9FAFB' },
}

const ESTADO_ICON: Record<EstadoPendiente, React.ReactNode> = {
  pendiente:  <Circle size={14} className="text-gray-400" />,
  en_proceso: <Clock size={14} style={{ color: '#d97706' }} />,
  resuelto:   <CheckCircle2 size={14} style={{ color: '#059669' }} />,
  cancelado:  <X size={14} className="text-gray-300" />,
}

function formatFecha(f: string) {
  return new Date(f).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Formulario nuevo pendiente ──────────────────────────────
function NuevoPendienteForm({ casoId, turnoId, onClose }: {
  casoId: string
  turnoId?: string
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('caso_id', casoId)
    if (turnoId) fd.set('turno_id', turnoId)
    const result = await crearPendiente(fd)
    if (result.error) {
      setError(result.error)
      setPending(false)
    } else {
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 mt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Nuevo pendiente</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Tarea pendiente</label>
        <input
          name="titulo"
          placeholder="Ej: Vigilar área de pañal, Solicitar insumo..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
          required
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Detalle (opcional)</label>
        <textarea
          name="descripcion"
          rows={2}
          placeholder="Contexto adicional..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF] resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Prioridad</label>
        <select
          name="prioridad"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
        >
          <option value="normal">Normal</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
          Cancelar
        </button>
        <button type="submit" disabled={pending}
          className="px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-all"
          style={{ backgroundColor: '#1B2B4B' }}>
          {pending ? 'Guardando...' : 'Agregar pendiente'}
        </button>
      </div>
    </form>
  )
}

// ─── Ítem de pendiente ───────────────────────────────────────
function PendienteItem({ p }: { p: PendienteCaso }) {
  const [pending, setPending] = useState(false)
  const prioridad = PRIORIDAD_CONFIG[p.prioridad]

  async function avanzar() {
    setPending(true)
    if (p.estado === 'pendiente') {
      await actualizarEstadoPendiente(p.id, 'en_proceso')
    } else if (p.estado === 'en_proceso') {
      await actualizarEstadoPendiente(p.id, 'resuelto')
    }
    setPending(false)
  }

  const completado = p.estado === 'resuelto' || p.estado === 'cancelado'

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
      completado ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'
    }`}>
      <button
        onClick={avanzar}
        disabled={pending || completado}
        className="mt-0.5 flex-shrink-0 disabled:cursor-default"
      >
        {ESTADO_ICON[p.estado]}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium ${completado ? 'line-through text-gray-400' : ''}`}
            style={completado ? {} : { color: '#1B2B4B' }}>
            {p.titulo}
          </p>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: prioridad.bg, color: prioridad.color }}>
            {prioridad.label}
          </span>
        </div>
        {p.descripcion && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{p.descripcion}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{formatFecha(p.created_at)}</p>
      </div>

      {!completado && p.estado === 'pendiente' && (
        <button onClick={avanzar} disabled={pending}
          className="flex-shrink-0 text-xs text-[#2AABBF] hover:underline flex items-center gap-1 disabled:opacity-50">
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  )
}

// ─── Panel principal ─────────────────────────────────────────
interface PendientesPanelProps {
  pendientes: PendienteCaso[]
  casoId: string
  turnoId?: string
  compact?: boolean
}

export function PendientesPanel({ pendientes, casoId, turnoId, compact = false }: PendientesPanelProps) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtro, setFiltro] = useState<'activos' | 'todos' | 'resueltos'>('activos')

  const filtrados = pendientes.filter(p => {
    if (filtro === 'activos')   return p.estado === 'pendiente' || p.estado === 'en_proceso'
    if (filtro === 'resueltos') return p.estado === 'resuelto' || p.estado === 'cancelado'
    return true
  })

  const activos = pendientes.filter(p => p.estado === 'pendiente' || p.estado === 'en_proceso').length
  const urgentes = pendientes.filter(p => p.prioridad === 'urgente' && p.estado !== 'resuelto' && p.estado !== 'cancelado').length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ListTodo size={15} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Pendientes
          </h2>
          {activos > 0 && (
            <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
              style={{ backgroundColor: urgentes > 0 ? '#dc2626' : '#d97706' }}>
              {activos}
            </span>
          )}
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2AABBF] text-[#2AABBF] hover:bg-[#EBF8FB] transition-colors"
        >
          <Plus size={13} /> Nuevo pendiente
        </button>
      </div>

      {mostrarForm && (
        <NuevoPendienteForm casoId={casoId} turnoId={turnoId} onClose={() => setMostrarForm(false)} />
      )}

      {!compact && (
        <div className="flex gap-1">
          {(['activos', 'todos', 'resueltos'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-1 rounded-full transition-colors capitalize ${
                filtro === f ? 'text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
              style={filtro === f ? { backgroundColor: '#1B2B4B' } : {}}>
              {f}
            </button>
          ))}
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <ListTodo size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {filtro === 'activos' ? 'Sin pendientes activos' : 'Sin pendientes registrados'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(compact ? filtrados.slice(0, 4) : filtrados).map(p => (
            <PendienteItem key={p.id} p={p} />
          ))}
          {compact && filtrados.length > 4 && (
            <p className="text-xs text-center text-[#2AABBF]">+{filtrados.length - 4} pendientes más</p>
          )}
        </div>
      )}
    </div>
  )
}
