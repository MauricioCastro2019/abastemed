'use client'

import { useState, useTransition } from 'react'
import { editarFechasTurno } from '@/lib/actions/turnos'
import { Pencil, X, Check } from 'lucide-react'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"

function calcHoras(inicio: string, fin: string): string | null {
  if (!inicio || !fin) return null
  const h = (new Date(fin).getTime() - new Date(inicio).getTime()) / 3600000
  if (h <= 0) return null
  const dias = Math.floor(h / 24)
  const hRest = Math.round((h % 24) * 10) / 10
  return dias > 0 ? `${dias}d ${hRest}h (${h.toFixed(1)}h total)` : `${h.toFixed(1)}h`
}

// Convierte ISO string a valor para datetime-local input (sin zona horaria)
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  turnoId: string
  fechaInicioActual: string
  fechaFinActual: string
}

export function EditarFechasBtn({ turnoId, fechaInicioActual, fechaFinActual }: Props) {
  const [open, setOpen]           = useState(false)
  const [inicio, setInicio]       = useState(toDatetimeLocal(fechaInicioActual))
  const [fin, setFin]             = useState(toDatetimeLocal(fechaFinActual))
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const preview = calcHoras(inicio, fin)
  const horasPreview = preview ? parseFloat(preview) : 0

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await editarFechasTurno(turnoId, formData)
      if (result?.error) { setError(result.error); return }
      setOpen(false)
      window.location.reload()
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
        <Pencil size={13} />
        Editar fechas
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-[#2AABBF]/30 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Corregir fechas del turno</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha y hora inicio</label>
            <input name="fecha_inicio" type="datetime-local" className={INPUT}
              value={inicio} onChange={e => setInicio(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha y hora fin</label>
            <input name="fecha_fin" type="datetime-local" className={INPUT}
              value={fin} onChange={e => setFin(e.target.value)} required />
          </div>
        </div>

        {preview && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            horasPreview > 48
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-[#EBF8FB] text-[#1A7A8C]'
          }`}>
            <span>⏱ Nueva duración: <strong>{preview}</strong></span>
            {horasPreview > 48 && <span className="text-xs font-normal">— ¿Es correcta?</span>}
          </div>
        )}

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
            <Check size={14} />
            {isPending ? 'Guardando...' : 'Guardar fechas'}
          </button>
        </div>
      </form>
    </div>
  )
}
