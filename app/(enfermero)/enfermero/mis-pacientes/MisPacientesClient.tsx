'use client'

import { useState, useTransition } from 'react'
import { aceptarAsignacion, rechazarAsignacion } from '@/lib/actions/equipo-cuidado'
import { useRouter } from 'next/navigation'
import {
  Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Heart, AlertTriangle, Calendar, ArrowRight, History
} from 'lucide-react'
import Link from 'next/link'
import type { EquipoCuidado, RolEquipo } from '@/types'

const ROL_CONFIG: Record<RolEquipo, { label: string; color: string; bg: string }> = {
  titular:     { label: 'Titular',     color: '#6366F1', bg: '#EEF2FF' },
  habitual:    { label: 'Habitual',    color: '#2AABBF', bg: '#ECFEFF' },
  suplente:    { label: 'Suplente',    color: '#d97706', bg: '#FEF3C7' },
  coordinador: { label: 'Coordinador', color: '#7c3aed', bg: '#F3E8FF' },
  apoyo:       { label: 'Apoyo',       color: '#6b7280', bg: '#F3F4F6' },
}

const ESTADO_CONFIG = {
  activa:     { label: 'Activa',    color: '#059669', bg: '#ECFDF5' },
  pendiente:  { label: 'Pendiente', color: '#d97706', bg: '#FEF3C7' },
  pausada:    { label: 'Pausada',   color: '#6b7280', bg: '#F3F4F6' },
  finalizada: { label: 'Fin.',      color: '#9ca3af', bg: '#F3F4F6' },
  rechazada:  { label: 'Rechaz.',   color: '#dc2626', bg: '#FEF2F2' },
}

function formatFecha(f: string) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Tarjeta de paciente activo ─────────────────────────────────
function PacienteCard({ asignacion }: { asignacion: EquipoCuidado }) {
  const p = asignacion.paciente!
  const rolCfg = ROL_CONFIG[asignacion.rol]
  const estadoCfg = ESTADO_CONFIG[asignacion.estado]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ backgroundColor: '#2AABBF' }}>
          {p.nombre[0]}{p.apellido[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre} {p.apellido}</p>
          {p.diagnostico && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.diagnostico}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: rolCfg.bg, color: rolCfg.color }}>
              {rolCfg.label}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: estadoCfg.bg, color: estadoCfg.color }}>
              {estadoCfg.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50 space-y-1 text-xs text-gray-400">
        <p className="flex items-center gap-1.5">
          <Calendar size={11} /> En el equipo desde {formatFecha(asignacion.fecha_inicio)}
        </p>
        {p.contexto && (
          <p className="flex items-center gap-1.5">
            <Heart size={11} /> {p.contexto === 'domicilio' ? 'Domicilio' : p.contexto === 'hospital' ? 'Hospital' : 'Casa de reposo'}
          </p>
        )}
      </div>

      <Link
        href={`/pacientes/${p.id}`}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
        style={{ backgroundColor: '#1B2B4B', color: 'white' }}>
        Ver paciente <ArrowRight size={12} />
      </Link>
    </div>
  )
}

