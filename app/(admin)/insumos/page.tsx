'use client'

import { useEffect, useState, useTransition } from 'react'
import { getCatalogo, eliminarInsumo, getResumenCostosPorCaso } from '@/lib/actions/insumos'
import { getCasos } from '@/lib/actions/casos'
import { InsumoForm } from '@/components/admin/insumos/InsumoForm'
import { RegistrarUsoForm } from '@/components/admin/insumos/RegistrarUsoForm'
import { Package, Plus, Pencil, Trash2, DollarSign, X } from 'lucide-react'
import { toast } from 'sonner'
import type { InsumoCatalogo, Caso } from '@/types'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'

const CAT_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  solucion:    { bg: '#EBF8FB', color: '#2AABBF', label: 'Solución' },
  medicamento: { bg: '#FDE8F7', color: '#9C27B0', label: 'Medicamento' },
  material:    { bg: '#E8F5E9', color: '#2E7D32', label: 'Material' },
  servicio:    { bg: '#EDE7F6', color: '#5E35B1', label: 'Servicio' },
  otro:        { bg: '#FFF3E0', color: '#E65100', label: 'Otro' },
}

export default function InsumosPage() {
  const [catalogo, setCatalogo]         = useState<InsumoCatalogo[]>([])
  const [casos, setCasos]               = useState<Pick<Caso, 'id' | 'titulo'>[]>([])
  const [resumen, setResumen]           = useState<{ caso_id: string; titulo: string; total: number; items: number }[]>([])
  const [tab, setTab]                   = useState<'catalogo' | 'expediente'>('catalogo')
  const [showAddForm, setShowAddForm]   = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [showRegistrar, setShowRegistrar] = useState(false)
  const [, startTransition]             = useTransition()
  const [loading, setLoading]           = useState(true)

  async function load() {
    try {
      const [cat, casosData, res] = await Promise.all([
        getCatalogo(),
        getCasos(),
        getResumenCostosPorCaso(),
      ])
      setCatalogo(cat)
      setCasos(casosData.map(c => ({ id: c.id, titulo: c.titulo })))
      setResumen(res.sort((a, b) => b.total - a.total))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleEliminar(id: string, nombre: string) {
    if (!confirm(`¿Desactivar "${nombre}" del catálogo?`)) return
    startTransition(async () => {
      try {
        await eliminarInsumo(id)
        toast.success('Insumo desactivado')
        load()
      } catch { toast.error('Error al eliminar') }
    })
  }

  const agrupado = catalogo.reduce<Record<string, InsumoCatalogo[]>>((acc, i) => {
    if (!acc[i.categoria]) acc[i.categoria] = []
    acc[i.categoria].push(i)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-[#2AABBF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Insumos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {catalogo.length} item{catalogo.length !== 1 ? 's' : ''} en catálogo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRegistrar(!showRegistrar)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-[#2AABBF] text-[#2AABBF] rounded-lg hover:bg-[#EBF8FB] transition-all">
            <Plus size={16} />
            Registrar uso
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null) }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: '#2AABBF' }}>
            <Package size={16} />
            Nuevo insumo
          </button>
        </div>
      </div>

      {/* Form registrar uso */}
      {showRegistrar && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#2AABBF]/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Registrar uso en expediente</h2>
            <button onClick={() => setShowRegistrar(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <RegistrarUsoForm casos={casos} catalogo={catalogo} onDone={() => { setShowRegistrar(false); load() }} />
        </div>
      )}

      {/* Form nuevo insumo */}
      {showAddForm && !editingId && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#2AABBF]/20">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2B4B' }}>Agregar al catálogo</h2>
          <InsumoForm onDone={() => { setShowAddForm(false); load() }} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm w-fit">
        {[
          { key: 'catalogo',   label: 'Catálogo' },
          { key: 'expediente', label: 'Costos por caso' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              backgroundColor: tab === t.key ? '#1B2B4B' : 'transparent',
              color: tab === t.key ? 'white' : '#6b7280',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Catálogo */}
      {tab === 'catalogo' && (
        <div className="space-y-4">
          {Object.entries(agrupado).map(([cat, items]) => {
            const c = CAT_COLOR[cat] ?? CAT_COLOR.otro
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: c.bg, color: c.color }}>
                    {c.label}
                  </span>
                  <span className="text-xs text-gray-400">{items.length} items</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Producto</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Presentación</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Costo</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Precio</th>
                      <th className="px-5 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map(item => (
                      <tr key={item.id}>
                        {editingId === item.id ? (
                          <td colSpan={5} className="px-5 py-3">
                            <InsumoForm insumo={item} onDone={() => { setEditingId(null); load() }} />
                          </td>
                        ) : (
                          <>
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{item.nombre}</p>
                              {item.descripcion && <p className="text-xs text-gray-400">{item.descripcion}</p>}
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-400">{item.unidad}</td>
                            <td className="px-5 py-3">
                              <span className="text-sm font-semibold" style={{ color: item.costo > 0 ? '#1B2B4B' : '#d1d5db' }}>
                                {item.costo > 0 ? `$${item.costo.toFixed(2)}` : 'Sin costo'}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-sm font-semibold" style={{ color: item.precio && item.precio > 0 ? '#178C93' : '#d1d5db' }}>
                                {item.precio && item.precio > 0 ? `$${item.precio.toFixed(2)}` : '—'}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => setEditingId(item.id)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#2AABBF] hover:bg-[#EBF8FB] transition-all">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => handleEliminar(item.id, item.nombre)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* Tab: Costos por caso */}
      {tab === 'expediente' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {resumen.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">Sin registros de insumos aún</p>
              <p className="text-xs text-gray-300 mt-1">Los enfermeros deben registrar el uso por turno</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Caso</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Registros</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Total insumos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resumen.map(r => (
                  <tr key={r.caso_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{r.titulo}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.items} item{r.items !== 1 ? 's' : ''}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold" style={{ color: '#1B2B4B' }}>
                        ${r.total.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
