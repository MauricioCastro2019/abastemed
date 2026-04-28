'use client'

import { useRef, useState, useTransition } from 'react'
import { crearPaciente, actualizarPaciente } from '@/lib/actions/pacientes'
import type { Paciente } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const INPUT_ERR = "w-full px-3 py-2 rounded-lg border border-red-300 text-sm outline-none focus:border-red-400 transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"
const FIELD_ERR = "text-xs text-red-500 mt-1"

interface Props {
  paciente?: Paciente
}

export function PacienteForm({ paciente }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
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
        const result = paciente
          ? await actualizarPaciente(paciente.id, formData)
          : await crearPaciente(formData)
        if (result?.fieldErrors) setFieldErrors(result.fieldErrors)
        if (result?.error) setError(result.error)
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) return
        setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">

      {/* Datos personales */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Datos personales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Nombre *</label>
            <input name="nombre" defaultValue={paciente?.nombre} className={inp('nombre')} placeholder="María" />
            {fieldErrors.nombre && <p className={FIELD_ERR}>{fieldErrors.nombre}</p>}
          </div>
          <div>
            <label className={LABEL}>Apellido *</label>
            <input name="apellido" defaultValue={paciente?.apellido} className={inp('apellido')} placeholder="González" />
            {fieldErrors.apellido && <p className={FIELD_ERR}>{fieldErrors.apellido}</p>}
          </div>
          <div>
            <label className={LABEL}>Fecha de nacimiento *</label>
            <input name="fecha_nacimiento" type="date" defaultValue={paciente?.fecha_nacimiento} className={inp('fecha_nacimiento')} />
            {fieldErrors.fecha_nacimiento && <p className={FIELD_ERR}>{fieldErrors.fecha_nacimiento}</p>}
          </div>
          <div>
            <label className={LABEL}>Contexto *</label>
            <select name="contexto" defaultValue={paciente?.contexto ?? 'domicilio'} className={inp('contexto')}>
              <option value="domicilio">Domicilio</option>
              <option value="hospital">Hospital</option>
              <option value="casa_reposo">Casa de reposo</option>
            </select>
            {fieldErrors.contexto && <p className={FIELD_ERR}>{fieldErrors.contexto}</p>}
          </div>
          {paciente && (
            <div>
              <label className={LABEL}>Status</label>
              <select name="status" defaultValue={paciente.status} className={INPUT}>
                <option value="activo">Activo</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Clínico */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Información clínica</h2>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Diagnóstico *</label>
            <textarea name="diagnostico" defaultValue={paciente?.diagnostico} rows={3}
              className={inp('diagnostico')} placeholder="Descripción del diagnóstico principal..." />
            {fieldErrors.diagnostico && <p className={FIELD_ERR}>{fieldErrors.diagnostico}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Medicamentos (uno por línea)</label>
              <textarea name="medicamentos" defaultValue={paciente?.medicamentos?.join('\n')} rows={4}
                className={INPUT} placeholder={"Losartán 50mg\nMetformina 850mg"} />
            </div>
            <div>
              <label className={LABEL}>Alergias (una por línea)</label>
              <textarea name="alergias" defaultValue={paciente?.alergias?.join('\n')} rows={4}
                className={INPUT} placeholder={"Penicilina\nIbuprofeno"} />
            </div>
          </div>
        </div>
      </section>

      {/* Contacto familiar */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Contacto familiar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Nombre del familiar *</label>
            <input name="contacto_nombre" defaultValue={paciente?.contacto_familiar?.nombre}
              className={inp('contacto_nombre')} placeholder="Carlos González" />
            {fieldErrors.contacto_nombre && <p className={FIELD_ERR}>{fieldErrors.contacto_nombre}</p>}
          </div>
          <div>
            <label className={LABEL}>Relación *</label>
            <input name="contacto_relacion" defaultValue={paciente?.contacto_familiar?.relacion}
              className={inp('contacto_relacion')} placeholder="Hijo, Cónyuge, etc." />
            {fieldErrors.contacto_relacion && <p className={FIELD_ERR}>{fieldErrors.contacto_relacion}</p>}
          </div>
          <div>
            <label className={LABEL}>Teléfono *</label>
            <input name="contacto_telefono" defaultValue={paciente?.contacto_familiar?.telefono}
              className={inp('contacto_telefono')} placeholder="+58 412 000 0000" />
            {fieldErrors.contacto_telefono && <p className={FIELD_ERR}>{fieldErrors.contacto_telefono}</p>}
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input name="contacto_email" type="email" defaultValue={paciente?.contacto_familiar?.email}
              className={inp('contacto_email')} placeholder="familiar@correo.com" />
            {fieldErrors.contacto_email && <p className={FIELD_ERR}>{fieldErrors.contacto_email}</p>}
          </div>
        </div>
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
        <a href="/pacientes"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
          Cancelar
        </a>
        <button type="submit" disabled={isPending}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
          style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
          {isPending ? 'Guardando...' : paciente ? 'Guardar cambios' : 'Crear paciente'}
        </button>
      </div>
    </form>
  )
}
