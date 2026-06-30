'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { crearTurno } from '@/lib/actions/turnos'
import { AlertTriangle, Users, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import type { Caso, Enfermero, EquipoCuidado } from '@/types'

function calcHoras(inicio: string, fin: string): string | null {
  if (!inicio || !fin) return null
  const h = (new Date(fin).getTime() - new Date(inicio).getTime()) / 3600000
  if (h <= 0) return null
  const dias = Math.floor(h / 24)
  const hRest = Math.round((h % 24) * 10) / 10
  if (dias > 0) return `${dias}d ${hRest}h = ${h.toFixed(1)}h total`
  return `${h.toFixed(1)}h`
}

const INPUT     = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const INPUT_ERR = "w-full px-3 py-2 rounded-lg border border-red-300 text-sm outline-none focus:border-red-400 transition-all bg-white"
const LABEL     = "block text-xs font-medium text-gray-500 mb-1"
const FIELD_ERR = "text-xs text-red-500 mt-1"

const ROL_LABEL: Record<string, string> = {
  titular: 'Titular', habitual: 'Habitual', suplente: 'Suplente',
  coordinador: 'Coordinador', apoyo: 'Apoyo',
}

interface Props {
  casos: Caso[]
  enfermeros: Enfermero[]
  defaultCasoId?: string
  equipoHabitual?: EquipoCuidado[]
}

export function TurnoForm({ casos, enfermeros, defaultCasoId, equipoHabitual = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError]         = useState<string | null>(null)
  const [warning, setWarning]     = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [selectedCasoId,      setSelectedCasoId]      = useState(defaultCasoId ?? '')
  const [selectedEnfermeroId, setSelectedEnfermeroId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin,    setFechaFin]    = useState('')

  // Equipo dinámico — se actualiza al cambiar el caso
  const [equipoActual,     setEquipoActual]     = useState<EquipoCuidado[]>(equipoHabitual)
  const [fetchingEquipo,   setFetchingEquipo]   = useState(false)

  // Sugerencia de suplente
  const [agregarSuplente, setAgregarSuplente] = useState(false)

  // Confirmación de conflicto
  const [confirmarConflicto, setConfirmarConflicto] = useState(false)

  const preview = calcHoras(fechaInicio, fechaFin)

  // Fetch equipo cuando cambia el caso
  const fetchEquipo = useCallback(async (casoId: string) => {
    if (!casoId) { setEquipoActual([]); return }
    setFetchingEquipo(true)
    try {
      const res = await fetch(`/api/equipo-cuidado?caso_id=${casoId}`)
      if (res.ok) {
        const data = await res.json()
        setEquipoActual(Array.isArray(data) ? data : [])
      }
    } catch {
      setEquipoActual([])
    } finally {
      setFetchingEquipo(false)
    }
  }, [])

  // Al montar: si hay defaultCasoId sin equipoHabitual del servidor, fetch
  useEffect(() => {
    if (defaultCasoId && equipoHabitual.length === 0) {
      fetchEquipo(defaultCasoId)
    }
  }, [defaultCasoId, equipoHabitual.length, fetchEquipo])

  function handleCasoChange(casoId: string) {
    setSelectedCasoId(casoId)
    setSelectedEnfermeroId('')
    setAgregarSuplente(false)
    setWarning(null)
    fetchEquipo(casoId)
  }

  function handleEnfermeroChange(enfermeroId: string) {
    setSelectedEnfermeroId(enfermeroId)
    setAgregarSuplente(false)
    setConfirmarConflicto(false)
    setWarning(null)
  }

  function inp(name: string) {
    return fieldErrors[name] ? INPUT_ERR : INPUT
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Si hay advertencia de conflicto y no confirmó, no proceder
    if (warning && !confirmarConflicto) return

    setError(null)
    setWarning(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    formData.set('caso_id', selectedCasoId)
    formData.set('enfermero_id', selectedEnfermeroId)
    formData.set('agregar_suplente', String(agregarSuplente && !enfermeroestaEnEquipo))
    formData.set('confirmar_conflicto', String(confirmarConflicto))

    startTransition(async () => {
      try {
        const result = await crearTurno(formData)
        if (result?.fieldErrors) {
          setFieldErrors(result.fieldErrors)
        } else if (result?.warning) {
          setWarning(result.warning)
        } else if (result?.error) {
          setError(result.error)
        } else {
          window.location.href = '/turnos?ok=created'
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  const casosActivos     = casos.filter(c => c.status === 'activo')
  const enfermerosDisp   = enfermeros.filter(e => e.disponible)
  const enfermerosNoDisp = enfermeros.filter(e => !e.disponible)

  const equipoIds = new Set(equipoActual.map(a => a.enfermero_id))
  const enfermerosEquipo    = enfermerosDisp.filter(e => equipoIds.has(e.id))
  const enfermerosRestantes = enfermerosDisp.filter(e => !equipoIds.has(e.id))

  const enfermeroestaEnEquipo = equipoIds.has(selectedEnfermeroId)
  const enfermeroSeleccionado = enfermeros.find(e => e.id === selectedEnfermeroId)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Asignar turno</h1>
        <p className="text-sm text-gray-500 mt-1">Programa un turno para un enfermero en un caso activo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-5">

          {/* Caso */}
          <div>
            <label className={LABEL}>Caso *</label>
            <select
              name="caso_id"
              value={selectedCasoId}
              onChange={e => handleCasoChange(e.target.value)}
              className={inp('caso_id')}>
              <option value="" disabled>Seleccionar caso...</option>
              {casosActivos.map(c => (
                <option key={c.id} value={c.id}>{c.titulo}</option>
              ))}
            </select>
            {fieldErrors.caso_id && <p className={FIELD_ERR}>{fieldErrors.caso_id}</p>}
            {casosActivos.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay casos activos. Crea uno primero.</p>
            )}
          </div>

          {/* Enfermero con grupos dinámicos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={LABEL} style={{ marginBottom: 0 }}>Enfermero/a *</label>
              {fetchingEquipo && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Loader2 size={11} className="animate-spin" /> Actualizando equipo...
                </span>
              )}
              {!fetchingEquipo && equipoActual.length > 0 && (
                <span className="flex items-center gap-1 text-xs"
                  style={{ color: '#2AABBF' }}>
                  <Users size={11} /> {equipoActual.length} en equipo
                </span>
              )}
            </div>
            <select
              name="enfermero_id"
              value={selectedEnfermeroId}
              onChange={e => handleEnfermeroChange(e.target.value)}
              className={inp('enfermero_id')}>
              <option value="" disabled>Seleccionar enfermero/a...</option>
              {enfermerosEquipo.length > 0 && (
                <optgroup label="── Equipo habitual del paciente ──">
                  {enfermerosEquipo.map(e => {
                    const asig = equipoActual.find(a => a.enfermero_id === e.id)
                    const rolLabel = asig ? ` (${ROL_LABEL[asig.rol] ?? asig.rol})` : ''
                    return (
                      <option key={e.id} value={e.id}>{e.nombre} {e.apellido}{rolLabel}</option>
                    )
                  })}
                </optgroup>
              )}
              <optgroup label={enfermerosEquipo.length > 0 ? '── Otros disponibles ──' : '── Enfermeros disponibles ──'}>
                {enfermerosRestantes.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
                ))}
              </optgroup>
              {enfermerosNoDisp.length > 0 && (
                <optgroup label="── No disponibles ──">
                  {enfermerosNoDisp.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.apellido} (no disponible)</option>
                  ))}
                </optgroup>
              )}
            </select>
            {fieldErrors.enfermero_id && <p className={FIELD_ERR}>{fieldErrors.enfermero_id}</p>}
          </div>

          {/* Sugerencia: agregar al equipo */}
          {selectedEnfermeroId && !enfermeroestaEnEquipo && selectedCasoId && enfermeroSeleccionado && (
            <div className="flex items-start gap-3 p-3 rounded-xl border"
              style={{ backgroundColor: '#F0F4FF', borderColor: '#C7D2FE' }}>
              <Users size={14} style={{ color: '#4F46E5' }} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: '#3730A3' }}>
                  {enfermeroSeleccionado.nombre} {enfermeroSeleccionado.apellido} no está en el equipo de este paciente
                </p>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agregarSuplente}
                    onChange={e => setAgregarSuplente(e.target.checked)}
                    className="accent-[#4F46E5]"
                  />
                  <span className="text-xs text-indigo-700">
                    Agregar también como suplente autorizado del paciente
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Fecha y hora inicio *</label>
              <input name="fecha_inicio" type="datetime-local" className={inp('fecha_inicio')}
                value={fechaInicio} onChange={e => { setFechaInicio(e.target.value); setWarning(null); setConfirmarConflicto(false) }} />
              {fieldErrors.fecha_inicio && <p className={FIELD_ERR}>{fieldErrors.fecha_inicio}</p>}
            </div>
            <div>
              <label className={LABEL}>Fecha y hora fin *</label>
              <input name="fecha_fin" type="datetime-local" className={inp('fecha_fin')}
                value={fechaFin} onChange={e => { setFechaFin(e.target.value); setWarning(null); setConfirmarConflicto(false) }} />
              {fieldErrors.fecha_fin && <p className={FIELD_ERR}>{fieldErrors.fecha_fin}</p>}
            </div>
          </div>

          {/* Preview duración */}
          {preview && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              parseFloat(preview) > 48
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-[#EBF8FB] text-[#1A7A8C]'
            }`}>
              <Clock size={13} />
              <span>Duración: <strong>{preview}</strong></span>
              {parseFloat(preview) > 48 && (
                <span className="text-xs font-normal">— ¿Seguro que la fecha de fin es correcta?</span>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className={LABEL}>Notas / instrucciones</label>
            <textarea name="notas_entrega" rows={3} className={INPUT}
              placeholder="Instrucciones especiales para el enfermero, indicaciones de entrega de turno..." />
          </div>
        </div>

        {/* Advertencia de conflicto de horario */}
        {warning && (
          <div className="rounded-xl border p-4 space-y-3"
            style={{ backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Conflicto de horario detectado</p>
                <p className="text-xs text-amber-700 mt-0.5">{warning}</p>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmarConflicto}
                onChange={e => setConfirmarConflicto(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-xs text-amber-800 font-medium">
                Entiendo el conflicto y quiero asignar el turno de todas formas
              </span>
            </label>
          </div>
        )}

        {/* Error de validación */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-200">
            {error}
          </div>
        )}
        {Object.keys(fieldErrors).length > 0 && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            Revisa los campos marcados en rojo.
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <a href="/turnos"
            className="px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:border-gray-300 bg-white text-gray-600 transition-all">
            Cancelar
          </a>
          <button
            type="submit"
            disabled={isPending || (!!warning && !confirmarConflicto)}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50"
            style={{ backgroundColor: '#2AABBF' }}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 size={14} /> Asignar turno
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
