'use client'

import { useState, useTransition } from 'react'
import { crearInsumo, actualizarInsumo } from '@/lib/actions/insumos'
import { toast } from 'sonner'
import type { InsumoCatalogo } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

const CATEGORIAS = [
  { value: 'solucion',    label: 'Solución' },
  { value: 'medicamento', label: 'Medicamento' },
  { value: 'material',    label: 'Material' },
  { value: 'otro',        label: 'Otro' },
]

interface Props {
  insumo?: InsumoCatalogo
  onDone: () => void
}

export function InsumoForm({ insumo, onDone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        const result = insumo
          ? await actualizarInsumo(insumo.id, formData)
          : await crearInsumo(formData)

        if (result?.error) { setError(result.error); return }
        toast.success(insumo ? 'Insumo actualizado' : 'Insumo agregado al catálogo')
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
      <div className="lg:col-span-2">
        <label className={LABEL}>Nombre *</label>
        <input name="nombre" defaultValue={insumo?.nombre} required className={INPUT}
          placeholder="Ej: Sol. Salina 1000ml" />
      </div>
      <div>
        <label className={LABEL}>Categoría *</label>
        <select name="categoria" defaultValue={insumo?.categoria ?? 'material'} className={INPUT}>
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL}>Unidad *</label>
        <input name="unidad" defaultValue={insumo?.unidad} required className={INPUT}
          placeholder="frasco, pieza, caja..." />
      </div>
      <div>
        <label className={LABEL}>Costo ($)</label>
        <input name="costo" type="number" step="0.01" min="0"
          defaultValue={insumo?.costo ?? 0} className={INPUT} />
      </div>

      {error && <p className="lg:col-span-5 text-xs text-red-500">{error}</p>}

      <div className="lg:col-span-5 flex gap-2 justify-end">
        <button type="button" onClick={onDone}
          className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
          Cancelar
        </button>
        <button type="submit" disabled={isPending}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all"
          style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
          {isPending ? 'Guardando...' : insumo ? 'Actualizar' : 'Agregar insumo'}
        </button>
      </div>
    </form>
  )
}