// ── Tarjeta de invitación pendiente ────────────────────────────
function InvitacionCard({ asignacion, onRefresh }: { asignacion: EquipoCuidado; onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const p = asignacion.paciente!
  const rolCfg = ROL_CONFIG[asignacion.rol]

  function accion(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const r = await fn()
      if (r.error) setError(r.error)
      else { setError(null); setRechazando(false); onRefresh() }
    })
  }

  return (
    <div className="bg-white rounded-xl border-2 border-amber-200 p-4"
      style={{ backgroundColor: '#FFFBEB' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-xs font-semibold text-amber-700">Nueva invitación de asignación</p>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ backgroundColor: '#1B2B4B' }}>
          {p.nombre[0]}{p.apellido[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{p.nombre} {p.apellido}</p>
          {p.diagnostico && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.diagnostico}</p>
          )}
          <span className="mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: rolCfg.bg, color: rolCfg.color }}>
            {rolCfg.label}
          </span>
        </div>
      </div>

      {asignacion.motivo_asignacion && (
        <div className="mt-3 p-2.5 rounded-lg bg-white border border-amber-100">
          <p className="text-xs text-gray-600 italic">&ldquo;{asignacion.motivo_asignacion}&rdquo;</p>
        </div>
      )}

      {error && (
        <p className="text-xs mt-2 p-2 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#dc2626' }}>{error}</p>
      )}

      {rechazando ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={2}
            placeholder="Motivo del rechazo (opcional)..."
            className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-gray-300 bg-white"
          />
          <div className="flex gap-2">
            <button onClick={() => setRechazando(false)}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 bg-white font-medium">
              Cancelar
            </button>
            <button
              onClick={() => accion(() => rechazarAsignacion(asignacion.id, motivo || undefined))}
              disabled={isPending}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#dc2626' }}>
              Confirmar rechazo
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setRechazando(true)}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 bg-white transition-all disabled:opacity-50">
            <XCircle size={12} /> Rechazar
          </button>
          <button
            onClick={() => accion(() => aceptarAsignacion(asignacion.id))}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: '#059669' }}>
            <CheckCircle2 size={12} /> Aceptar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────
interface Props {
  activos: EquipoCuidado[]
  pendientes: EquipoCuidado[]
  historial: EquipoCuidado[]
}

export function MisPacientesClient({ activos, pendientes, historial }: Props) {
  const router = useRouter()
  const [historialAbierto, setHistorialAbierto] = useState(false)

  function onRefresh() { router.refresh() }

  if (activos.length === 0 && pendientes.length === 0 && historial.length === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ backgroundColor: '#ECFEFF' }}>
            <Heart size={30} style={{ color: '#2AABBF' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1B2B4B' }}>Aún no tienes pacientes</h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Cuando formes parte de un equipo de cuidado, aquí encontrarás la información necesaria
              para preparar y dar seguimiento a tu servicio.
            </p>
          </div>
          <div className="p-4 rounded-xl text-left space-y-2" style={{ backgroundColor: '#F0FDFF', border: '1px solid #A5F3FC' }}>
            <p className="text-xs font-semibold" style={{ color: '#2AABBF' }}>¿Qué encontrarás aquí?</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li className="flex items-center gap-2"><CheckCircle2 size={10} style={{ color: '#2AABBF' }} /> Información del paciente asignado</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={10} style={{ color: '#2AABBF' }} /> Tu rol dentro del equipo</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={10} style={{ color: '#2AABBF' }} /> Próximas y últimas guardias</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={10} style={{ color: '#2AABBF' }} /> Alertas e indicaciones relevantes</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7 max-w-3xl mx-auto pb-8">

      {/* ── HEADER ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Mis Pacientes</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Pacientes en cuyos equipos de cuidado participas
        </p>
      </div>

      {/* ── INVITACIONES PENDIENTES ── */}
      {pendientes.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-amber-700">
              Tienes {pendientes.length} invitación{pendientes.length !== 1 ? 'es' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendientes.map(p => (
              <InvitacionCard key={p.id} asignacion={p} onRefresh={onRefresh} />
            ))}
          </div>
        </section>
      )}

      {/* ── PACIENTES ACTIVOS ── */}
      {activos.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Pacientes activos ({activos.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activos.map(a => (
              <PacienteCard key={a.id} asignacion={a} />
            ))}
          </div>
        </section>
      )}

      {/* ── HISTORIAL ── */}
      {historial.length > 0 && (
        <section>
          <button
            onClick={() => setHistorialAbierto(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors">
            <History size={12} />
            Servicios anteriores ({historial.length})
            {historialAbierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {historialAbierto && (
            <div className="mt-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Paciente</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Rol</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Periodo</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(h => {
                    const p = h.paciente!
                    const rolCfg = ROL_CONFIG[h.rol]
                    return (
                      <tr key={h.id} className="border-b border-gray-50 last:border-0">
                        <td className="p-3">
                          <p className="font-medium text-gray-700">{p.nombre} {p.apellido}</p>
                          {p.diagnostico && <p className="text-xs text-gray-400">{p.diagnostico}</p>}
                        </td>
                        <td className="p-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: rolCfg.bg, color: rolCfg.color }}>
                            {rolCfg.label}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {formatFecha(h.fecha_inicio)}
                          {h.fecha_fin && ` — ${formatFecha(h.fecha_fin)}`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
