'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AsignarEnfermeroDrawer } from './AsignarEnfermeroDrawer'
import {
  cambiarEstadoAsignacion, marcarPrincipal
} from '@/lib/actions/equipo-cuidado'
import {
  Users, Plus, Star, Clock, History, ChevronDown, ChevronUp,
  Pause, Play, XCircle, AlertCircle,
  Calendar, Phone
} from 'lucide-react'
import type { EquipoCuidado, EnfermeroSugerido, RolEquipo } from '@/types'

// ── Config de estado ───────────────────────────────────────────
const ESTADO_CONFIG = {
  activa:     { label: 'Activa',     color: '#059669', bg: '#ECFDF5' },
  pendiente:  { label: 'Pendiente',  color: '#d97706', bg: '#FEF3C7' },
  pausada:    { label: 'Pausada',    color: '#6b7280', bg: '#F3F4F6' },
  finalizada: { label: 'Finalizada', color: '#9ca3af', bg: '#F3F4F6' },
  rechazada:  { label: 'Rechazada',  color: '#dc2626', bg: '#FEF2F2' },
}

const ROL_CONFIG: Record<RolEquipo, { label: string; color: string; bg: string }> = {
  titular:     { label: 'Titular',     color: '#6366F1', bg: '#EEF2FF' },
  habitual:    { label: 'Habitual',    color: '#2AABBF', bg: '#ECFEFF' },
  suplente:    { label: 'Suplente',    color: '#d97706', bg: '#FEF3C7' },
  coordinador: { label: 'Coordinador', color: '#7c3aed', bg: '#F3E8FF' },
  apoyo:       { label: 'Apoyo',       color: '#6b7280', bg: '#F3F4F6' },
}

const HORARIO_LABEL: Record<string, string> = {
  matutino:        'Matutino',
  vespertino:      'Vespertino',
  nocturno:        'Nocturno',
  mixto:           'Mixto',
  sin_horario_fijo: 'Según disponibilidad',
}

