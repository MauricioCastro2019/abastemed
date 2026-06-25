'use client'

import { useState, useMemo } from 'react'
import {
  Calendar, Clock, Package, Heart, ArrowLeftRight, CheckCircle,
  DollarSign, AlertTriangle, User, ChevronDown,
} from 'lucide-react'
import type { MovimientoBitacora, TipoMovimiento } from '@/lib/actions/bitacora'

// ── Config por tipo ───────────────────────────────────────────

const TIPO_CONFIG: Record<TipoMovimiento, {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ElementType
}> = {
  turno_creado:    { label: 'Turno asignado',  color: '#2AABBF', bg: '#EBF8FB', border: '#2AABBF', icon: Calendar },
  turno_completado:{ label: 'Turno completado',color: '#059669', bg: '#ECFDF5', border: '#059669', icon: CheckCircle },
  entrega_turno:   { label: 'Entrega de turno',color: '#7C3AED', bg: '#F5F3FF', border: '#7C3AED', icon: ArrowLeftRight },
  insumo_usado:    { label: 'Insumo usado',    color: '#D97706', bg: '#FFFBEB', border: '#D97706', icon: Package },
  evento_cuidado:  { label: 'Plan de cuidado', color: '#EC4899', bg: '#FDF2F8', border: '#EC4899', icon: Heart },
  cobranza:        { label: 'Cobro',           color: '#4F46E5', bg: '#EEF2FF', border: '#4F46E5', icon: DollarSign },
}

const FILTROS_TIPO: { value: TipoMovimiento | 'todos'; label: string }[] = [
  { value: 'todos',           label: 'Todos' },
  { value: 'turno_creado',    label: 'Turnos' },
  { value: 'turno_completado',label: 'Completados' },
  { value: 'entrega_turno',   label: 'Entregas' },
  { value: 'insumo_usado',    label: 'Insumos' },
  { value: 'evento_cuidado',  label: 'Cuidado' },
  { value: 'cobranza',        label: 'Cobranza' },
]

