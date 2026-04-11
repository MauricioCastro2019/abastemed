'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearPaciente, actualizarPaciente } from '@/lib/actions/pacientes'
import type { Paciente } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

interface Props {
  paciente?: Paciente
}

export function PacienteForm({ paciente }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (paciente) {
          await actualizarPaciente(paciente.id, formData)
        } else {
          await crearPaciente(formData)
        }
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
          setError(err.message)
        }
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
            <input name="nombre" defaultValue={paciente?.nombre} required className={INPUT} placeholder="María" />
          </div>
          <div>
            <label className={LABEL}>Apellido *</label>
            <input name="apellido" defaultValue={paciente?.apellido} required className={INPUT} placeholder="González" />
          </div>
          <div>
            <label className={LABEL}>Fecha de nacimiento *</label>
            <input name="fecha_nacimiento" type="date" defaultValue={paciente?.fecha_nacimiento} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Contexto *</label>
            <select name="contexto" defaultValue={paciente?.contexto ?? 'domicilio'} required className={INPUT}>
              <option value="domicilio">Domicilio</option>
              <option value="hospital">Hospital</option>
              <option value="casa_reposo">Casa de reposo</option>
            </select>
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
            <textarea name="diagnostico" defaultValue={paciente?.diagnostico} required rows={3}
              className={INPUT} placeholder="Descripción del diagnóstico principal..." />
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
              required className={INPUT} placeholder="Carlos González" />
          </div>
          <div>
            <label className={LABEL}>Relación *</label>
            <input name="contacto_relacion" defaultValue={paciente?.contacto_familiar?.relacion}
              required className={INPUT} placeholder="Hijo, Cónyuge, etc." />
          </div>
          <div>
            <label className={LABEL}>Teléfono *</label>
            <input name="contacto_telefono" defaultValue={paciente?.contacto_familiar?.telefono}
              required className={INPUT} placeholder="+58 412 000 0000" />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input name="contacto_email" type="email" defaultValue={paciente?.contacto_familiar?.email}
              className={INPUT} placeholder="familiar@correo.com" />
          </div>
        </div>
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
          {isPending ? 'Guardando...' : paciente ? 'Guardar cambios' : 'Crear paciente'}
        </button>
      </div>
    </form>
  )
}
