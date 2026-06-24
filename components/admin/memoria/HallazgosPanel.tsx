'use client'

import { useState } from 'react'
import { ScanLine, Plus, CheckCircle2, Clock, X, ChevronDown, ChevronUp } from 'lucide-react'
import { crearHallazgo, actualizarEstadoHallazgo } from '@/lib/actions/hallazgos'
import type { HallazgoClinico, CategoriaHallazgo, SeveridadHallazgo } from '@/types'

// ─── Helpers ────────────────────────────────────────────────
const CATEGORIA_LABEL: Record<CategoriaHallazgo, string> = {
  integridad_piel: 'Integridad de piel',
  respiratorio:    'Respiratorio',
  neurologico:     'Neurológico',
  digestivo:       'Digestivo',
  dolor:           'Dolor',
  movilidad:       'Movilidad',
  nutricional:     'Nutricional',
  otro:            'Otro',
}

const CATEGORIA_TIPOS: Record<CategoriaHallazgo, string[]> = {
  integridad_piel: ['Abrasión', 'Lesión por presión', 'Enrojecimiento', 'Sangrado', 'Edema localizado', 'Herida', 'Otro'],
  respiratorio:    ['Disnea', 'Sibilancias', 'Secreciones', 'Saturación baja', 'Otro'],
  neurologico:     ['Somnolencia', 'Desorientación', 'Agitación', 'Convulsión', 'Otro'],
  digestivo:       ['Evacuación líquida', 'Estreñimiento', 'Náusea', 'Vómito', 'Distensión abdominal', 'Otro'],
  dolor:           ['Dolor agudo', 'Dolor crónico', 'Dolor postoperatorio', 'Otro'],
  movilidad:       ['Caída', 'Casi caída', 'Limitación nueva', 'Otro'],
  nutricional:     ['Rechazo de alimento', 'Dificultad para deglutir', 'Pérdida de peso', 'Otro'],
  otro:            ['Otro'],
}

const SEVERIDAD_CONFIG: Record<SeveridadHallazgo, { label: string; color: string; bg: string; border: string }> = {
  leve:     { label: 'Leve',     color: '#059669', bg: '#ECFDF5', border: '#86efac' },
  moderada: { label: 'Moderada', color: '#d97706', bg: '#FEF3C7', border: '#fcd34d' },
  grave:    { label: 'Grave',    color: '#dc2626', bg: '#FEF2F2', border: '#fca5a5' },
}

const ESTADO_CONFIG = {
  abierto:        { label: 'Abierto',        icon: <Clock size={11} />,         color: '#dc2626', bg: '#FEF2F2' },
  en_seguimiento: { label: 'En seguimiento', icon: <ScanLine size={11} />,      color: '#d97706', bg: '#FEF3C7' },
  resuelto:       { label: 'Resuelto',       icon: <CheckCircle2 size={11} />,  color: '#059669', bg: '#ECFDF5' },
}

