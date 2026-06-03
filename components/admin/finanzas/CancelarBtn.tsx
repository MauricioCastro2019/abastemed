'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { XCircle, X } from 'lucide-react'
import { cancelarIngreso, cancelarSalida } from '@/lib/actions/finanzas'

interface Props {
  tipo:  'ingreso' | 'salida'
  id:    string
  folio: string
}

export function CancelarBtn({ tipo, id, folio }: Props) {
  const [open, setOpen]       = useState(false)
  const [motivo, setMotivo]   = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    if (!motivo.trim()) {
      toast.error('El motivo de cancelación es requerido')
      return
    }

    startTransition(async () => {
      const result = tipo === 'ingreso'
        ? await cancelarIngreso(id, motivo)
        : await cancelarSalida(id, motivo)

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`${tipo === 'ingreso' ? 'Ingreso' : 'Salida'} ${folio} cancelado correctamente`)
        setOpen(false)
        setMotivo('')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
      >
        <XCircle size={15} />
        Cancelar {tipo}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-base" style={{ color: '#1B2B4B' }}>
                  Cancelar {tipo === 'ingreso' ? 'ingreso' : 'salida'} {folio}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  El registro permanecerá visible en el historial pero no afectará balances.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <label className="block text-sm font-medium mb-1" style={{ color: '#1B2B4B' }}>
              Motivo de cancelación *
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Describe brevemente por qué se cancela este movimiento"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 bg-white"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending || !motivo.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {isPending ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
