'use client'

import { useTransition, useState } from 'react'
import { crearCaso, actualizarCaso } from '@/lib/actions/casos'
import type { Caso, Paciente } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const INPUT_ERR = "w-full px-3 py-2 rounded-lg border border-red-300 text-sm outline-none focus:border-red-400 transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"
const FIELD_ERR = "text-xs text-red-500 mt-1"

interface Props {
  caso?: Caso
  pacientes: Paciente[]
}

export function CasoForm({ caso, pacientes }: Props) {
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
        const result = caso
          ? await actualizarCaso(caso.id, formData)
          : await crearCaso(formData)
        // Si llega aquí es porque hubo error (redirect lanza y no retorna)
        if (result?.fieldErrors) setFieldErrors(result.fieldErrors)
        if (result?.error) setError(result.error)
      } catch (err) {
        // NEXT_REDIRECT no es un error real — Next.js lo maneja internamente
        if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) return
        setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Paciente y título */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Información del caso</h2>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Paciente *</label>
            <select name="paciente_id" defaultValue={caso?.paciente_id ?? ''} className={inp('paciente_id')}>
              <option value="" disabled>Selecciona un paciente...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
              ))}
            </select>
            {fieldErrors.paciente_id && <p className={FIELD_ERR}>{fieldErrors.paciente_id}</p>}
            {pacientes.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No hay pacientes activos. <a href="/pacientes/nuevo" className="underline">Crear paciente</a>
              </p>
            )}
          </div>
          <div>
            <label className={LABEL}>Título del caso *</label>
            <input name="titulo" defaultValue={caso?.titulo} className={inp('titulo')}
              placeholder="ej: Cuidado post-operatorio — Ana González" />
            {fieldErrors.titulo && <p className={FIELD_ERR}>{fieldErrors.titulo}</p>}
          </div>
          {caso && (
            <div>
              <label className={LABEL}>Status</label>
              <select name="status" defaultValue={caso.status} className={INPUT}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Logística */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Logística</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Contexto *</label>
            <select name="contexto" defaultValue={caso?.contexto ?? 'domicilio'} className={inp('contexto')}>
              <option value="domicilio">Domicilio</option>
              <option value="hospital">Hospital</option>
              <option value="casa_reposo">Casa de reposo</option>
            </select>
            {fieldErrors.contexto && <p className={FIELD_ERR}>{fieldErrors.contexto}</p>}
          </div>
          <div>
            <label className={LABEL}>Tarifa por hora *</label>
            <input name="tarifa_hora" type="number" step="0.01" min="0"
              defaultValue={caso?.tarifa_hora} className={inp('tarifa_hora')} placeholder="0.00" />
            {fieldErrors.tarifa_hora && <p className={FIELD_ERR}>{fieldErrors.tarifa_hora}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Dirección / Ubicación *</label>
            <input name="direccion" defaultValue={caso?.direccion} className={inp('direccion')}
              placeholder="Av. Principal, Clínica Las Mercedes, piso 3, hab 302" />
            {fieldErrors.direccion && <p className={FIELD_ERR}>{fieldErrors.direccion}</p>}
          </div>
          <div>
            <label className={LABEL}>Fecha de inicio *</label>
            <input name="fecha_inicio" type="date"
              defaultValue={caso?.fecha_inicio ?? new Date().toISOString().split('T')[0]}
              className={inp('fecha_inicio')} />
            {fieldErrors.fecha_inicio && <p className={FIELD_ERR}>{fieldErrors.fecha_inicio}</p>}
          </div>
          <div>
            <label className={LABEL}>Fecha de cierre estimada</label>
            <input name="fecha_fin" type="date" defaultValue={caso?.fecha_fin ?? ''} className={INPUT} />
          </div>
        </div>
      </section>

      {/* Notas clínicas */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Notas para los enfermeros</h2>
        <textarea name="notas" defaultValue={caso?.notas ?? ''} rows={4} className={INPUT}
          placeholder="Indicaciones especiales, acceso al domicilio, equipo disponible, preferencias del paciente..." />
        <p className="text-xs text-gray-400 mt-1.5">
          Esta información será visible para los enfermeros asignados al caso.
        </p>
      </section>

      {error && !Object.keys(fieldErrors).length && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
      )}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          Revisa los campos marcados en rojo.
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <a href="/casos"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
          Cancelar
        </a>
        <button type="submit" disabled={isPending}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
          style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
          {isPending ? 'Guardando...' : caso ? 'Guardar cambios' : 'Crear caso'}
        </button>
      </div>
    </form>
  )
}
