'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearRecibo, actualizarRecibo } from '@/lib/actions/recibos'
import type { Recibo, ReciboItem, Paciente, InsumoCatalogo } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

const INPUT  = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white'
const LABEL  = 'block text-xs font-medium text-gray-500 mb-1'

const CAT_ORDER = ['solucion', 'medicamento', 'material', 'servicio', 'otro']
const CAT_LABEL: Record<string, string> = {
  solucion: 'Soluciones', medicamento: 'Medicamentos',
  material: 'Material',   servicio: 'Servicios', otro: 'Otro',
}

interface ItemRow {
  uid:            string
  descripcion:    string
  cantidad:       string
  precio_unitario: string
  importe:        number
}

interface Props {
  recibo?:    Recibo & { recibo_items?: ReciboItem[] }
  pacientes?: Pick<Paciente, 'id' | 'nombre' | 'apellido'>[]
  catalogo?:  InsumoCatalogo[]
}

function newRow(): ItemRow {
  return { uid: Math.random().toString(36).slice(2), descripcion: '', cantidad: '', precio_unitario: '', importe: 0 }
}

function calcImporte(cantidad: string, precio: string): number {
  return (parseFloat(cantidad) || 0) * (parseFloat(precio) || 0)
}

export function ReciboForm({ recibo, pacientes = [], catalogo = [] }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<ItemRow[]>(() => {
    if (recibo?.recibo_items?.length) {
      return recibo.recibo_items.map(item => ({
        uid: item.id,
        descripcion: item.descripcion,
        cantidad: String(item.cantidad),
        precio_unitario: String(item.precio_unitario),
        importe: item.importe,
      }))
    }
    return [newRow()]
  })

  const grupos = CAT_ORDER
    .map(cat => ({ cat, items: catalogo.filter(i => i.categoria === cat) }))
    .filter(g => g.items.length > 0)

  function updateItem(uid: string, field: 'descripcion' | 'cantidad' | 'precio_unitario', value: string) {
    setItems(prev =>
      prev.map(row => {
        if (row.uid !== uid) return row
        const updated = { ...row, [field]: value }
        updated.importe = calcImporte(
          field === 'cantidad'        ? value : updated.cantidad,
          field === 'precio_unitario' ? value : updated.precio_unitario,
        )
        return updated
      })
    )
  }

  function selectInsumo(uid: string, nombre: string, costo: number) {
    setItems(prev =>
      prev.map(row => {
        if (row.uid !== uid) return row
        const precioStr = costo > 0 ? String(costo) : row.precio_unitario
        return { ...row, descripcion: nombre, precio_unitario: precioStr, importe: calcImporte(row.cantidad, precioStr) }
      })
    )
  }

  function addRow()       { setItems(prev => [...prev, newRow()]) }
  function removeRow(uid: string) {
    if (items.length === 1) return
    setItems(prev => prev.filter(r => r.uid !== uid))
  }

  const subtotal = items.reduce((s, r) => s + r.importe, 0)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('items', JSON.stringify(
      items.map(r => ({
        descripcion:     r.descripcion,
        cantidad:        parseFloat(r.cantidad) || 0,
        precio_unitario: parseFloat(r.precio_unitario) || 0,
        importe:         r.importe,
      }))
    ))

    startTransition(async () => {
      try {
        if (recibo) await actualizarRecibo(recibo.id, formData)
        else        await crearRecibo(formData)
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) setError(err.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Datos del recibo ── */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Datos del recibo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Paciente / Cliente *</label>
            {pacientes.length > 0 ? (
              <select name="paciente_nombre" required
                defaultValue={recibo?.paciente_nombre ?? ''}
                className={INPUT}>
                <option value="" disabled>Selecciona un paciente...</option>
                {pacientes.map(p => {
                  const nombre = `${p.nombre} ${p.apellido}`
                  return <option key={p.id} value={nombre}>{nombre}</option>
                })}
              </select>
            ) : (
              <input name="paciente_nombre" defaultValue={recibo?.paciente_nombre}
                required className={INPUT} placeholder="Nombre del paciente" />
            )}
          </div>
          <div>
            <label className={LABEL}>Fecha de emisión *</label>
            <input name="fecha_emision" type="date" required
              defaultValue={recibo?.fecha_emision ?? new Date().toISOString().split('T')[0]}
              className={INPUT} />
          </div>
        </div>
      </section>

      {/* ── Conceptos ── */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#1B2B4B]">Conceptos</h2>
          <button type="button" onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: '#178C93' }}>
            <Plus size={14} />
            Agregar fila
          </button>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 px-2 text-xs font-medium text-gray-400">Descripción</th>
                <th className="text-left pb-2 px-2 text-xs font-medium text-gray-400 w-24">Cant.</th>
                <th className="text-left pb-2 px-2 text-xs font-medium text-gray-400 w-32">Precio unit.</th>
                <th className="text-right pb-2 px-2 text-xs font-medium text-gray-400 w-28">Importe</th>
                <th className="w-9 pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={row.uid} className={idx > 0 ? 'border-t border-gray-50' : ''}>
                  <td className="pt-2 px-2">
                    {grupos.length > 0 ? (
                      <select
                        value={row.descripcion}
                        onChange={e => {
                          const nombre = e.target.value
                          const insumo = catalogo.find(i => i.nombre === nombre)
                          if (insumo) selectInsumo(row.uid, insumo.nombre, insumo.precio ?? insumo.costo)
                          else updateItem(row.uid, 'descripcion', nombre)
                        }}
                        required
                        className={INPUT}>
                        <option value="" disabled>Selecciona un insumo...</option>
                        {grupos.map(({ cat, items: ins }) => (
                          <optgroup key={cat} label={CAT_LABEL[cat] ?? cat}>
                            {ins.map(i => (
                              <option key={i.id} value={i.nombre}>
                                {i.nombre} ({i.unidad}){i.costo > 0 ? ` — $${i.costo}` : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <input value={row.descripcion}
                        onChange={e => updateItem(row.uid, 'descripcion', e.target.value)}
                        placeholder="Descripción del concepto" required className={INPUT} />
                    )}
                  </td>
                  <td className="pt-2 px-2">
                    <input type="number" min="0" step="0.01"
                      value={row.cantidad}
                      onChange={e => updateItem(row.uid, 'cantidad', e.target.value)}
                      placeholder="1" required className={INPUT} />
                  </td>
                  <td className="pt-2 px-2">
                    <input type="number" min="0" step="0.01"
                      value={row.precio_unitario}
                      onChange={e => updateItem(row.uid, 'precio_unitario', e.target.value)}
                      placeholder="0.00" required className={INPUT} />
                  </td>
                  <td className="pt-2 px-2 text-right">
                    <span className="font-semibold text-[#1B2B4B]">
                      ${row.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="pt-2 pl-1">
                    <button type="button" onClick={() => removeRow(row.uid)}
                      disabled={items.length === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Quitar fila">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col items-end gap-2">
          <div className="flex items-center gap-10 text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-[#1B2B4B] w-28 text-right">
              ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-10">
            <span className="text-base font-bold text-[#1B2B4B]">Total</span>
            <span className="text-base font-bold w-28 text-right" style={{ color: '#178C93' }}>
              ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </section>

      {/* ── Observaciones ── */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Observaciones</h2>
        <textarea name="observaciones" defaultValue={recibo?.observaciones ?? ''}
          rows={3} className={INPUT} placeholder="Notas adicionales para el recibo (opcional)..." />
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
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
          {isPending ? 'Guardando...' : recibo ? 'Guardar cambios' : 'Crear recibo'}
        </button>
      </div>
    </form>
  )
}
