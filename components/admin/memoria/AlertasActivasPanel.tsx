'use client'

import { useState } from 'react'
import { ShieldAlert, Plus, X, CheckCircle2 } from 'lucide-react'
import { crearAlertaActiva, desactivarAlerta } from '@/lib/actions/alertas-activas'
import type { AlertaActiva, TipoAlertaActiva, NivelAlertaActiva } from '@/types'

// ─── Helpers ────────────────────────────────────────────────
const TIPO_LABEL: Record<TipoAlertaActiva, string> = {
  riesgo_caida:          'Riesgo de caída',
  riesgo_lesion_cutanea: 'Riesgo de lesión cutánea',
  riesgo_broncoaspiracion: 'Riesgo de broncoaspiración',
  riesgo_deshidratacion: 'Riesgo de deshidratación',
  riesgo_sepsis:         'Riesgo de sepsis',
  dolor_no_controlado:   'Dolor no controlado',
  otro:                  'Otro',
}

const NIVEL_CONFIG: Record<NivelAlertaActiva, { label: string; color: string; bg: string; border: string }> = {
  bajo:     { label: 'Bajo',    color: '#059669', bg: '#ECFDF5', border: '#86efac' },
  moderado: { label: 'Moderado', color: '#d97706', bg: '#FEF3C7', border: '#fcd34d' },
  alto:     { label: 'Alto',    color: '#dc2626', bg: '#FEF2F2', border: '#fca5a5' },
  critico:  { label: 'Crítico', color: '#7c2d12', bg: '#fff7ed', border: '#fdba74' },
}

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ─── Formulario nueva alerta ─────────────────────────────────
function NuevaAlertaForm({ casoId, turnoId, onClose }: {
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
    const result = await crearAlertaActiva(fd)
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
        <h3 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Nueva alerta activa</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tipo de alerta</label>
          <select
            name="tipo"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
            required
          >
            <option value="">Seleccionar...</option>
            {Object.entries(TIPO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nivel</label>
          <select
            name="nivel"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
          >
            <option value="moderado">Moderado</option>
            <option value="bajo">Bajo</option>
            <option value="alto">Alto</option>
            <option value="critico">Crítico</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Descripción (opcional)</label>
        <textarea
          name="descripcion"
          rows={2}
          placeholder="Contexto de la alerta..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF] resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
          Cancelar
        </button>
        <button type="submit" disabled={pending}
          className="px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-all"
          style={{ backgroundColor: '#dc2626' }}>
          {pending ? 'Guardando...' : 'Activar alerta'}
        </button>
      </div>
    </form>
  )
}

// ─── Ítem de alerta ──────────────────────────────────────────
function AlertaItem({ a, onDesactivar }: { a: AlertaActiva; onDesactivar: (id: string) => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [pending, setPending] = useState(false)
  const nivel = NIVEL_CONFIG[a.nivel]

  async function desactivar() {
    setPending(true)
    await desactivarAlerta(a.id, motivo)
    onDesactivar(a.id)
    setPending(false)
  }

  return (
    <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: nivel.border, backgroundColor: nivel.bg }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold animate-pulse" style={{ color: nivel.color }}>●</span>
            <span className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              {TIPO_LABEL[a.tipo]}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-white"
              style={{ color: nivel.color }}>
              {nivel.label}
            </span>
          </div>
          {a.descripcion && (
            <p className="text-xs text-gray-500 mt-1">{a.descripcion}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Desde {formatFecha(a.created_at)}</p>
        </div>
        {!confirmando && (
          <button onClick={() => setConfirmando(true)}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <CheckCircle2 size={15} />
          </button>
        )}
      </div>

      {confirmando && (
        <div className="space-y-2 pt-1 border-t border-white/50">
          <input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Motivo de desactivación (opcional)..."
            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={desactivar} disabled={pending}
              className="text-xs px-3 py-1.5 text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#059669' }}>
              {pending ? '...' : 'Desactivar alerta'}
            </button>
            <button onClick={() => setConfirmando(false)}
              className="text-xs px-3 py-1.5 text-gray-500 bg-white border border-gray-200 rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel principal ─────────────────────────────────────────
interface AlertasActivasPanelProps {
  alertas: AlertaActiva[]
  casoId: string
  turnoId?: string
  compact?: boolean
}

export function AlertasActivasPanel({ alertas: initialAlertas, casoId, turnoId, compact = false }: AlertasActivasPanelProps) {
  const [alertas, setAlertas] = useState(initialAlertas)
  const [mostrarForm, setMostrarForm] = useState(false)

  function handleDesactivar(id: string) {
    setAlertas(prev => prev.filter(a => a.id !== id))
  }

  const criticas = alertas.filter(a => a.nivel === 'critico' || a.nivel === 'alto').length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} style={{ color: criticas > 0 ? '#dc2626' : '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Alertas activas
          </h2>
          {alertas.length > 0 && (
            <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
              style={{ backgroundColor: criticas > 0 ? '#dc2626' : '#d97706' }}>
              {alertas.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
        >
          <Plus size={13} /> Nueva alerta
        </button>
      </div>

      {mostrarForm && (
        <NuevaAlertaForm casoId={casoId} turnoId={turnoId} onClose={() => setMostrarForm(false)} />
      )}

      {alertas.length === 0 ? (
        <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          <ShieldAlert size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin alertas activas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(compact ? alertas.slice(0, 3) : alertas).map(a => (
            <AlertaItem key={a.id} a={a} onDesactivar={handleDesactivar} />
          ))}
          {compact && alertas.length > 3 && (
            <p className="text-xs text-center text-red-500">+{alertas.length - 3} alertas más</p>
          )}
        </div>
      )}
    </div>
  )
}
