'use client'

import { useState, useTransition } from 'react'
import { registrarUso } from '@/lib/actions/insumos'
import { toast } from 'sonner'
import type { InsumoCatalogo, Caso, Enfermero } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

const CAT_LABEL: Record<string, string> = {
  solucion: 'Soluciones', medicamento: 'Medicamentos', material: 'Material', otro: 'Otro',
}

interface Props {
  casos: Pick<Caso, 'id' | 'titulo'>[]
  catalogo: InsumoCatalogo[]
  defaultCasoId?: string
  turnoId?: string
  enfermeroId?: string
  enfermeros?: Pick<Enfermero, 'id' | 'nombre' | 'apellido'>[]
  onDone?: () => void
}

export function RegistrarUsoForm({ casos, catalogo, defaultCasoId, turnoId, enfermeroId, enfermeros, onDone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [casoId, setCasoId] = useState(defaultCasoId ?? '')

  // Agrupar catálogo por categoría
  const grupos = Object.entries(
    catalogo.reduce<Record<string, InsumoCatalogo[]>>((acc, item) => {
      const cat = item.categoria
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    if (turnoId)   formData.set('turno_id', turnoId)
    if (enfermeroId) formData.set('enfermero_id', enfermeroId)

    startTransition(async () => {
      try {
        const result = await registrarUso(formData)
        if (result?.error) { setError(result.error); return }
        toast.success('Insumo registrado en el expediente')
        ;(e.target as HTMLFormElement).reset()
        onDone?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Caso */}
      {!defaultCasoId && (
        <div>
          <label className={LABEL}>Caso *</label>
          <select name="caso_id" required value={casoId}
            onChange={e => setCasoId(e.target.value)} className={INPUT}>
            <option value="" disabled>Selecciona un caso...</option>
            {casos.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </div>
      )}
      {defaultCasoId && <input type="hidden" name="caso_id" value={defaultCasoId} />}

      {/* Selector de enfermero (solo en contexto admin, cuando no viene fijo) */}
      {!enfermeroId && enfermeros && enfermeros.length > 0 && (
        <div>
          <label className={LABEL}>Enfermero *</label>
          <select name="enfermero_id" required className={INPUT} defaultValue="">
            <option value="" disabled>Selecciona el enfermero...</option>
            {enfermeros.map(e => (
              <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
            ))}
          </select>
        </div>
      )}

      {/* Insumo */}
      <div>
        <label className={LABEL}>Insumo / Material *</label>
        <select name="insumo_id" required className={INPUT} defaultValue="">
          <option value="" disabled>Selecciona un insumo...</option>
          {grupos.map(([cat, items]) => (
            <optgroup key={cat} label={CAT_LABEL[cat] ?? cat}>
              {items.map(i => (
                <option key={i.id} value={i.id}>
                  {i.nombre} ({i.unidad}){i.costo > 0 ? ` — $${i.costo}` : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Cantidad + Notas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Cantidad *</label>
          <input name="cantidad" type="number" step="0.5" min="0.5" required
            defaultValue="1" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Notas</label>
          <input name="notas" placeholder="Observaciones opcionales" className={INPUT} />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button type="submit" disabled={isPending}
        className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
        style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
        {isPending ? 'Registrando...' : 'Registrar en expediente'}
      </button>
    </form>
  )
}
