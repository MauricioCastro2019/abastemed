'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  agregarCompetenciaRequerida,
  quitarCompetenciaRequerida,
} from '@/lib/actions/competencias/paciente-competencias.actions'
import type { Competencia, PacienteCompetenciaRequerida } from '@/types'
import { Plus, X, Loader2, ShieldCheck } from 'lucide-react'

interface Props {
  pacienteId: string
  requeridas: PacienteCompetenciaRequerida[]
  catalogo: Competencia[]
}

export function CompetenciasRequeridasWidget({ pacienteId, requeridas, catalogo }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formAbierto, setFormAbierto] = useState(false)
  const [competenciaId, setCompetenciaId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const requeridasIds = new Set(requeridas.map(r => r.competencia_id))
  const disponibles = catalogo.filter(c => !requeridasIds.has(c.id))

  function handleAgregar() {
    if (!competenciaId) {
      setError('Selecciona una competencia')
      return
    }
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('paciente_id', pacienteId)
      formData.set('competencia_id', competenciaId)
      const result = await agregarCompetenciaRequerida(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setFormAbierto(false)
        setCompetenciaId('')
        router.refresh()
      }
    })
  }

  function handleQuitar(id: string) {
    startTransition(async () => {
      await quitarCompetenciaRequerida(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      {requeridas.length === 0 && !formAbierto && (
        <p className="text-xs text-gray-400 text-center py-2">
          Sin competencias requeridas. Cualquier enfermero puede ser asignado.
        </p>
      )}

      {requeridas.map(r => (
        <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100">
          <ShieldCheck size={13} style={{ color: '#2AABBF' }} className="flex-shrink-0" />
          <span className="text-xs text-gray-700 flex-1 truncate">{r.competencia?.nombre ?? 'Competencia'}</span>
          <button
            onClick={() => handleQuitar(r.id)}
            disabled={isPending}
            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <X size={13} />
          </button>
        </div>
      ))}

      {formAbierto ? (
        <div className="space-y-2 pt-1">
          <select
            value={competenciaId}
            onChange={e => setCompetenciaId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-[#2AABBF] bg-white"
          >
            <option value="" disabled>Seleccionar competencia...</option>
            {disponibles.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setFormAbierto(false); setError(null) }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500"
            >
              Cancelar
            </button>
            <button
              onClick={handleAgregar}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#2AABBF' }}
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Agregar</>}
            </button>
          </div>
        </div>
      ) : (
        disponibles.length > 0 && (
          <button
            onClick={() => setFormAbierto(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium border border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-[#2AABBF] hover:border-[#2AABBF] transition-colors"
          >
            <Plus size={12} /> Agregar competencia requerida
          </button>
        )
      )}
    </div>
  )
}