function formatFechaCorta(iso: string) {
  const d = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === hoy.toDateString())
    return `Hoy ${d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`
  if (d.toDateString() === ayer.toDateString())
    return `Ayer ${d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Select compacto ───────────────────────────────────────────

function FilterSelect({
  value, onChange, options, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none text-xs border rounded-lg pl-3 pr-7 py-1.5 outline-none transition-colors bg-white cursor-pointer"
        style={{
          borderColor: value ? '#2AABBF' : '#e5e7eb',
          color: value ? '#1B2B4B' : '#9ca3af',
          fontWeight: value ? 600 : 400,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

// ── Tarjeta individual ────────────────────────────────────────

function MovimientoCard({ m, showCaso }: { m: MovimientoBitacora; showCaso: boolean }) {
  const cfg = TIPO_CONFIG[m.tipo]
  const Icon = cfg.icon
  const tieneIncidente = m.metadata?.incidente === true

  return (
    <div className="flex gap-3 group">
      {/* Dot + línea */}
      <div className="flex flex-col items-center pt-1">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2"
          style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
          <Icon size={14} style={{ color: cfg.color }} />
        </div>
        <div className="w-px flex-1 mt-1" style={{ backgroundColor: '#e5e7eb' }} />
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm group-hover:border-gray-200 transition-colors">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                {tieneIncidente && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={10} /> Incidente
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold mt-1 truncate" style={{ color: '#1B2B4B' }}>
                {m.titulo}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <Clock size={11} />
              {formatFechaCorta(m.fecha)}
            </div>
          </div>

          {/* Descripción */}
          {m.descripcion && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-1">
              {m.descripcion}
            </p>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-gray-50">
            {/* Quién lo hizo — destacado */}
            {m.actor && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#EBF8FB', color: '#1A7A8C' }}>
                <User size={10} />
                {m.actor}
              </span>
            )}
            {showCaso && m.caso_titulo && (
              <span className="text-xs text-gray-400">
                Caso: <span className="font-medium text-gray-500">{m.caso_titulo}</span>
              </span>
            )}
            {m.paciente_nombre && (
              <span className="text-xs text-gray-400">
                Px: <span className="font-medium text-gray-600">{m.paciente_nombre}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────

interface Props {
  movimientos: MovimientoBitacora[]
  showCaso?: boolean
}

export function BitacoraTimeline({ movimientos, showCaso = true }: Props) {
  const [filtroTipo,      setFiltroTipo]      = useState<TipoMovimiento | 'todos'>('todos')
  const [filtroPaciente,  setFiltroPaciente]  = useState('')
  const [filtroEnfermero, setFiltroEnfermero] = useState('')
  const [busqueda,        setBusqueda]        = useState('')

  // Opciones únicas para los selects (sin duplicados y sin vacíos)
  const pacientes = useMemo(() =>
    Array.from(new Set(movimientos.map(m => m.paciente_nombre).filter(Boolean) as string[])).sort()
  , [movimientos])

  const enfermeros = useMemo(() =>
    Array.from(new Set(movimientos.map(m => m.actor).filter(Boolean) as string[])).sort()
  , [movimientos])

  const filtrados = useMemo(() => {
    let items = movimientos
    if (filtroTipo !== 'todos')       items = items.filter(m => m.tipo === filtroTipo)
    if (filtroPaciente)               items = items.filter(m => m.paciente_nombre === filtroPaciente)
    if (filtroEnfermero)              items = items.filter(m => m.actor === filtroEnfermero)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      items = items.filter(m =>
        m.titulo.toLowerCase().includes(q) ||
        m.descripcion?.toLowerCase().includes(q) ||
        m.actor?.toLowerCase().includes(q) ||
        m.caso_titulo?.toLowerCase().includes(q) ||
        m.paciente_nombre?.toLowerCase().includes(q)
      )
    }
    return items
  }, [movimientos, filtroTipo, filtroPaciente, filtroEnfermero, busqueda])

  const hayFiltros = filtroTipo !== 'todos' || filtroPaciente || filtroEnfermero || busqueda.trim()

  // Agrupar por fecha (día)
  const grupos = useMemo(() => {
    const map = new Map<string, MovimientoBitacora[]>()
    for (const m of filtrados) {
      const dia = new Date(m.fecha).toLocaleDateString('es-VE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
      if (!map.has(dia)) map.set(dia, [])
      map.get(dia)!.push(m)
    }
    return map
  }, [filtrados])

  return (
    <div>
      {/* ── Filtros ── */}
      <div className="space-y-3 mb-6">
        {/* Tipo */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS_TIPO.map(f => (
            <button key={f.value} onClick={() => setFiltroTipo(f.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={filtroTipo === f.value
                ? { backgroundColor: '#1B2B4B', color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Paciente + Enfermero + Búsqueda */}
        <div className="flex flex-wrap gap-2 items-center">
          <FilterSelect
            value={filtroPaciente}
            onChange={setFiltroPaciente}
            options={pacientes}
            placeholder="Filtrar por paciente"
          />
          <FilterSelect
            value={filtroEnfermero}
            onChange={setFiltroEnfermero}
            options={enfermeros}
            placeholder="Filtrar por enfermero/a"
          />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 min-w-[140px] text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#2AABBF] transition-colors"
          />
          {hayFiltros && (
            <button
              onClick={() => { setFiltroTipo('todos'); setFiltroPaciente(''); setFiltroEnfermero(''); setBusqueda('') }}
              className="text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Stats rápidas ── */}
      <div className="flex gap-3 flex-wrap mb-6">
        {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
          const count = movimientos.filter(m => m.tipo === tipo as TipoMovimiento).length
          if (!count) return null
          const Icon = cfg.icon
          return (
            <button key={tipo}
              onClick={() => setFiltroTipo(tipo === filtroTipo ? 'todos' : tipo as TipoMovimiento)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:shadow-sm"
              style={{
                borderColor: filtroTipo === tipo ? cfg.border : '#e5e7eb',
                backgroundColor: filtroTipo === tipo ? cfg.bg : 'white',
                color: filtroTipo === tipo ? cfg.color : '#6b7280',
              }}>
              <Icon size={12} />
              {cfg.label}: <span className="font-bold">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Resultado del filtro */}
      {hayFiltros && (
        <p className="text-xs text-gray-400 mb-4">
          {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
          {filtroPaciente && <> · <span className="font-medium text-gray-600">{filtroPaciente}</span></>}
          {filtroEnfermero && <> · <span className="font-medium text-gray-600">{filtroEnfermero}</span></>}
        </p>
      )}

      {/* ── Timeline ── */}
      {grupos.size === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Sin movimientos para mostrar</p>
        </div>
      ) : (
        Array.from(grupos.entries()).map(([dia, items]) => (
          <div key={dia} className="mb-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 capitalize px-2">{dia}</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            {items.map(m => (
              <MovimientoCard key={m.id} m={m} showCaso={showCaso} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