function formatFecha(f: string) {
  return new Date(f).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Formulario nuevo hallazgo ───────────────────────────────
function NuevoHallazgoForm({ casoId, turnoId, onClose }: {
  casoId: string
  turnoId?: string
  onClose: () => void
}) {
  const [categoria, setCategoria] = useState<CategoriaHallazgo>('integridad_piel')
  const [tipo, setTipo] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('caso_id', casoId)
    if (turnoId) fd.set('turno_id', turnoId)
    const result = await crearHallazgo(fd)
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
        <h3 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Nuevo hallazgo</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
          <select
            name="categoria"
            value={categoria}
            onChange={e => { setCategoria(e.target.value as CategoriaHallazgo); setTipo('') }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
            required
          >
            {Object.entries(CATEGORIA_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
          <select
            name="tipo"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
            required
          >
            <option value="">Seleccionar...</option>
            {CATEGORIA_TIPOS[categoria].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
        <textarea
          name="descripcion"
          rows={2}
          placeholder="Describe el hallazgo con detalle..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF] resize-none"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Severidad</label>
          <select
            name="severidad"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
          >
            <option value="leve">Leve</option>
            <option value="moderada">Moderada</option>
            <option value="grave">Grave</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 pt-5">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" name="requiere_vigilancia" value="true"
              className="rounded border-gray-300" />
            Requiere vigilancia
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" name="requiere_notificacion" value="true"
              className="rounded border-gray-300" />
            Notificar coordinación
          </label>
        </div>
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
          {pending ? 'Guardando...' : 'Registrar hallazgo'}
        </button>
      </div>
    </form>
  )
}

// ─── Ítem de hallazgo ────────────────────────────────────────
function HallazgoItem({ h, compact = false }: { h: HallazgoClinico; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [resolviendo, setResolviendo] = useState(false)
  const [notas, setNotas] = useState('')
  const [pending, setPending] = useState(false)

  const sev  = SEVERIDAD_CONFIG[h.severidad]
  const est  = ESTADO_CONFIG[h.estado]

  async function resolver(estado: 'en_seguimiento' | 'resuelto') {
    setPending(true)
    await actualizarEstadoHallazgo(h.id, estado, notas)
    setPending(false)
    setResolviendo(false)
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: sev.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>{h.tipo}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: sev.bg, color: sev.color }}>
              {sev.label}
            </span>
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: est.bg, color: est.color }}>
              {est.icon} {est.label}
            </span>
          </div>
          {!compact && (
            <p className="text-xs text-gray-400 mt-0.5">{CATEGORIA_LABEL[h.categoria]} · {formatFecha(h.created_at)}</p>
          )}
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  : <ChevronDown size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-50 space-y-3">
          <p className="text-sm text-gray-600 leading-relaxed">{h.descripcion}</p>

          {(h.requiere_vigilancia || h.requiere_notificacion) && (
            <div className="flex gap-2 flex-wrap">
              {h.requiere_vigilancia && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Vigilancia requerida</span>
              )}
              {h.requiere_notificacion && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">Notificación coordinación</span>
              )}
            </div>
          )}

          {h.estado !== 'resuelto' && (
            <>
              {!resolviendo ? (
                <div className="flex gap-2">
                  {h.estado === 'abierto' && (
                    <button onClick={() => resolver('en_seguimiento')} disabled={pending}
                      className="text-xs px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50">
                      Marcar en seguimiento
                    </button>
                  )}
                  <button onClick={() => setResolviendo(true)}
                    className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors">
                    Marcar resuelto
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Notas de resolución (opcional)..."
                    rows={2}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF] resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => resolver('resuelto')} disabled={pending}
                      className="text-xs px-3 py-1.5 text-white rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: '#059669' }}>
                      {pending ? 'Guardando...' : 'Confirmar resolución'}
                    </button>
                    <button onClick={() => setResolviendo(false)}
                      className="text-xs px-3 py-1.5 text-gray-500 border border-gray-200 rounded-lg">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {h.estado === 'resuelto' && h.notas_resolucion && (
            <p className="text-xs text-gray-400 italic">Resolución: {h.notas_resolucion}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Panel principal ─────────────────────────────────────────
interface HallazgosPanelProps {
  hallazgos: HallazgoClinico[]
  casoId: string
  turnoId?: string
  compact?: boolean
}

export function HallazgosPanel({ hallazgos, casoId, turnoId, compact = false }: HallazgosPanelProps) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'abiertos' | 'resueltos'>('abiertos')

  const filtrados = hallazgos.filter(h => {
    if (filtro === 'abiertos')  return h.estado !== 'resuelto'
    if (filtro === 'resueltos') return h.estado === 'resuelto'
    return true
  })

  const abiertos = hallazgos.filter(h => h.estado !== 'resuelto').length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ScanLine size={15} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Hallazgos clínicos
          </h2>
          {abiertos > 0 && (
            <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
              style={{ backgroundColor: '#dc2626' }}>
              {abiertos}
            </span>
          )}
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2AABBF] text-[#2AABBF] hover:bg-[#EBF8FB] transition-colors"
        >
          <Plus size={13} /> Nuevo hallazgo
        </button>
      </div>

      {mostrarForm && (
        <NuevoHallazgoForm casoId={casoId} turnoId={turnoId} onClose={() => setMostrarForm(false)} />
      )}

      {!compact && (
        <div className="flex gap-1">
          {(['abiertos', 'todos', 'resueltos'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`text-xs px-3 py-1 rounded-full transition-colors capitalize ${
                filtro === f
                  ? 'text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              style={filtro === f ? { backgroundColor: '#1B2B4B' } : {}}>
              {f}
            </button>
          ))}
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <ScanLine size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {filtro === 'abiertos' ? 'Sin hallazgos abiertos' : 'Sin hallazgos registrados'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(compact ? filtrados.slice(0, 3) : filtrados).map(h => (
            <HallazgoItem key={h.id} h={h} compact={compact} />
          ))}
          {compact && filtrados.length > 3 && (
            <p className="text-xs text-center text-[#2AABBF]">+{filtrados.length - 3} hallazgos más</p>
          )}
        </div>
      )}
    </div>
  )
}
