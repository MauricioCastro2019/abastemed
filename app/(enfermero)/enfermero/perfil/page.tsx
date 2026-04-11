'use client'

import { useEffect, useState, useTransition } from 'react'
import { getMiPerfil, actualizarMiPerfil } from '@/lib/actions/enfermero-portal'
import { Star, Briefcase, Phone, Mail, FileText, ExternalLink } from 'lucide-react'
import type { Enfermero } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

export default function MiPerfilPage() {
  const [enfermero, setEnfermero] = useState<Enfermero | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMiPerfil().then(({ enfermero }) => {
      setEnfermero(enfermero)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await actualizarMiPerfil(formData)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[#2AABBF] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!enfermero) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-700 text-sm">
        Tu cuenta aún no está vinculada a un perfil de enfermero. Contacta al administrador.
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">Tu perfil profesional visible para pacientes y familias</p>
      </div>

      {/* Tarjeta de presentación (solo lectura) */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ backgroundColor: '#1B2B4B' }}>
            {enfermero.nombre[0]}{enfermero.apellido[0]}
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1B2B4B' }}>
              {enfermero.nombre} {enfermero.apellido}
            </h2>
            <p className="text-sm text-gray-400">{enfermero.cedula}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <Star size={12} className="fill-amber-400" />
                {enfermero.rating?.toFixed(1) ?? '0.0'}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Briefcase size={12} />
                {enfermero.total_casos} casos
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href={`mailto:${enfermero.email}`}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#2AABBF]">
            <Mail size={13} />
            {enfermero.email}
          </a>
          <a href={`tel:${enfermero.telefono}`}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#2AABBF]">
            <Phone size={13} />
            {enfermero.telefono}
          </a>
        </div>

        {enfermero.cv_url && (
          <a href={enfermero.cv_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#2AABBF] hover:underline">
            <FileText size={13} />
            Ver CV
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Editar perfil */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[#1B2B4B] mb-4">Editar mi información</h3>
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Teléfono</label>
              <input name="telefono" defaultValue={enfermero.telefono} className={INPUT} placeholder="+58 412 000 0000" />
            </div>
            <div>
              <label className={LABEL}>Disponibilidad</label>
              <select name="disponible" defaultValue={String(enfermero.disponible)} className={INPUT}>
                <option value="true">Disponible para nuevos turnos</option>
                <option value="false">No disponible</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Especialidades (una por línea)</label>
              <textarea name="especialidades" defaultValue={enfermero.especialidades?.join('\n')}
                rows={3} className={INPUT} placeholder={"Cuidados intensivos\nGeriatría"} />
            </div>
            <div>
              <label className={LABEL}>Presentación profesional</label>
              <textarea name="bio" defaultValue={enfermero.bio ?? ''} rows={4}
                className={INPUT} placeholder="Cuéntale a los pacientes sobre tu experiencia, formación y enfoque de cuidado..." />
              <p className="text-xs text-gray-400 mt-1">Esta descripción aparece en tu perfil público.</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
        )}
        {saved && (
          <div className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3">
            Perfil actualizado correctamente.
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
