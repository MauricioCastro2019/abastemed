'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { validarCompetenciaEnfermero } from '@/lib/actions/centro-profesional'
import { otorgarCompetenciaManual, revocarCompetencia } from '@/lib/actions/competencias/enfermero-competencias.actions'
import type { CompetenciaConModulo } from '@/lib/actions/centro-profesional'
import type { EnfermeroCompetencia, EstadoCompetencia } from '@/types'
import {
  Shield, CheckCircle2, Circle, BookOpen, Award,
  ChevronDown, ChevronUp, Loader2, AlertCircle, ShieldOff, ShieldPlus, CalendarClock,
} from 'lucide-react'

const VIGENCIA_CONFIG: Record<'vigente' | 'caducada' | 'revocada', { label: string; color: string; bg: string }> = {
  vigente:  { label: 'Vigente',  color: '#059669', bg: '#ECFDF5' },
  caducada: { label: 'Caducada', color: '#D97706', bg: '#FFFBEB' },
  revocada: { label: 'Revocada', color: '#DC2626', bg: '#FEF2F2' },
}

function vigenciaBadge(mc: EnfermeroCompetencia | undefined) {
  if (!mc?.fecha_otorgada) return null
  // La vigencia real se recalcula en tiempo real (igual que el gate) porque
  // estado_vigencia solo se actualiza cuando corre el cron de caducidad.
  const caducada = mc.fecha_caducidad ? new Date(mc.fecha_caducidad) <= new Date() : false
  const estado: 'vigente' | 'caducada' | 'revocada' =
    mc.estado_vigencia === 'revocada' ? 'revocada' : caducada ? 'caducada' : 'vigente'
  const cfg = VIGENCIA_CONFIG[estado]
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ml-1.5"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <CalendarClock size={10} />
      {cfg.label}
      {estado === 'vigente' && mc.fecha_caducidad && (
        <> hasta {new Date(mc.fecha_caducidad).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</>
      )}
    </span>
  )
}

function versionBadge(mc: EnfermeroCompetencia | undefined, comp: CompetenciaConModulo) {
  if (!mc?.version_otorgada || !comp.version) return null
  if (mc.version_otorgada >= comp.version) return null
  return (
    <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ml-1.5"
      style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
      Versión previa
    </span>
  )
}

const ESTADO_CONFIG: Record<EstadoCompetencia, { label: string; color: string; bg: string }> = {
  no_iniciado:         { label: 'No iniciado',         color: '#9CA3AF', bg: '#F3F4F6' },
  capacitacion_vista:  { label: 'Capacitación vista',  color: '#0284C7', bg: '#E0F2FE' },
  evaluacion_aprobada: { label: 'Evaluación aprobada', color: '#7C3AED', bg: '#EDE9FE' },
  practica_observada:  { label: 'Práctica observada',  color: '#D97706', bg: '#FFFBEB' },
  validado:            { label: 'Validado',            color: '#059669', bg: '#ECFDF5' },
}

interface Props {
  enfermeroId: string
  competencias: CompetenciaConModulo[]
  mis_competencias: EnfermeroCompetencia[]
}

interface FormValidacion {
  competenciaId: string
  nuevoEstado: 'practica_observada' | 'validado'
}

