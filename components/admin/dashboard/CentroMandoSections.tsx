import { getCentroMandoData } from '@/lib/actions/centro-mando'
import type { EntregaBandeja, AlertaClinica, PendienteUrgente, SugerenciaAuto } from '@/lib/actions/centro-mando'
import {
  Bell, AlertTriangle, Clock, Zap, ChevronRight,
  CheckCircle, TrendingDown, Minus, TrendingUp, ClipboardList,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `hace ${m}m`
  const h = Math.floor(diff / 3600000)
  if (h < 24)  return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function initials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
}

// ─── Lookup maps ──────────────────────────────────────────────────────────────

const TIPO_ALERTA: Record<string, string> = {
  riesgo_caida:           'Riesgo de caída',
  riesgo_lesion_cutanea:  'Riesgo de lesión cutánea',
  riesgo_broncoaspiracion:'Riesgo de broncoaspiración',
  riesgo_deshidratacion:  'Riesgo de deshidratación',
  riesgo_sepsis:          'Riesgo de sepsis',
  dolor_no_controlado:    'Dolor no controlado',
  otro:                   'Alerta personalizada',
}

const NIVEL_STYLE: Record<string, { dot: string; badge: string; text: string }> = {
  critico:  { dot: 'bg-red-500 animate-pulse',  badge: 'bg-red-100 text-red-700',    text: 'Crítico'  },
  alto:     { dot: 'bg-orange-500',             badge: 'bg-orange-100 text-orange-700', text: 'Alto'  },
  moderado: { dot: 'bg-amber-400',              badge: 'bg-amber-100 text-amber-700', text: 'Moderado' },
  bajo:     { dot: 'bg-gray-400',               badge: 'bg-gray-100 text-gray-500',  text: 'Bajo'     },
}

