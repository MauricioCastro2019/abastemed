'use client'

import { useEffect, useState } from 'react'
import { getCatalogo, getInsumosByCaso } from '@/lib/actions/insumos'
import { getMisTurnos, getMiPerfil } from '@/lib/actions/enfermero-portal'
import { RegistrarUsoForm } from '@/components/admin/insumos/RegistrarUsoForm'
import { Package, Clock } from 'lucide-react'
import type { InsumoCatalogo, InsumoUsado } from '@/types'

const CAT_COLOR: Record<string, string> = {
  solucion: '#2AABBF', medicamento: '#9C27B0', material: '#2E7D32', otro: '#E65100',
}

export default function EnfermeroInsumosPage() {
  const [catalogo, setCatalogo]   = useState<InsumoCatalogo[]>([])
  const [turnos, setTurnos]       = useState<Awaited<ReturnType<typeof getMisTurnos>>>([])
  const [enfermeroId, setEnfermeroId] = useState<string | null>(null)
  const [selectedTurno, setSelectedTurno] = useState<string>('')
  const [usados, setUsados]       = useState<InsumoUsado[]>([])
  const [loading, setLoading]     = useState(true)

  async function load() {
    try {
      const [cat, mis, { enfermero }] = await Promise.all([
        getCatalogo(),
        getMisTurnos(),
        getMiPerfil(),
      ])
      setCatalogo(cat)
      setTurnos(mis.filter(t => t.status !== 'completado'))
      setEnfermeroId(enfermero?.id ?? null)
    } finally {
      setLoading(false)
    }
  }

  async function loadUsados(casoId: string) {
    if (!casoId) { setUsados([]); return }
    try {
      const data = await getInsumosByCaso(casoId)
      setUsados(data)
    } catch { setUsados([]) }
  }

  useEffect(() => { load() }, [])

  const turnoActual = turnos.find(t => t.id === selectedTurno)
  const casoId = (turnoActual?.caso as { id?: string } | undefined)?.id ?? ''
  const casoTitulo = (turnoActual?.caso as { titulo?: string } | undefined)?.titulo ?? ''

  useEffect(() => {
    if (casoId) loadUsados(casoId)
    else setUsados([])
  }, [casoId])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-[#2AABBF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalUsados = usados.reduce((sum, u) => sum + u.cantidad * u.costo_unitario, 0)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Insumos del turno</h1>
        <p className="text-sm text-gray-500 mt-1">Registra los insumos y materiales que usaste</p>
      </div>

      {/* Seleccionar turno activo */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <label className="block text-xs font-medium text-gray-500 mb-1">Selecciona tu turno</label>
        {turnos.length === 0 ? (
          <p className="text-sm text-gray-400">No tienes turnos activos o programados</p>
        ) : (
          <select value={selectedTurno} onChange={e => setSelectedTurno(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] bg-white">
            <option value="">Selecciona un turno...</option>
            {turnos.map(t => {
              const fecha = new Date(t.fecha_inicio).toLocaleDateString('es-VE', {
                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })
              const titulo = (t.caso as { titulo?: string } | undefined)?.titulo ?? 'Turno'
              return (
                <option key={t.id} value={t.id}>
                  {titulo} — {fecha} ({t.status})
                </option>
              )
            })}
          </select>
        )}
      </div>

      {selectedTurno && casoId && (
        <>
          {/* Form registrar */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                Agregar insumo — {casoTitulo}
              </h2>
            </div>
            <RegistrarUsoForm
              casos={[]}
              catalogo={catalogo}
              defaultCasoId={casoId}
              turnoId={selectedTurno}
              enfermeroId={enfermeroId ?? undefined}
              onDone={() => loadUsados(casoId)}
            />
          </div>

          {/* Historial de este turno */}
          {usados.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: '#2AABBF' }} />
                  <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                    Registrado en este caso
                  </h2>
                </div>
                {totalUsados > 0 && (
                  <span className="text-sm font-bold" style={{ color: '#1B2B4B' }}>
                    Total: ${totalUsados.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {usados.map(u => {
                  const insumo = u.insumo as InsumoCatalogo | undefined
                  const subtotal = u.cantidad * u.costo_unitario
                  const enf = u.enfermero as { nombre: string; apellido: string } | undefined
                  return (
                    <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CAT_COLOR[insumo?.categoria ?? 'otro'] ?? '#9ca3af' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
                          {insumo?.nombre ?? 'Insumo'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {u.cantidad} {insumo?.unidad} · {enf?.nombre} {enf?.apellido} ·{' '}
                          {new Date(u.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {u.notas && <p className="text-xs text-gray-400 italic">{u.notas}</p>}
                      </div>
                      {subtotal > 0 && (
                        <span className="text-sm font-semibold flex-shrink-0" style={{ color: '#1B2B4B' }}>
                          ${subtotal.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
