'use client'

import { useTransition, useState, useRef } from 'react'
import { crearEnfermero, actualizarEnfermero } from '@/lib/actions/enfermeros'
import { createClient } from '@/lib/supabase/client'
import type { Enfermero } from '@/types'
import { Upload, FileText, X, ExternalLink } from 'lucide-react'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const INPUT_ERR = "w-full px-3 py-2 rounded-lg border border-red-300 text-sm outline-none focus:border-red-400 transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"
const FIELD_ERR = "text-xs text-red-500 mt-1"

interface Props { enfermero?: Enfermero }

export function EnfermeroForm({ enfermero }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvUrl, setCvUrl] = useState<string>(enfermero?.cv_url ?? '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function inp(name: string) {
    return fieldErrors[name] ? INPUT_ERR : INPUT
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar 5 MB')
      return
    }
    setError(null)
    setCvFile(file)
  }

  async function uploadCv(): Promise<string | null> {
    if (!cvFile) return cvUrl || null
    setUploading(true)
    const supabase = createClient()
    const path = `cv/${Date.now()}-${cvFile.name.replace(/\s/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(path, cvFile, { upsert: true })

    if (uploadError) {
      setError('Error al subir el CV: ' + uploadError.message)
      setUploading(false)
      return null
    }

    const { data } = supabase.storage.from('documentos').getPublicUrl(path)
    setUploading(false)
    return data.publicUrl
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    const form = e.currentTarget

    startTransition(async () => {
      const uploadedUrl = await uploadCv()
      if (uploadedUrl === null && cvFile) return

      const formData = new FormData(form)
      formData.set('cv_url', uploadedUrl ?? '')

      try {
        const result = enfermero
          ? await actualizarEnfermero(enfermero.id, formData)
          : await crearEnfermero(formData)
        if (result?.fieldErrors) setFieldErrors(result.fieldErrors)
        else if (result?.error) setError(result.error)
        else window.location.href = enfermero ? `/enfermeros/${enfermero.id}?ok=updated` : '/enfermeros?ok=created'
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Datos personales */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Datos personales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Nombre *</label>
            <input name="nombre" defaultValue={enfermero?.nombre} className={inp('nombre')} placeholder="Ana" />
            {fieldErrors.nombre && <p className={FIELD_ERR}>{fieldErrors.nombre}</p>}
          </div>
          <div>
            <label className={LABEL}>Apellido *</label>
            <input name="apellido" defaultValue={enfermero?.apellido} className={inp('apellido')} placeholder="Martínez" />
            {fieldErrors.apellido && <p className={FIELD_ERR}>{fieldErrors.apellido}</p>}
          </div>
          <div>
            <label className={LABEL}>Cédula *</label>
            <input name="cedula" defaultValue={enfermero?.cedula} className={inp('cedula')} placeholder="V-12345678" />
            {fieldErrors.cedula && <p className={FIELD_ERR}>{fieldErrors.cedula}</p>}
          </div>
          <div>
            <label className={LABEL}>Disponibilidad</label>
            <select name="disponible" defaultValue={enfermero ? String(enfermero.disponible) : 'true'} className={INPUT}>
              <option value="true">Disponible</option>
              <option value="false">No disponible</option>
            </select>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Teléfono *</label>
            <input name="telefono" defaultValue={enfermero?.telefono} className={inp('telefono')} placeholder="+58 412 000 0000" />
            {fieldErrors.telefono && <p className={FIELD_ERR}>{fieldErrors.telefono}</p>}
          </div>
          <div>
            <label className={LABEL}>Email *</label>
            <input name="email" type="email" defaultValue={enfermero?.email} className={inp('email')} placeholder="ana@correo.com" />
            {fieldErrors.email && <p className={FIELD_ERR}>{fieldErrors.email}</p>}
          </div>
        </div>
      </section>

      {/* Profesional */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Información profesional</h2>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Especialidades (una por línea)</label>
            <textarea name="especialidades" defaultValue={enfermero?.especialidades?.join('\n')} rows={3}
              className={INPUT} placeholder={"Cuidados intensivos\nGeriatría\nPediatría"} />
          </div>
          <div>
            <label className={LABEL}>Biografía / Notas</label>
            <textarea name="bio" defaultValue={enfermero?.bio ?? ''} rows={3}
              className={INPUT} placeholder="Experiencia, formación, observaciones..." />
          </div>
        </div>
      </section>

      {/* Currículum */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Currículum vitae</h2>

        {cvUrl && !cvFile && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#2AABBF] bg-[#EBF8FB] mb-4">
            <div className="flex items-center gap-2 text-sm text-[#1B2B4B]">
              <FileText size={16} style={{ color: '#2AABBF' }} />
              <span>CV adjunto</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={cvUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[#2AABBF] hover:underline">
                <ExternalLink size={12} />
                Ver
              </a>
              <button type="button" onClick={() => { setCvUrl(''); if (fileRef.current) fileRef.current.value = '' }}
                className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {cvFile && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText size={16} style={{ color: '#2AABBF' }} />
              <span className="truncate max-w-xs">{cvFile.name}</span>
              <span className="text-xs text-gray-400">({(cvFile.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
            <button type="button" onClick={() => { setCvFile(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#2AABBF] hover:bg-[#EBF8FB] transition-all group">
          <Upload size={20} className="text-gray-300 group-hover:text-[#2AABBF] mb-2 transition-colors" />
          <span className="text-sm text-gray-400 group-hover:text-[#2AABBF] transition-colors">
            {cvFile ? 'Cambiar archivo' : 'Subir CV en PDF'}
          </span>
          <span className="text-xs text-gray-300 mt-0.5">Máx. 5 MB</span>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        </label>

        <input type="hidden" name="cv_url" value={cvUrl} />
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
        <a href="/enfermeros"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
          Cancelar
        </a>
        <button type="submit" disabled={isPending || uploading}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
          style={{ backgroundColor: isPending || uploading ? '#94a3b8' : '#2AABBF' }}>
          {uploading ? 'Subiendo CV...' : isPending ? 'Guardando...' : enfermero ? 'Guardar cambios' : 'Registrar enfermero/a'}
        </button>
      </div>
    </form>
  )
}
