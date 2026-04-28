'use client'

import { useState, useTransition } from 'react'
import { crearTurno } from '@/lib/actions/turnos'
import type { Caso, Enfermero } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const INPUT_ERR = "w-full px-3 py-2 rounded-lg border border-red-300 text-sm outline-none focus:border-red-400 transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"
const FIELD_ERR = "text-xs text-red-500 mt-1"

interface Props {
  casos: Caso[]
  enfermeros: Enfermero[]
  defaultCasoId?: string
}

export function TurnoForm({ casos, enfermeros, defaultCasoId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function inp(name: string) {
    return fieldErrors[name] ? INPUT_ERR : INPUT
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        const result = await crearTurno(formData)
        if (result?.fieldErrors) setFieldErrors(result.fieldErrors)
        if (result?.error) setError(result.error)
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) return
        setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  const casosActivos     = casos.filter(c => c.status === 'activo')
  const enfermerosDisp   = enfermeros.filter(e => e.disponible)
  const enfermerosNoDisp = enfermeros.filter(e => !e.disponible)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Asignar turno</h1>
        <p className="text-sm text-gray-500 mt-1">Programa un turno para un enfermero en un caso activo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-5">

          <div>
            <label className={LABEL}>Caso *</label>
            <select name="caso_id" defaultValue={defaultCasoId ?? ''} className={inp('caso_id')}>
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

          <div>
            <label className={LABEL}>Enfermero/a *</label>
            <select name="enfermero_id" className={inp('enfermero_id')}>
              <option value="" disabled>Seleccionar enfermero/a...</option>
              {enfermerosDisp.map(e => (
                <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
              ))}
              {enfermerosNoDisp.length > 0 && (
                <>
                  <option disabled>── No disponibles ──</option>
                  {enfermerosNoDisp.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre} {e.apellido} (no disponible)</option>
                  ))}
                </>
              )}
            </select>
            {fieldErrors.enfermero_id && <p className={FIELD_ERR}>{fieldErrors.enfermero_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Fecha y hora inicio *</label>
              <input name="fecha_inicio" type="datetime-local" className={inp('fecha_inicio')} />
              {fieldErrors.fecha_inicio && <p className={FIELD_ERR}>{fieldErrors.fecha_inicio}</p>}
            </div>
            <div>
              <label className={LABEL}>Fecha y hora fin *</label>
              <input name="fecha_fin" type="datetime-local" className={inp('fecha_fin')} />
              {fieldErrors.fecha_fin && <p className={FIELD_ERR}>{fieldErrors.fecha_fin}</p>}
            </div>
          </div>

          <div>
            <label className={LABEL}>Notas / instrucciones</label>
            <textarea name="notas_entrega" rows={3} className={INPUT}
              placeholder="Instrucciones especiales para el enfermero, indicaciones de entrega de turno..." />
          </div>
        </div>

        {error && !Object.keys(fieldErrors).length && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
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
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
            {isPending ? 'Guardando...' : 'Asignar turno'}
          </button>
        </div>
      </form>
    </div>
  )
}
