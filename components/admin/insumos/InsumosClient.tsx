'use client'

import { useEffect, useState, useTransition } from 'react'
import { getCatalogo, eliminarInsumo, getResumenCostosPorCaso } from '@/lib/actions/insumos'
import { getCasos } from '@/lib/actions/casos'
import { getEnfermeros } from '@/lib/actions/enfermeros'
import { InsumoForm } from '@/components/admin/insumos/InsumoForm'
import { RegistrarUsoForm } from '@/components/admin/insumos/RegistrarUsoForm'
import { Package, Plus, Pencil, Trash2, DollarSign, X, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { InsumoCatalogo, Caso, Enfermero } from '@/types'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'

const CAT_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  solucion:    { bg: '#EBF8FB', color: '#2AABBF', label: 'Solución' },
  medicamento: { bg: '#FDE8F7', color: '#9C27B0', label: 'Medicamento' },
  material:    { bg: '#E8F5E9', color: '#2E7D32', label: 'Material' },
  servicio:    { bg: '#EDE7F6', color: '#5E35B1', label: 'Servicio' },
  otro:        { bg: '#FFF3E0', color: '#E65100', label: 'Otro' },
}

interface Props {
  rol: string
}

export function InsumosClient({ rol }: Props) {
  const esJefe   = rol === 'jefe_enfermeros'
  const esAdmin  = rol === 'admin'

  const [catalogo, setCatalogo]           = useState<InsumoCatalogo[]>([])
  const [casos, setCasos]                 = useState<Pick<Caso, 'id' | 'titulo'>[]>([])
  const [enfermeros, setEnfermeros]       = useState<Pick<Enfermero, 'id' | 'nombre' | 'apellido'>[]>([])
  const [resumen, setResumen]             = useState<{ caso_id: string; titulo: string; total: number; items: number }[]>([])
  const [tab, setTab]                     = useState<'catalogo' | 'expediente'>('catalogo')
  const [showAddForm, setShowAddForm]     = useState(false)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [showRegistrar, setShowRegistrar] = useState(false)
  const [, startTransition]               = useTransition()
  const [loading, setLoading]             = useState(true)

  async function load() {
    try {
      const promises: Promise<unknown>[] = [getCatalogo()]
      if (esAdmin) promises.push(getCasos(), getResumenCostosPorCaso(), getEnfermeros())

      const [cat, casosData, res, enfs] = await Promise.all(promises) as [
        InsumoCatalogo[],
        typeof casos | undefined,
        typeof resumen | undefined,
        Pick<Enfermero, 'id' | 'nombre' | 'apellido'>[] | undefined,
      ]

      setCatalogo(cat)
      if (casosData) setCasos((casosData as Caso[]).map(c => ({ id: c.id, titulo: c.titulo })))
      if (enfs) setEnfermeros(enfs.map(e => ({ id: e.id, nombre: e.nombre, apellido: e.apellido })))
      if (res) setResumen((res as typeof resumen).sort((a, b) => b.total - a.total))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  // load es estable — solo necesitamos ejecutarla al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
            {esJefe ? 'Catálogo de Insumos' : 'Insumos'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {catalogo.length} item{catalogo.length !== 1 ? 's' : ''} en catálogo
            {esJefe && ' · Solo lectura'}
          </p>
        </div>

        {/* Admin: botones de gestión · Jefe: solo vista */}
        {esAdmin && (
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
        )}

        {esJefe && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EBF8FB]">
            <Eye size={14} style={{ color: '#2AABBF' }} />
            <span className="text-xs font-medium" style={{ color: '#1B2B4B' }}>Vista de consulta</span>
          </div>
        )}
      </div>

      {/* Form registrar uso (solo admin) */}
      {esAdmin && showRegistrar && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#2AABBF]/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Registrar uso en expediente</h2>
            <button onClick={() => setShowRegistrar(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <RegistrarUsoForm casos={casos} catalogo={catalogo} enfermeros={enfermeros} onDone={() => { setShowRegistrar(false); load() }} />
        </div>
      )}

      {/* Form nuevo insumo (solo admin) */}
      {esAdmin && showAddForm && !editingId && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#2AABBF]/20">
          <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2B4B' }}>Agregar al catálogo</h2>
          <InsumoForm onDone={() => { setShowAddForm(false); load() }} />
        </div>
      )}

      {/* Tabs (solo admin ve "Costos por caso") */}
      {esAdmin && (
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
      )}

      {/* ── Catálogo ── */}
      {(tab === 'catalogo' || esJefe) && (
        <div className="space-y-4">
          {Object.keys(agrupado).length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Package size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">El catálogo está vacío</p>
            </div>
          )}
          {Object.entries(agrupado).map(([cat, items]) => {
            const c = CAT_COLOR[cat] ?? CAT_COLOR.otro
            return (
              <div key={cat} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: c.bg, color: c.color }}>
                    {c.label}
                  </span>
                  <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Producto</th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Presentación</th>
                      {/* Costo: solo admin */}
                      {esAdmin && (
                        <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Costo</th>
                      )}
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {esJefe ? 'Precio de servicio' : 'Precio'}
                      </th>
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                      {esAdmin && <th className="px-5 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map(item => (
                      <tr key={item.id}>
                        {editingId === item.id && esAdmin ? (
                          <td colSpan={6} className="px-5 py-3">
                            <InsumoForm insumo={item} onDone={() => { setEditingId(null); load() }} />
                          </td>
                        ) : (
                          <>
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{item.nombre}</p>
                              {item.descripcion && <p className="text-xs text-gray-400">{item.descripcion}</p>}
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-500">{item.unidad}</td>

                            {/* Costo solo admin */}
                            {esAdmin && (
                              <td className="px-5 py-3">
                                <span className="text-sm font-semibold" style={{ color: item.costo > 0 ? '#1B2B4B' : '#d1d5db' }}>
                                  {item.costo > 0 ? `$${item.costo.toFixed(2)}` : 'Sin costo'}
                                </span>
                              </td>
                            )}

                            {/* Precio: admin y jefe lo ven */}
                            <td className="px-5 py-3">
                              {item.precio && item.precio > 0 ? (
                                <span className="text-sm font-semibold" style={{ color: '#178C93' }}>
                                  ${item.precio.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Sin precio</span>
                              )}
                            </td>

                            {/* Estado disponible */}
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                item.activo
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-gray-100 text-gray-400'
                              }`}>
                                {item.activo ? '● Disponible' : 'Inactivo'}
                              </span>
                            </td>

                            {/* Acciones solo admin */}
                            {esAdmin && (
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
                            )}
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

      {/* ── Costos por caso (solo admin) ── */}
      {esAdmin && tab === 'expediente' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {resumen.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">Sin registros de insumos aún</p>
              <p className="text-xs text-gray-300 mt-1">Los enfermeros registran el uso por turno</p>
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