export function CompetenciasEnfermeroWidget({ enfermeroId, competencias, mis_competencias }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandido, setExpandido] = useState(false)
  const [formActivo, setFormActivo] = useState<FormValidacion | null>(null)
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [formOtorgar, setFormOtorgar] = useState(false)
  const [competenciaOtorgar, setCompetenciaOtorgar] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [errorOtorgar, setErrorOtorgar] = useState<string | null>(null)

  const [revocandoId, setRevocandoId] = useState<string | null>(null)
  const [motivoRevocacion, setMotivoRevocacion] = useState('')
  const [errorRevocar, setErrorRevocar] = useState<string | null>(null)

  const miMapeo = new Map(mis_competencias.map(mc => [mc.competencia_id, mc]))

  const pendientesValidacion = competencias.filter(c => {
    const estado = miMapeo.get(c.id)?.estado
    return estado === 'evaluacion_aprobada' || estado === 'practica_observada'
  })

  const validadas = mis_competencias.filter(mc => mc.estado === 'validado').length
  const enProgreso = mis_competencias.filter(mc =>
    mc.estado !== 'no_iniciado' && mc.estado !== 'validado'
  ).length

  function handleAbrirForm(competenciaId: string, estadoActual: EstadoCompetencia) {
    const nuevoEstado: 'practica_observada' | 'validado' =
      estadoActual === 'evaluacion_aprobada' ? 'practica_observada' : 'validado'
    setFormActivo({ competenciaId, nuevoEstado })
    setNotas('')
    setError(null)
  }

  function handleCancelar() {
    setFormActivo(null)
    setNotas('')
    setError(null)
  }

  function handleConfirmar() {
    if (!formActivo) return
    setError(null)
    startTransition(async () => {
      const result = await validarCompetenciaEnfermero(
        enfermeroId,
        formActivo.competenciaId,
        formActivo.nuevoEstado,
        notas.trim() || undefined
      )
      if (result.error) {
        setError(result.error)
      } else {
        setFormActivo(null)
        setNotas('')
        router.refresh()
      }
    })
  }

  function handleOtorgar() {
    if (!competenciaOtorgar || justificacion.trim().length < 10) {
      setErrorOtorgar('Selecciona una competencia y escribe una justificación de al menos 10 caracteres.')
      return
    }
    setErrorOtorgar(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('enfermero_id', enfermeroId)
      formData.set('competencia_id', competenciaOtorgar)
      formData.set('justificacion', justificacion.trim())
      const result = await otorgarCompetenciaManual(formData)
      if (result.error) {
        setErrorOtorgar(result.error)
      } else {
        setFormOtorgar(false)
        setCompetenciaOtorgar('')
        setJustificacion('')
        router.refresh()
      }
    })
  }

  function handleRevocar(enfermeroCompetenciaId: string) {
    if (motivoRevocacion.trim().length < 10) {
      setErrorRevocar('El motivo debe tener al menos 10 caracteres.')
      return
    }
    setErrorRevocar(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('motivo', motivoRevocacion.trim())
      const result = await revocarCompetencia(enfermeroCompetenciaId, formData)
      if (result.error) {
        setErrorRevocar(result.error)
      } else {
        setRevocandoId(null)
        setMotivoRevocacion('')
        router.refresh()
      }
    })
  }

  const competenciasOtorgables = competencias.filter(c => {
    const mc = miMapeo.get(c.id)
    return !mc?.fecha_otorgada
  })

  const sinPendientes = pendientesValidacion.length === 0 && enProgreso === 0

  return (
    <div className="space-y-3">
      {/* Resumen */}
      {sinPendientes ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
          <Circle size={14} />
          {validadas > 0
            ? `${validadas} competencia${validadas !== 1 ? 's' : ''} validada${validadas !== 1 ? 's' : ''}. Sin pendientes de acción.`
            : 'No hay competencias con progreso registrado aún.'}
        </div>
      ) : (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Award size={12} style={{ color: '#059669' }} />
            <span style={{ color: '#059669' }} className="font-semibold">{validadas}</span> validadas
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={12} style={{ color: '#7C3AED' }} />
            <span style={{ color: '#7C3AED' }} className="font-semibold">{enProgreso}</span> en progreso
          </span>
          {pendientesValidacion.length > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle size={12} style={{ color: '#D97706' }} />
              <span style={{ color: '#D97706' }} className="font-semibold">{pendientesValidacion.length}</span> requieren tu acción
            </span>
          )}
        </div>
      )}

      {/* Otorgar manualmente */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <button
          onClick={() => { setFormOtorgar(v => !v); setErrorOtorgar(null) }}
          className="w-full flex items-center gap-2 p-3 text-xs font-medium transition-all"
          style={{ color: '#2AABBF' }}
        >
          <ShieldPlus size={14} />
          Otorgar competencia manualmente
          {formOtorgar ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
        </button>
        {formOtorgar && (
          <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Competencia</label>
              <select
                value={competenciaOtorgar}
                onChange={e => setCompetenciaOtorgar(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#2AABBF] bg-white"
              >
                <option value="" disabled>Seleccionar competencia...</option>
                {competenciasOtorgables.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Justificación <span className="text-gray-400 font-normal">(mín. 10 caracteres, auditable)</span>
              </label>
              <textarea
                value={justificacion}
                onChange={e => setJustificacion(e.target.value)}
                rows={2}
                placeholder="Certificación externa, experiencia previa verificada, etc."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#2AABBF] bg-white resize-none"
              />
            </div>
            {errorOtorgar && <p className="text-xs text-red-600">{errorOtorgar}</p>}
            <button
              onClick={handleOtorgar}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all"
              style={{ backgroundColor: '#2AABBF' }}
            >
              {isPending ? <><Loader2 size={12} className="animate-spin" /> Guardando…</> : <><ShieldPlus size={12} /> Otorgar competencia</>}
            </button>
          </div>
        )}
      </div>

      {/* Pendientes de validación */}
      {pendientesValidacion.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Pendientes de validación</p>
          {pendientesValidacion.map(comp => {
            const mc = miMapeo.get(comp.id)!
            const estado = mc.estado as EstadoCompetencia
            const cfg = ESTADO_CONFIG[estado]
            const esActivo = formActivo?.competenciaId === comp.id

            return (
              <div key={comp.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cfg.bg }}>
                    <Shield size={14} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>
                      {comp.nombre}
                    </p>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {vigenciaBadge(mc)}
                    {versionBadge(mc, comp)}
                    {mc.evaluacion_score !== null && mc.evaluacion_score !== undefined && (
                      <span className="text-xs text-gray-400 ml-2">Evaluación: {mc.evaluacion_score}%</span>
                    )}
                  </div>
                  <button
                    onClick={() => esActivo ? handleCancelar() : handleAbrirForm(comp.id, estado)}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all"
                    style={esActivo
                      ? { borderColor: '#e5e7eb', color: '#6b7280', backgroundColor: 'white' }
                      : { borderColor: '#2AABBF', color: '#2AABBF', backgroundColor: '#EBF8FB' }
                    }
                  >
                    {esActivo ? <><ChevronUp size={12} /> Cancelar</> : (
                      estado === 'evaluacion_aprobada'
                        ? <><CheckCircle2 size={12} /> Marcar observada</>
                        : <><Award size={12} /> Validar</>
                    )}
                  </button>
                  {mc.fecha_otorgada && mc.estado_vigencia !== 'revocada' && (
                    <button
                      onClick={() => { setRevocandoId(v => v === mc.id ? null : mc.id); setErrorRevocar(null) }}
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                    >
                      <ShieldOff size={12} /> Revocar
                    </button>
                  )}
                </div>

                {/* Formulario de revocación */}
                {revocandoId === mc.id && (
                  <div className="border-t border-red-100 bg-red-50 p-3 space-y-2">
                    <label className="block text-xs font-medium text-red-700 mb-1">
                      Motivo de la revocación <span className="text-red-400 font-normal">(mín. 10 caracteres, auditable)</span>
                    </label>
                    <textarea
                      value={motivoRevocacion}
                      onChange={e => setMotivoRevocacion(e.target.value)}
                      rows={2}
                      placeholder="Motivo por el cual se revoca esta competencia..."
                      className="w-full px-3 py-2 rounded-lg border border-red-200 text-xs outline-none focus:border-red-400 bg-white resize-none"
                    />
                    {errorRevocar && <p className="text-xs text-red-600">{errorRevocar}</p>}
                    <button
                      onClick={() => handleRevocar(mc.id)}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all bg-red-600"
                    >
                      {isPending ? <><Loader2 size={12} className="animate-spin" /> Guardando…</> : <><ShieldOff size={12} /> Confirmar revocación</>}
                    </button>
                  </div>
                )}

                {/* Formulario inline */}
                {esActivo && (
                  <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                    <div className="text-xs text-gray-600">
                      {formActivo.nuevoEstado === 'practica_observada'
                        ? 'Confirma que observaste la ejecución del procedimiento por este enfermero.'
                        : 'Confirma que el enfermero ha demostrado la competencia de forma completa y puede realizarla de manera autónoma.'}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <textarea
                        value={notas}
                        onChange={e => setNotas(e.target.value)}
                        rows={2}
                        placeholder="Contexto de la observación, condiciones, fecha real del evento…"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#2AABBF] bg-white resize-none"
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-red-600">{error}</p>
                    )}
                    <button
                      onClick={handleConfirmar}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all"
                      style={{ backgroundColor: formActivo.nuevoEstado === 'validado' ? '#059669' : '#7C3AED' }}
                    >
                      {isPending
                        ? <><Loader2 size={12} className="animate-spin" /> Guardando…</>
                        : formActivo.nuevoEstado === 'practica_observada'
                          ? <><CheckCircle2 size={12} /> Confirmar práctica observada</>
                          : <><Award size={12} /> Confirmar competencia validada</>
                      }
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Ver todas (colapsable) */}
      {mis_competencias.length > pendientesValidacion.length && (
        <button
          onClick={() => setExpandido(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expandido ? <><ChevronUp size={12} /> Ocultar historial</> : <><ChevronDown size={12} /> Ver historial completo ({mis_competencias.length})</>}
        </button>
      )}

      {expandido && (
        <div className="space-y-1.5">
          {mis_competencias
            .filter(mc => mc.estado === 'no_iniciado' || mc.estado === 'capacitacion_vista' || mc.estado === 'validado')
            .map(mc => {
              const comp = competencias.find(c => c.id === mc.competencia_id)
              if (!comp) return null
              const cfg = ESTADO_CONFIG[mc.estado]
              return (
                <div key={mc.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100">
                  <Circle size={8} style={{ color: cfg.color }} className="flex-shrink-0" />
                  <span className="text-xs text-gray-700 flex-1 truncate">{comp.nombre}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  {vigenciaBadge(mc)}
                  {versionBadge(mc, comp)}
                  {mc.fecha_otorgada && mc.estado_vigencia !== 'revocada' && (
                    <button
                      onClick={() => { setRevocandoId(v => v === mc.id ? null : mc.id); setErrorRevocar(null) }}
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                    >
                      <ShieldOff size={11} /> Revocar
                    </button>
                  )}
                </div>
              )
            })}
          {expandido && mis_competencias.some(mc => revocandoId === mc.id && mc.estado === 'validado') && (
            <div className="border border-red-100 bg-red-50 rounded-xl p-3 space-y-2">
              <label className="block text-xs font-medium text-red-700 mb-1">
                Motivo de la revocación <span className="text-red-400 font-normal">(mín. 10 caracteres, auditable)</span>
              </label>
              <textarea
                value={motivoRevocacion}
                onChange={e => setMotivoRevocacion(e.target.value)}
                rows={2}
                placeholder="Motivo por el cual se revoca esta competencia..."
                className="w-full px-3 py-2 rounded-lg border border-red-200 text-xs outline-none focus:border-red-400 bg-white resize-none"
              />
              {errorRevocar && <p className="text-xs text-red-600">{errorRevocar}</p>}
              <button
                onClick={() => revocandoId && handleRevocar(revocandoId)}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all bg-red-600"
              >
                {isPending ? <><Loader2 size={12} className="animate-spin" /> Guardando…</> : <><ShieldOff size={12} /> Confirmar revocación</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
