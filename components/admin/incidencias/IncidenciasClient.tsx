'use client'

import { useState, useTransition } from 'react'
import { crearIncidencia } from '@/lib/actions/incidencias'
import type { Incidencia, GravedadIncidencia, TipoIncidencia } from '@/types'
import {
  AlertTriangle, AlertOctagon, Info, Zap,
  Plus, X, Check, Filter
} from 'lucide-react'

const GRAVEDAD_STYLE: Record<GravedadIncidencia, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  leve:     { label: 'Leve',    color: '#059669', bg: '#ECFDF5', border: '#86efac', icon: <Info size={14} /> },
  moderada: { label: 'Moderada',color: '#d97706', bg: '#FEF3C7', border: '#fcd34d', icon: <AlertTriangle size={14} /> },
  grave:    { label: 'Grave',   color: '#dc2626', bg: '#FEF2F2', border: '#fca5a5', icon: <AlertOctagon size={14} /> },
  critica:  { label: 'Crítica', color: '#7c2d12', bg: '#FFF1F2', border: '#f87171', icon: <Zap size={14} /> },
}

const TIPO_LABELS: Record<TipoIncidencia, string> = {
  desaturacion:       'Desaturación',
  hipotension:        'Hipotensión',
  fiebre:             'Fiebre',
  confusion:          'Confusión súbita',
  sincope:            'Síncope',
  caida:              'Caída',
  casi_caida:         'Casi caída',
  dolor_intenso:      'Dolor intenso',
  vomito:             'Vómito',
  retencion_urinaria: 'Retención urinaria',
  hematuria:          'Hematuria',
  falla_equipo:       'Falla de equipo',
  falta_insumo:       'Falta de insumo',
  reaccion_medicamento: 'Reacción a medicamento',
  otro:               'Otro',
}

function formatFechaHora(s: string) {
  return new Date(s).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/30 focus:border-[#2AABBF]"
const selectCls = inputCls

interface Props {
  casoId: string
  turnoId?: string
  incidencias: Incidencia[]
}

export function IncidenciasClient({ casoId, turnoId, incidencias: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [filtroGravedad, setFiltroGravedad] = useState<GravedadIncidencia | ''>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const filtrados = filtroGravedad
    ? items.filter(i => i.gravedad === filtroGravedad)
    : items

  const criticas = items.filter(i => i.gravedad === 'critica' || i.gravedad === 'grave').length

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formEl = e.currentTarget
    const fd = new FormData(formEl)
    fd.set('caso_id', casoId)
    if (turnoId) fd.set('turno_id', turnoId)

    startTransition(async () => {
      const result = await crearIncidencia(fd)
      if (result?.error) {
        setError(result.error)
        return
      }

      const fechaHora = (fd.get('fecha_hora') as string) || new Date().toISOString()
      const newItem: Incidencia = {
        id: crypto.randomUUID(),
        caso_id: casoId,
        turno_id: turnoId ?? null,
        reporte_turno_id: null,
        tipo: fd.get('tipo') as TipoIncidencia,
        descripcion: fd.get('descripcion') as string,
        signos_vitales: {},
        intervencion:    fd.get('intervencion') as string | null,
        a_quien_se_aviso: fd.get('a_quien_se_aviso') as string | null,
        respuesta:       fd.get('respuesta') as string | null,
        estado_posterior: fd.get('estado_posterior') as string | null,
        gravedad:        fd.get('gravedad') as GravedadIncidencia,
        reportado_por:   null,
        fecha_hora:      fechaHora,
        created_at:      new Date().toISOString(),
      }
      setItems(prev => [newItem, ...prev])
      setShowForm(false)
      formEl.reset()
    })
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {criticas > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#FEF2F2', color: '#dc2626', border: '1px solid #fca5a5' }}>
              <AlertOctagon size={12} />
              {criticas} grave{criticas !== 1 ? 's' : ''} / crítica{criticas !== 1 ? 's' : ''}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-gray-400" />
            <select
              value={filtroGravedad}
              onChange={e => setFiltroGravedad(e.target.value as GravedadIncidencia | '')}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2AABBF]/30"
            >
              <option value="">Todas las gravedades</option>
              <option value="leve">Leves</option>
              <option value="moderada">Moderadas</option>
              <option value="grave">Graves</option>
              <option value="critica">Críticas</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#dc2626' }}
        >
          <Plus size={15} /> Registrar incidencia
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-red-50">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-semibold text-red-700">Nueva Incidencia</span>
            </div>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de incidencia *</label>
                <select name="tipo" className={selectCls} required>
                  <option value="">— Seleccionar —</option>
                  {(Object.entries(TIPO_LABELS) as [TipoIncidencia, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Gravedad *</label>
                <select name="gravedad" className={selectCls} defaultValue="moderada" required>
                  <option value="leve">Leve</option>
                  <option value="moderada">Moderada</option>
                  <option value="grave">Grave</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  name="fecha_hora"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">¿A quién se avisó?</label>
                <input name="a_quien_se_aviso" className={inputCls} placeholder="Dr. García, familiar, jefe turno..." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción *</label>
                <textarea name="descripcion" rows={3} className={inputCls} required
                  placeholder="Describe qué ocurrió, cuándo, cómo se presentó..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Intervención realizada</label>
                <textarea name="intervencion" rows={2} className={inputCls}
                  placeholder="Qué se hizo inmediatamente..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Respuesta / resultado</label>
                <textarea name="respuesta" rows={2} className={inputCls}
                  placeholder="Cómo respondió el paciente..." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado posterior del paciente</label>
                <input name="estado_posterior" className={inputCls}
                  placeholder="Estable, en observación, referido a urgencias..." />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300">
                Cancelar
              </button>
              <button type="submit" disabled={pending}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60">
                <Check size={14} />
                {pending ? 'Guardando...' : 'Registrar incidencia'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de incidencias */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <AlertTriangle size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">
            {filtroGravedad ? 'Sin incidencias con este filtro' : 'Sin incidencias registradas'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(inc => {
            const st = GRAVEDAD_STYLE[inc.gravedad]
            const isOpen = expandedId === inc.id
            return (
              <div key={inc.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
                style={{ borderLeft: `4px solid ${st.border}` }}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : inc.id)}
                  className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: st.bg, color: st.color }}>
                    {st.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                        {TIPO_LABELS[inc.tipo]}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{inc.descripcion}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatFechaHora(inc.fecha_hora)}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 mt-1">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-gray-50 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Descripción completa</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{inc.descripcion}</p>
                    </div>
                    {inc.intervencion && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Intervención realizada</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{inc.intervencion}</p>
                      </div>
                    )}
                    {inc.a_quien_se_aviso && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Se avisó a</p>
                        <p className="text-sm text-gray-700">{inc.a_quien_se_aviso}</p>
                      </div>
                    )}
                    {inc.respuesta && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Respuesta / resultado</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{inc.respuesta}</p>
                      </div>
                    )}
                    {inc.estado_posterior && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Estado posterior</p>
                        <p className="text-sm text-gray-700">{inc.estado_posterior}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
