'use client'

import { useState } from 'react'
import { ScanLine, ListTodo, X } from 'lucide-react'
import { crearHallazgo } from '@/lib/actions/hallazgos'
import { crearPendiente } from '@/lib/actions/pendientes-caso'

type Modal = 'hallazgo' | 'pendiente' | null

const CATEGORIAS = [
  { value: 'integridad_piel', label: 'Integridad de piel' },
  { value: 'respiratorio',    label: 'Respiratorio' },
  { value: 'neurologico',     label: 'Neurológico' },
  { value: 'digestivo',       label: 'Digestivo' },
  { value: 'dolor',           label: 'Dolor' },
  { value: 'movilidad',       label: 'Movilidad' },
  { value: 'nutricional',     label: 'Nutricional' },
  { value: 'otro',            label: 'Otro' },
]

interface QuickAddMemoriaProps {
  casoId: string
  turnoId: string
}

export function QuickAddMemoria({ casoId, turnoId }: QuickAddMemoriaProps) {
  const [modal, setModal] = useState<Modal>(null)
  const [pending, setPending] = useState(false)
  const [error, setError]   = useState('')
  const [ok, setOk]         = useState<string | null>(null)

  function cerrar() {
    setModal(null)
    setError('')
    setOk(null)
  }

  async function submitHallazgo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('caso_id', casoId)
    fd.set('turno_id', turnoId)
    const result = await crearHallazgo(fd)
    setPending(false)
    if (result.error) return setError(result.error)
    setOk('Hallazgo registrado')
    setTimeout(cerrar, 1200)
  }

  async function submitPendiente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('caso_id', casoId)
    fd.set('turno_id', turnoId)
    const result = await crearPendiente(fd)
    setPending(false)
    if (result.error) return setError(result.error)
    setOk('Pendiente agregado')
    setTimeout(cerrar, 1200)
  }

  return (
    <>
      {/* Botones quick-add */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setModal('hallazgo')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all"
          style={{ borderColor: '#dc2626', color: '#dc2626' }}
        >
          <ScanLine size={13} /> Hallazgo
        </button>
        <button
          onClick={() => setModal('pendiente')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all"
          style={{ borderColor: '#d97706', color: '#d97706' }}
        >
          <ListTodo size={13} /> Pendiente
        </button>
      </div>

      {/* Modal overlay */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {modal === 'hallazgo'
                  ? <ScanLine size={16} style={{ color: '#dc2626' }} />
                  : <ListTodo size={16} style={{ color: '#d97706' }} />
                }
                <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                  {modal === 'hallazgo' ? 'Registrar hallazgo' : 'Agregar pendiente'}
                </h2>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Éxito */}
            {ok ? (
              <div className="p-8 text-center">
                <p className="text-green-600 font-semibold">{ok} ✓</p>
              </div>
            ) : modal === 'hallazgo' ? (

              /* Formulario hallazgo */
              <form onSubmit={submitHallazgo} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
                    <select name="categoria"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
                      required>
                      {CATEGORIAS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                    <input name="tipo" placeholder="Ej: Abrasión..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
                      required />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
                  <textarea name="descripcion" rows={2}
                    placeholder="Describe el hallazgo..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF] resize-none"
                    required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Severidad</label>
                    <select name="severidad"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]">
                      <option value="leve">Leve</option>
                      <option value="moderada">Moderada</option>
                      <option value="grave">Grave</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-5">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" name="requiere_vigilancia" value="true" />
                      Vigilancia
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input type="checkbox" name="requiere_notificacion" value="true" />
                      Notificar
                    </label>
                  </div>
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={cerrar}
                    className="px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg">
                    Cancelar
                  </button>
                  <button type="submit" disabled={pending}
                    className="px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: '#dc2626' }}>
                    {pending ? 'Guardando...' : 'Registrar hallazgo'}
                  </button>
                </div>
              </form>

            ) : (

              /* Formulario pendiente */
              <form onSubmit={submitPendiente} className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tarea pendiente</label>
                  <input name="titulo"
                    placeholder="Ej: Vigilar área de pañal, Solicitar insumo..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
                    required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Detalle (opcional)</label>
                  <textarea name="descripcion" rows={2}
                    placeholder="Contexto adicional..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF] resize-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Prioridad</label>
                  <select name="prioridad"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]">
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={cerrar}
                    className="px-4 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg">
                    Cancelar
                  </button>
                  <button type="submit" disabled={pending}
                    className="px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: '#d97706' }}>
                    {pending ? 'Guardando...' : 'Agregar pendiente'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