const ESTADO_PACIENTE_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: LucideIcon }> = {
  mejor: { label: 'Mejorando', color: '#059669', bg: '#ECFDF5', Icon: TrendingUp   },
  igual: { label: 'Estable',   color: '#2563eb', bg: '#EFF6FF', Icon: Minus        },
  peor:  { label: 'Deterioro', color: '#dc2626', bg: '#FEF2F2', Icon: TrendingDown },
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function BandejaSection({ entries }: { entries: EntregaBandeja[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between"
        style={{ borderLeft: '3px solid #7c3aed' }}>
        <div className="flex items-center gap-2">
          <Bell size={15} style={{ color: '#7c3aed' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Bandeja de coordinación
          </h2>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: '#7c3aed' }}>
            {entries.length}
          </span>
        </div>
        <p className="text-xs text-gray-400">Últimas 72 horas</p>
      </div>
      <div className="divide-y divide-gray-50">
        {entries.map(e => {
          const cfg = ESTADO_PACIENTE_CONFIG[e.estado_paciente]
          const EstIcon = cfg?.Icon
          return (
            <Link key={e.id} href={`/turnos/${e.turno_id}/entrega-guiada`}
              className="flex items-start gap-3 px-5 py-4 hover:bg-purple-50 transition-all group">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#7c3aed' }}>
                {initials(e.paciente_nombre, e.paciente_apellido)}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                    {e.paciente_nombre} {e.paciente_apellido}
                  </p>
                  {cfg && EstIcon && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      <EstIcon size={10} />
                      {cfg.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {e.enfermero_nombre} {e.enfermero_apellido} · {timeago(e.created_at)}
                </p>
                {e.notas_coordinacion && (
                  <p className="text-xs text-purple-800 bg-purple-50 rounded-md px-2.5 py-1.5 mt-2 leading-relaxed">
                    &ldquo;{e.notas_coordinacion}&rdquo;
                  </p>
                )}
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-1" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function AlertasSection({ alertas }: { alertas: AlertaClinica[] }) {
  const criticas = alertas.filter(a => a.nivel === 'critico')
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between"
        style={{ borderLeft: '3px solid #dc2626' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-600" />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Alertas clínicas activas
          </h2>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
            {alertas.length}
          </span>
          {criticas.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 animate-pulse">
              {criticas.length} crítica{criticas.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {alertas.map(a => {
          const ns = NIVEL_STYLE[a.nivel] ?? NIVEL_STYLE.bajo
          return (
            <Link key={a.id} href={`/pacientes/${a.caso_id}/memoria`}
              className="flex items-start gap-3 px-5 py-3.5 hover:bg-red-50 transition-all group">
              <div className="flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${ns.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
                    {TIPO_ALERTA[a.tipo] ?? a.tipo}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ns.badge}`}>
                    {ns.text}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {a.paciente_nombre} {a.paciente_apellido}
                  {a.descripcion ? ` · ${a.descripcion}` : ''}
                  <span className="ml-2 text-gray-400">{timeago(a.created_at)}</span>
                </p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-red-400 transition-colors flex-shrink-0 mt-1" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function PendientesSection({ pendientes }: { pendientes: PendienteUrgente[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between"
        style={{ borderLeft: '3px solid #d97706' }}>
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-amber-600" />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Pendientes prioritarios
          </h2>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
            {pendientes.length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {pendientes.map(p => (
          <Link key={p.id} href={`/pacientes/${p.caso_id}/memoria`}
            className="flex items-start gap-3 px-5 py-3.5 hover:bg-amber-50 transition-all group">
            <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
              p.prioridad === 'urgente'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {p.prioridad === 'urgente' ? '⚡ Urgente' : '▲ Alta'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>
                {p.titulo}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {p.paciente_nombre} {p.paciente_apellido}
                <span className="ml-2 text-gray-400">{timeago(p.created_at)}</span>
              </p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function SugerenciasSection({ sugerencias }: { sugerencias: SugerenciaAuto[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2"
        style={{ borderLeft: '3px solid #2AABBF' }}>
        <Zap size={14} style={{ color: '#2AABBF' }} />
        <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
          Sistema detectó
        </h2>
        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: '#2AABBF' }}>
          {sugerencias.length}
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {sugerencias.map(s => (
          <div key={s.key} className="flex items-start gap-3 px-5 py-3.5">
            <ClipboardList size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-600">{s.titulo}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.descripcion}</p>
            </div>
            <Link href={s.href}
              className="flex-shrink-0 text-xs px-3 py-1 rounded-lg font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
              {s.accion}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Resumen clínico inline bar ────────────────────────────────────────────

function ResumenBar({ bandeja, alertasCriticas, urgentes }: { bandeja: number; alertasCriticas: number; urgentes: number }) {
  if (bandeja === 0 && alertasCriticas === 0 && urgentes === 0) return null
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {alertasCriticas > 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #fecaca' }}>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-red-700">{alertasCriticas}</span>
          <span className="text-xs text-red-600">alerta{alertasCriticas !== 1 ? 's' : ''} crítica{alertasCriticas !== 1 ? 's' : ''}</span>
        </div>
      )}
      {bandeja > 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
          style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
          <Bell size={13} className="text-purple-600" />
          <span className="text-sm font-bold text-purple-700">{bandeja}</span>
          <span className="text-xs text-purple-600">en bandeja</span>
        </div>
      )}
      {urgentes > 0 && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
          style={{ backgroundColor: '#FFFBEB', border: '1px solid #fde68a' }}>
          <span className="text-sm font-bold text-amber-700">⚡ {urgentes}</span>
          <span className="text-xs text-amber-600">pendiente{urgentes !== 1 ? 's' : ''} urgente{urgentes !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────

export async function CentroMandoSections() {
  const data = await getCentroMandoData()
  const { bandeja, alertasClinicas, pendientesUrgentes, sugerencias, totales } = data

  const tieneContenido =
    bandeja.length > 0 ||
    alertasClinicas.length > 0 ||
    pendientesUrgentes.length > 0 ||
    sugerencias.length > 0

  if (!tieneContenido) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl"
        style={{ backgroundColor: '#ECFDF5', border: '1px solid #a7f3d0' }}>
        <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Todo en orden</p>
          <p className="text-xs text-green-600 mt-0.5">
            Sin alertas clínicas ni notificaciones de coordinación pendientes
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResumenBar
        bandeja={totales.bandeja}
        alertasCriticas={totales.alertasCriticas}
        urgentes={totales.urgentes}
      />
      {bandeja.length > 0          && <BandejaSection  entries={bandeja}            />}
      {alertasClinicas.length > 0  && <AlertasSection  alertas={alertasClinicas}    />}
      {pendientesUrgentes.length > 0 && <PendientesSection pendientes={pendientesUrgentes} />}
      {sugerencias.length > 0      && <SugerenciasSection sugerencias={sugerencias} />}
    </div>
  )
}
