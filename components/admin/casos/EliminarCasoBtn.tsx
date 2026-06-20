'use client'

import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle, X, Archive, Flame } from 'lucide-react'
import { eliminarCaso, eliminarCasoForzado, cambiarStatusCaso } from '@/lib/actions/casos'

type Mode = 'idle' | 'confirm-simple' | 'confirm-forzado' | 'opciones-dependencias'

export function EliminarCasoBtn({ casoId, titulo }: { casoId: string; titulo: string }) {
  const [mode, setMode] = useState<Mode>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() { setMode('idle'); setError(null) }

  function handleDeleteClick() {
    setMode('confirm-simple')
  }

  function confirmarEliminar() {
    setError(null)
    startTransition(async () => {
      const result = await eliminarCaso(casoId)
      if (result?.error === 'TIENE_DEPENDENCIAS') {
        setMode('opciones-dependencias')
        return
      }
      if (result?.error) {
        setError(result.error)
        return
      }
      window.location.href = '/casos'
    })
  }

  function confirmarForzado() {
    startTransition(async () => {
      const result = await eliminarCasoForzado(casoId)
      if (result?.error) {
        setError(result.error)
        setMode('idle')
        return
      }
      window.location.href = '/casos'
    })
  }

  async function cerrarCaso() {
    startTransition(async () => {
      try {
        await cambiarStatusCaso(casoId, 'cerrado')
        window.location.href = '/casos'
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cerrar el caso')
      }
    })
  }

  return (
    <>
      {/* Botón principal */}
      <button
        onClick={handleDeleteClick}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50"
      >
        <Trash2 size={14} />
        Eliminar caso
      </button>

      {/* Modales */}
      {mode !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">

            {/* ── Confirmación simple ───────────────────────────── */}
            {mode === 'confirm-simple' && (
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Trash2 size={18} className="text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Eliminar caso</p>
                      <p className="text-xs text-gray-400 mt-0.5">Esta acción no se puede deshacer</p>
                    </div>
                  </div>
                  <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  ¿Eliminar <strong>"{titulo}"</strong>?
                </p>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={reset} disabled={isPending}
                    className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50">
                    Cancelar
                  </button>
                  <button onClick={confirmarEliminar} disabled={isPending}
                    className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 font-medium">
                    {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Opciones cuando hay dependencias ─────────────── */}
            {mode === 'opciones-dependencias' && (
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Tiene registros vinculados</p>
                      <p className="text-xs text-gray-400 mt-0.5">Turnos, reportes u otros datos</p>
                    </div>
                  </div>
                  <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  El caso <strong>"{titulo}"</strong> tiene datos vinculados. Elige qué hacer:
                </p>

                <div className="space-y-2">
                  {/* Opción A: Cerrar */}
                  <button onClick={cerrarCaso} disabled={isPending}
                    className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#2AABBF] hover:bg-[#f0fbfd] transition-all text-left group disabled:opacity-50">
                    <Archive size={18} className="text-[#2AABBF] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cerrar el caso</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Se marca como cerrado y queda visible en el historial. Los datos se conservan.
                      </p>
                    </div>
                  </button>

                  {/* Opción B: Forzar eliminación */}
                  <button onClick={() => setMode('confirm-forzado')} disabled={isPending}
                    className="w-full flex items-start gap-3 p-4 rounded-xl border border-red-100 hover:border-red-300 hover:bg-red-50 transition-all text-left group disabled:opacity-50">
                    <Flame size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Eliminar con todo (admin)</p>
                      <p className="text-xs text-red-400 mt-0.5">
                        Borra permanentemente el caso y todos sus turnos, reportes y registros. No hay vuelta atrás.
                      </p>
                    </div>
                  </button>
                </div>

                <button onClick={reset} className="w-full text-sm text-gray-400 hover:text-gray-600 pt-1 transition-all">
                  Cancelar
                </button>
              </div>
            )}

            {/* ── Confirmación forzada ──────────────────────────── */}
            {mode === 'confirm-forzado' && (
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Flame size={18} className="text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-700">¿Eliminar todo?</p>
                      <p className="text-xs text-gray-400 mt-0.5">Operación irreversible</p>
                    </div>
                  </div>
                  <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-red-800">Se eliminarán permanentemente:</p>
                  <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                    <li>El caso "{titulo}"</li>
                    <li>Todos sus turnos asignados</li>
                    <li>Reportes de turno y bitácora del caso</li>
                    <li>Cobros, kardex e insumos del caso</li>
                  </ul>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setMode('opciones-dependencias')} disabled={isPending}
                    className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50">
                    Volver
                  </button>
                  <button onClick={confirmarForzado} disabled={isPending}
                    className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 font-semibold">
                    {isPending ? 'Eliminando...' : 'Eliminar todo'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
