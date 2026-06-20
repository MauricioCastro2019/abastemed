'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, Archive, Trash2, X, AlertTriangle, Flame } from 'lucide-react'
import { cambiarStatusCaso, eliminarCaso, eliminarCasoForzado } from '@/lib/actions/casos'

type Modal = null | 'cerrar' | 'opciones' | 'forzar'

export function AccionesCasoMenu({
  casoId, titulo, status,
}: { casoId: string; titulo: string; status: string }) {
  const [open, setOpen]       = useState(false)
  const [modal, setModal]     = useState<Modal>(null)
  const [isPending, start]    = useTransition()
  const [err, setErr]         = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function stopProp(e: React.MouseEvent) { e.stopPropagation(); e.preventDefault() }

  function cerrar() {
    start(async () => {
      try {
        await cambiarStatusCaso(casoId, 'cerrado')
        setModal(null)
        window.location.reload()
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error')
      }
    })
  }

  function tryDelete() {
    start(async () => {
      const res = await eliminarCaso(casoId)
      if (res?.error === 'TIENE_DEPENDENCIAS') {
        setModal('opciones')
        setOpen(false)
        return
      }
      if (res?.error) { setErr(res.error); return }
      window.location.reload()
    })
  }

  function forzarEliminar() {
    start(async () => {
      const res = await eliminarCasoForzado(casoId)
      if (res?.error) { setErr(res.error); setModal(null); return }
      window.location.reload()
    })
  }

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={stopProp}>
      {/* Botón "···" */}
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
        title="Acciones"
      >
        <MoreHorizontal size={16} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm">
          {status !== 'cerrado' && (
            <button
              onClick={() => { setOpen(false); setModal('cerrar') }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-all"
            >
              <Archive size={14} className="text-gray-400" />
              Cerrar caso
            </button>
          )}
          <button
            onClick={() => { setOpen(false); tryDelete() }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        </div>
      )}

      {/* Modal: confirmar cerrar */}
      {modal === 'cerrar' && (
        <Portal>
          <Overlay>
            <Dialog>
              <DialogHeader icon={<Archive size={18} className="text-[#2AABBF]" />} title="Cerrar caso" onClose={() => setModal(null)} />
              <p className="text-sm text-gray-600 px-6 pb-2">
                El caso <strong>"{titulo}"</strong> quedará marcado como cerrado y visible en el historial.
              </p>
              {err && <ErrBox msg={err} />}
              <DialogFooter
                onCancel={() => setModal(null)}
                onConfirm={cerrar}
                confirmLabel={isPending ? 'Cerrando...' : 'Cerrar caso'}
                confirmClass="bg-[#2AABBF] hover:opacity-90 text-white"
                disabled={isPending}
              />
            </Dialog>
          </Overlay>
        </Portal>
      )}

      {/* Modal: opciones (hay dependencias) */}
      {modal === 'opciones' && (
        <Portal>
          <Overlay>
            <Dialog>
              <DialogHeader
                icon={<AlertTriangle size={18} className="text-amber-500" />}
                title="Tiene registros vinculados"
                sub="Turnos, reportes u otros datos"
                onClose={() => setModal(null)}
              />
              <div className="px-6 pb-2 space-y-2">
                <p className="text-sm text-gray-600 mb-3">
                  <strong>"{titulo}"</strong> tiene datos vinculados. Elige qué hacer:
                </p>
                <button onClick={cerrar} disabled={isPending}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#2AABBF] hover:bg-[#f0fbfd] transition-all text-left disabled:opacity-50">
                  <Archive size={18} className="text-[#2AABBF] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Cerrar el caso</p>
                    <p className="text-xs text-gray-400 mt-0.5">Conserva el historial, solo lo archiva.</p>
                  </div>
                </button>
                <button onClick={() => setModal('forzar')} disabled={isPending}
                  className="w-full flex items-start gap-3 p-4 rounded-xl border border-red-100 hover:border-red-300 hover:bg-red-50 transition-all text-left disabled:opacity-50">
                  <Flame size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Eliminar con todo</p>
                    <p className="text-xs text-red-400 mt-0.5">Borra permanentemente el caso y sus datos.</p>
                  </div>
                </button>
              </div>
              {err && <ErrBox msg={err} />}
              <div className="px-6 pb-5 pt-2">
                <button onClick={() => setModal(null)} className="w-full text-sm text-gray-400 hover:text-gray-600 transition-all">
                  Cancelar
                </button>
              </div>
            </Dialog>
          </Overlay>
        </Portal>
      )}

      {/* Modal: confirmar forzado */}
      {modal === 'forzar' && (
        <Portal>
          <Overlay>
            <Dialog>
              <DialogHeader icon={<Flame size={18} className="text-red-600" />} title="¿Eliminar todo?" sub="Operación irreversible" onClose={() => setModal(null)} />
              <div className="px-6 pb-3">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-medium text-red-800">Se eliminarán permanentemente:</p>
                  <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                    <li>El caso "{titulo}"</li>
                    <li>Todos sus turnos</li>
                    <li>Reportes de turno y bitácora</li>
                    <li>Cobros, kardex e insumos</li>
                  </ul>
                </div>
              </div>
              {err && <ErrBox msg={err} />}
              <DialogFooter
                onCancel={() => setModal('opciones')}
                cancelLabel="Volver"
                onConfirm={forzarEliminar}
                confirmLabel={isPending ? 'Eliminando...' : 'Eliminar todo'}
                confirmClass="bg-red-600 hover:bg-red-700 text-white"
                disabled={isPending}
              />
            </Dialog>
          </Overlay>
        </Portal>
      )}
    </div>
  )
}

// ── Helpers de UI ────────────────────────────────────────────

function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      {children}
    </div>
  )
}

function Dialog({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm space-y-4 pt-5">{children}</div>
}

function DialogHeader({ icon, title, sub, onClose }: { icon: React.ReactNode; title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{title}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
        <X size={18} />
      </button>
    </div>
  )
}

function DialogFooter({ onCancel, cancelLabel = 'Cancelar', onConfirm, confirmLabel, confirmClass, disabled }: {
  onCancel: () => void; cancelLabel?: string; onConfirm: () => void; confirmLabel: string; confirmClass: string; disabled?: boolean
}) {
  return (
    <div className="flex gap-2 px-6 pb-5">
      <button onClick={onCancel} disabled={disabled}
        className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50">
        {cancelLabel}
      </button>
      <button onClick={onConfirm} disabled={disabled}
        className={`flex-1 px-4 py-2 text-sm rounded-lg font-semibold transition-all disabled:opacity-50 ${confirmClass}`}>
        {confirmLabel}
      </button>
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return <p className="text-xs text-red-600 bg-red-50 rounded-lg px-4 py-2 mx-6">{msg}</p>
}
