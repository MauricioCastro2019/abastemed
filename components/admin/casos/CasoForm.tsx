'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCaso, actualizarCaso } from '@/lib/actions/casos'
import type { Caso, Paciente } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

interface Props {
  caso?: Caso
  pacientes: Paciente[]
}

export function CasoForm({ caso, pacientes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (caso) {
          await actualizarCaso(caso.id, formData)
        } else {
          await crearCaso(formData)
        }
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
          setError(err.message)
        }
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
            <select name="paciente_id" defaultValue={caso?.paciente_id ?? ''} required className={INPUT}>
              <option value="" disabled>Selecciona un paciente...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </option>
              ))}
            </select>
            {pacientes.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No hay pacientes activos. <a href="/pacientes/nuevo" className="underline">Crear paciente</a>
              </p>
            )}
          </div>
          <div>
            <label className={LABEL}>Título del caso *</label>
            <input name="titulo" defaultValue={caso?.titulo} required className={INPUT}
              placeholder="ej: Cuidado post-operatorio — Ana González" />
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
            <select name="contexto" defaultValue={caso?.contexto ?? 'domicilio'} required className={INPUT}>
              <option value="domicilio">Domicilio</option>
              <option value="hospital">Hospital</option>
              <option value="casa_reposo">Casa de reposo</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Tarifa por hora (Bs/$) *</label>
            <input name="tarifa_hora" type="number" step="0.01" min="0"
              defaultValue={caso?.tarifa_hora} required className={INPUT} placeholder="0.00" />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Dirección / Ubicación *</label>
            <input name="direccion" defaultValue={caso?.direccion} required className={INPUT}
              placeholder="Av. Principal, Clínica Las Mercedes, piso 3, hab 302" />
          </div>
          <div>
            <label className={LABEL}>Fecha de inicio *</label>
            <input name="fecha_inicio" type="date"
              defaultValue={caso?.fecha_inicio ?? new Date().toISOString().split('T')[0]}
              required className={INPUT} />
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

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
          Cancelar
        </button>
        <button type="submit" disabled={isPending}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
          style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
          {isPending ? 'Guardando...' : caso ? 'Guardar cambios' : 'Crear caso'}
        </button>
      </div>
    </form>
  )
}
