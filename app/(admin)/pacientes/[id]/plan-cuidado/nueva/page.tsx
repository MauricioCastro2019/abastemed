'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardList, Plus, Trash2 } from 'lucide-react'
import { crearIndicacion } from '@/lib/actions/plan-cuidado'

const HORARIOS_DEFAULT: Record<string, string[]> = {
  cada_4h:                 ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  cada_6h:                 ['06:00', '12:00', '18:00', '00:00'],
  cada_8h:                 ['08:00', '16:00', '00:00'],
  cada_12h:                ['08:00', '20:00'],
  cada_24h:                ['08:00'],
  lunes_miercoles_viernes: ['08:00'],
  una_vez:                 ['08:00'],
  segun_necesidad:         [],
}

const LABEL_INPUT = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
const RING        = { '--tw-ring-color': '#2AABBF' } as React.CSSProperties
const BASE_INPUT  = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2'
const BASE_SELECT = `${BASE_INPUT} bg-white`

const hoy = () => new Date().toISOString().split('T')[0]

export default function NuevaIndicacionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [frecuencia, setFrecuencia]  = useState('cada_24h')
  const [horarios,   setHorarios]    = useState(['08:00'])

  function onFrecuenciaChange(value: string) {
    setFrecuencia(value)
    setHorarios(HORARIOS_DEFAULT[value] ?? [])
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd   = new FormData(form)

    // Reemplazar horarios con los del estado
    fd.delete('horarios')
    horarios.forEach(h => fd.append('horarios', h))
    fd.set('paciente_id', params.id)

    startTransition(async () => {
      const result = await crearIndicacion(fd)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Indicación creada correctamente')
        router.push(`/pacientes/${params.id}/plan-cuidado`)
      }
    })
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/pacientes/${params.id}/plan-cuidado`}
          className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <ClipboardList size={20} style={{ color: '#2AABBF' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
            Nueva indicación
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-5">
        {/* Tipo + Nombre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_INPUT}>Tipo de indicación *</label>
            <select name="tipo" required style={RING} className={BASE_SELECT}>
              <option value="">Seleccionar…</option>
              <option value="medicamento_oral">Medicamento oral</option>
              <option value="aplicacion_medicamento">Aplicación de medicamento</option>
              <option value="curacion">Curación</option>
              <option value="signos_vitales">Toma de signos vitales</option>
              <option value="terapia">Terapia</option>
              <option value="otra">Otra indicación</option>
            </select>
          </div>
          <div>
            <label className={LABEL_INPUT}>Nombre / medicamento *</label>
            <input name="nombre" type="text" required
              placeholder="Ej: Metformina 500, Curación herida…"
              style={RING} className={BASE_INPUT} />
          </div>
        </div>

        {/* Dosis + Vía */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_INPUT}>Dosis</label>
            <input name="dosis" type="text"
              placeholder="Ej: 500 mg, 1 tableta, 2 puff…"
              style={RING} className={BASE_INPUT} />
          </div>
          <div>
            <label className={LABEL_INPUT}>Vía de administración</label>
            <select name="via" style={RING} className={BASE_SELECT}>
              <option value="">No aplica</option>
              <option value="oral">Oral</option>
              <option value="intravenosa">Intravenosa (IV)</option>
              <option value="intramuscular">Intramuscular (IM)</option>
              <option value="subcutanea">Subcutánea (SC)</option>
              <option value="topica">Tópica</option>
              <option value="inhalatoria">Inhalatoria</option>
              <option value="sublingual">Sublingual</option>
              <option value="nasal">Nasal</option>
              <option value="otra">Otra</option>
            </select>
          </div>
        </div>

        {/* Frecuencia */}
        <div>
          <label className={LABEL_INPUT}>Frecuencia *</label>
          <select name="frecuencia" required value={frecuencia}
            onChange={e => onFrecuenciaChange(e.target.value)}
            style={RING} className={BASE_SELECT}>
            <option value="cada_4h">Cada 4 horas</option>
            <option value="cada_6h">Cada 6 horas</option>
            <option value="cada_8h">Cada 8 horas</option>
            <option value="cada_12h">Cada 12 horas</option>
            <option value="cada_24h">Cada 24 horas (1 vez/día)</option>
            <option value="lunes_miercoles_viernes">Lunes, miércoles y viernes</option>
            <option value="una_vez">Una sola vez</option>
            <option value="segun_necesidad">Según necesidad (PRN)</option>
          </select>
        </div>

        {/* Horarios dinámicos */}
        {frecuencia !== 'segun_necesidad' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={LABEL_INPUT}>Horarios</label>
              <button type="button"
                onClick={() => setHorarios(prev => [...prev, '08:00'])}
                className="flex items-center gap-1 text-xs font-medium hover:underline"
                style={{ color: '#2AABBF' }}>
                <Plus size={12} /> Agregar horario
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {horarios.map((h, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={h}
                    onChange={e => {
                      const copy = [...horarios]
                      copy[idx] = e.target.value
                      setHorarios(copy)
                    }}
                    style={RING}
                    className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
                  />
                  {horarios.length > 1 && (
                    <button type="button"
                      onClick={() => setHorarios(horarios.filter((_, i) => i !== idx))}
                      className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Se generarán automáticamente los eventos de los próximos 60 días (o hasta la fecha de fin).
            </p>
          </div>
        )}

        {frecuencia === 'segun_necesidad' && (
          <div className="rounded-lg p-3 text-xs text-gray-500 bg-gray-50 border border-gray-100">
            Las indicaciones <strong>según necesidad (PRN)</strong> no generan eventos programados.
            Se registran en el historial cuando se aplican manualmente.
          </div>
        )}

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_INPUT}>Fecha de inicio *</label>
            <input name="fecha_inicio" type="date" required
              defaultValue={hoy()}
              style={RING} className={BASE_INPUT} />
          </div>
          <div>
            <label className={LABEL_INPUT}>
              Fecha de fin{' '}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input name="fecha_fin" type="date"
              style={RING} className={BASE_INPUT} />
          </div>
        </div>

        {/* Responsable */}
        <div>
          <label className={LABEL_INPUT}>Responsable</label>
          <input name="responsable" type="text"
            placeholder="Nombre del enfermero o responsable"
            style={RING} className={BASE_INPUT} />
        </div>

        {/* Notas */}
        <div>
          <label className={LABEL_INPUT}>Notas especiales</label>
          <textarea name="notas" rows={3}
            placeholder="Instrucciones adicionales, contraindicaciones, cuidados especiales…"
            style={RING}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 resize-none" />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Link href={`/pacientes/${params.id}/plan-cuidado`}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-all">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#2AABBF' }}>
            {isPending ? 'Guardando…' : 'Guardar indicación'}
          </button>
        </div>
      </form>
    </div>
  )
}