function formatFecha(f: string) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Tarjeta de miembro activo ───────────────────────────────────
function MiembroCard({
  asignacion, onRefresh,
}: { asignacion: EquipoCuidado; onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [confirmFinalizacion, setConfirmFinalizacion] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const e = asignacion.enfermero!
  const rolCfg = ROL_CONFIG[asignacion.rol]
  const estadoCfg = ESTADO_CONFIG[asignacion.estado]

  function accion(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const r = await fn()
      if (r.error) setError(r.error)
      else { setError(null); setConfirmFinalizacion(false); onRefresh() }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 relative"
          style={{ backgroundColor: '#1B2B4B' }}>
          {e.nombre[0]}{e.apellido[0]}
          {asignacion.es_principal && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
              <Star size={9} fill="white" color="white" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{e.nombre} {e.apellido}</p>
            {asignacion.es_principal && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#FEF3C7', color: '#92400e' }}>Principal</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: rolCfg.bg, color: rolCfg.color }}>
              {rolCfg.label}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: estadoCfg.bg, color: estadoCfg.color }}>
              {estadoCfg.label}
            </span>
          </div>

          <div className="mt-2 space-y-0.5 text-xs text-gray-400">
            <p className="flex items-center gap-1.5">
              <Clock size={11} /> {HORARIO_LABEL[asignacion.horario]}
            </p>
            <p className="flex items-center gap-1.5">
              <Calendar size={11} /> Desde {formatFecha(asignacion.fecha_inicio)}
              {asignacion.fecha_fin && ` · Hasta ${formatFecha(asignacion.fecha_fin)}`}
            </p>
            {e.telefono && (
              <p className="flex items-center gap-1.5"><Phone size={11} /> {e.telefono}</p>
            )}
          </div>
        </div>
      </div>

      {/* Error inline */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs p-2 rounded-lg"
          style={{ backgroundColor: '#FEF2F2', color: '#dc2626' }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Confirmación finalización */}
      {confirmFinalizacion && (
        <div className="mt-3 p-3 rounded-xl space-y-2"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #fca5a5' }}>
          <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>
            ¿Confirmar finalización de la participación?
          </p>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={2}
            placeholder="Motivo (opcional)..."
            className="w-full px-2.5 py-2 rounded-lg border border-red-200 text-xs outline-none focus:border-red-400 bg-white"
          />
          <div className="flex gap-2">
            <button onClick={() => setConfirmFinalizacion(false)}
              className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white">
              Cancelar
            </button>
            <button
              onClick={() => accion(() => cambiarEstadoAsignacion(asignacion.id, 'finalizada', motivo || undefined))}
              disabled={isPending}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#dc2626' }}>
              Finalizar
            </button>
          </div>
        </div>
      )}

      {/* Acciones */}
      {!confirmFinalizacion && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {!asignacion.es_principal && asignacion.estado === 'activa' && (
            <button
              onClick={() => accion(() => marcarPrincipal(asignacion.id))}
              disabled={isPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-50 bg-white transition-all disabled:opacity-50">
              <Star size={11} /> Principal
            </button>
          )}
          {asignacion.estado === 'activa' && (
            <button
              onClick={() => accion(() => cambiarEstadoAsignacion(asignacion.id, 'pausada'))}
              disabled={isPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white transition-all disabled:opacity-50">
              <Pause size={11} /> Pausar
            </button>
          )}
          {asignacion.estado === 'pausada' && (
            <button
              onClick={() => accion(() => cambiarEstadoAsignacion(asignacion.id, 'activa'))}
              disabled={isPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 bg-white transition-all disabled:opacity-50">
              <Play size={11} /> Reactivar
            </button>
          )}
          <button
            onClick={() => setConfirmFinalizacion(true)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 bg-white transition-all disabled:opacity-50">
            <XCircle size={11} /> Finalizar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tarjeta pendiente ──────────────────────────────────────────
function PendienteCard({
  asignacion, onRefresh,
}: { asignacion: EquipoCuidado; onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const e = asignacion.enfermero!

  function accion(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const r = await fn()
      if (r.error) setError(r.error)
      else { setError(null); onRefresh() }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-4"
      style={{ backgroundColor: '#FFFBEB' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ backgroundColor: '#1B2B4B' }}>
          {e.nombre[0]}{e.apellido[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{e.nombre} {e.apellido}</p>
          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
            <Clock size={10} /> Esperando aceptación · {ROL_CONFIG[asignacion.rol].label}
          </p>
        </div>
      </div>
      {error && (
        <p className="text-xs mt-2 p-2 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#dc2626' }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => accion(() => cambiarEstadoAsignacion(asignacion.id, 'finalizada', 'Cancelado por coordinación'))}
          disabled={isPending}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white transition-all disabled:opacity-50">
          <XCircle size={11} /> Cancelar invitación
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────
interface Props {
  pacienteId: string
  pacienteNombre: string
  activos: EquipoCuidado[]
  pendientes: EquipoCuidado[]
  historial: EquipoCuidado[]
  enfermerosSugeridos: EnfermeroSugerido[]
}

export function EquipoCuidadoClient({
  pacienteId, pacienteNombre,
  activos: activosInit,
  pendientes: pendientesInit,
  historial: historialInit,
  enfermerosSugeridos,
}: Props) {
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [historialAbierto, setHistorialAbierto] = useState(false)

  const onRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  const activos   = activosInit
  const pendientes = pendientesInit
  const historial  = historialInit

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Equipo de cuidado</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activos.length} miembro{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}
            {pendientes.length > 0 && ` · ${pendientes.length} pendiente${pendientes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex-shrink-0"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={15} /> Asignar enfermero
        </button>
      </div>

      {/* ── EQUIPO ACTIVO ── */}
      {activos.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Equipo activo
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activos.map(a => (
              <MiembroCard key={a.id} asignacion={a} onRefresh={onRefresh} />
            ))}
          </div>
        </section>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Users size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">Sin equipo asignado aún</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Este paciente aún no tiene enfermeros asignados. Usa el botón &ldquo;Asignar enfermero&rdquo; para comenzar a construir su equipo de cuidado.
          </p>
        </div>
      )}

      {/* ── PENDIENTES ── */}
      {pendientes.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock size={12} />
            Invitaciones pendientes ({pendientes.length})
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {pendientes.map(p => (
              <PendienteCard key={p.id} asignacion={p} onRefresh={onRefresh} />
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
            Historial ({historial.length})
            {historialAbierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {historialAbierto && (
            <div className="mt-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Enfermero</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Rol</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Periodo</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(h => {
                    const e = h.enfermero!
                    const estadoCfg = ESTADO_CONFIG[h.estado]
                    const rolCfg = ROL_CONFIG[h.rol]
                    return (
                      <tr key={h.id} className="border-b border-gray-50 last:border-0">
                        <td className="p-3">
                          <p className="font-medium text-gray-700">{e.nombre} {e.apellido}</p>
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
                        <td className="p-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: estadoCfg.bg, color: estadoCfg.color }}>
                            {estadoCfg.label}
                          </span>
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

      {/* ── DRAWER ── */}
      <AsignarEnfermeroDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pacienteId={pacienteId}
        pacienteNombre={pacienteNombre}
        enfermerosSugeridos={enfermerosSugeridos}
        onSuccess={onRefresh}
      />
    </div>
  )
}
