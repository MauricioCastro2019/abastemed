'use client'

import { useState, useTransition } from 'react'
import { crearKardexMed, actualizarKardexMed, suspenderKardexMed } from '@/lib/actions/kardex'
import type { KardexMedicamento, EstatusKardex } from '@/types'
import { Plus, Pencil, PauseCircle, Pill, Clock, ChevronDown, ChevronUp, X, Check } from 'lucide-react'

const ESTATUS_STYLE: Record<EstatusKardex, { label: string; color: string; bg: string }> = {
  activo:     { label: 'Activo',      color: '#059669', bg: '#ECFDF5' },
  suspendido: { label: 'Suspendido',  color: '#6b7280', bg: '#f3f4f6' },
  temporal:   { label: 'Temporal',    color: '#d97706', bg: '#FEF3C7' },
  prn:        { label: 'PRN / S.O.S', color: '#7c3aed', bg: '#EDE9FE' },
}

const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/30 focus:border-[#2AABBF]"
const selectCls = inputCls

interface MedFormData {
  nombre: string
  presentacion: string
  dosis: string
  via: string
  frecuencia: string
  horarios: string
  fecha_inicio: string
  medico: string
  motivo: string
  estatus: EstatusKardex
  existencia_domicilio: boolean
  observaciones: string
}

const EMPTY_FORM: MedFormData = {
  nombre: '', presentacion: '', dosis: '', via: '',
  frecuencia: '', horarios: '', fecha_inicio: '',
  medico: '', motivo: '', estatus: 'activo',
  existencia_domicilio: true, observaciones: '',
}

interface Props {
  casoId: string
  kardex: KardexMedicamento[]
}

export function KardexClient({ casoId, kardex: initial }: Props) {
  const [kardex, setKardex] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MedFormData>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const activos   = kardex.filter(k => k.estatus === 'activo')
  const otros     = kardex.filter(k => k.estatus !== 'activo')

  function startAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  function startEdit(med: KardexMedicamento) {
    setForm({
      nombre:       med.nombre,
      presentacion: med.presentacion ?? '',
      dosis:        med.dosis ?? '',
      via:          med.via  ?? '',
      frecuencia:   med.frecuencia ?? '',
      horarios:     med.horarios.join(', '),
      fecha_inicio: med.fecha_inicio ?? '',
      medico:       med.medico ?? '',
      motivo:       med.motivo ?? '',
      estatus:      med.estatus,
      existencia_domicilio: med.existencia_domicilio,
      observaciones: med.observaciones ?? '',
    })
    setEditingId(med.id)
    setShowForm(true)
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, String(v)))
    fd.set('caso_id', casoId)

    startTransition(async () => {
      const result = editingId
        ? await actualizarKardexMed(editingId, fd)
        : await crearKardexMed(fd)

      if (result?.error) {
        setError(result.error)
        return
      }

      const updated: KardexMedicamento = {
        id:          editingId ?? crypto.randomUUID(),
        caso_id:     casoId,
        nombre:      form.nombre,
        presentacion: form.presentacion || null,
        dosis:       form.dosis || null,
        via:         form.via || null,
        frecuencia:  form.frecuencia || null,
        horarios:    form.horarios ? form.horarios.split(',').map(s => s.trim()).filter(Boolean) : [],
        fecha_inicio: form.fecha_inicio || null,
        fecha_suspension: null,
        medico:      form.medico || null,
        motivo:      form.motivo || null,
        estatus:     form.estatus,
        existencia_domicilio: form.existencia_domicilio,
        observaciones: form.observaciones || null,
        creado_por:  null,
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      }

      if (editingId) {
        setKardex(prev => prev.map(k => k.id === editingId ? { ...k, ...updated } : k))
      } else {
        setKardex(prev => [updated, ...prev])
      }

      setShowForm(false)
      setEditingId(null)
    })
  }

  function handleSuspend(med: KardexMedicamento) {
    if (!confirm(`¿Suspender "${med.nombre}"?`)) return
    startTransition(async () => {
      await suspenderKardexMed(med.id, casoId)
      setKardex(prev => prev.map(k => k.id === med.id
        ? { ...k, estatus: 'suspendido' as EstatusKardex }
        : k
      ))
    })
  }

  return (
    <div className="space-y-5">

      {/* Header acción */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {activos.length} activos · {kardex.length} total
          </p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#2AABBF' }}
        >
          <Plus size={15} /> Agregar medicamento
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-[#2AABBF]/20 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Pill size={16} style={{ color: '#2AABBF' }} />
              <span className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                {editingId ? 'Editar medicamento' : 'Nuevo medicamento'}
              </span>
            </div>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className={inputCls} required placeholder="Ej: Omeprazol"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Presentación</label>
                <input
                  value={form.presentacion}
                  onChange={e => setForm(f => ({ ...f, presentacion: e.target.value }))}
                  className={inputCls} placeholder="Ej: Cápsulas 20mg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dosis</label>
                <input
                  value={form.dosis}
                  onChange={e => setForm(f => ({ ...f, dosis: e.target.value }))}
                  className={inputCls} placeholder="Ej: 20mg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Vía</label>
                <select
                  value={form.via}
                  onChange={e => setForm(f => ({ ...f, via: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">— Seleccionar —</option>
                  <option>Oral</option>
                  <option>Intravenosa</option>
                  <option>Intramuscular</option>
                  <option>Subcutánea</option>
                  <option>Tópica</option>
                  <option>Inhalatoria</option>
                  <option>Sublingual</option>
                  <option>Nasal</option>
                  <option>Rectal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Frecuencia</label>
                <select
                  value={form.frecuencia}
                  onChange={e => setForm(f => ({ ...f, frecuencia: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">— Seleccionar —</option>
                  <option>Cada 4 horas</option>
                  <option>Cada 6 horas</option>
                  <option>Cada 8 horas</option>
                  <option>Cada 12 horas</option>
                  <option>Cada 24 horas</option>
                  <option>Una vez al día</option>
                  <option>Dos veces al día</option>
                  <option>Tres veces al día</option>
                  <option>Lunes, miércoles y viernes</option>
                  <option>Según necesidad</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Horarios <span className="text-gray-400">(separados por coma)</span>
                </label>
                <input
                  value={form.horarios}
                  onChange={e => setForm(f => ({ ...f, horarios: e.target.value }))}
                  className={inputCls} placeholder="08:00, 14:00, 20:00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Médico que indica</label>
                <input
                  value={form.medico}
                  onChange={e => setForm(f => ({ ...f, medico: e.target.value }))}
                  className={inputCls} placeholder="Dr. García"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha inicio</label>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                <select
                  value={form.estatus}
                  onChange={e => setForm(f => ({ ...f, estatus: e.target.value as EstatusKardex }))}
                  className={selectCls}
                >
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="temporal">Temporal</option>
                  <option value="prn">PRN / S.O.S</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.existencia_domicilio}
                    onChange={e => setForm(f => ({ ...f, existencia_domicilio: e.target.checked }))}
                    className="accent-[#2AABBF] w-4 h-4"
                  />
                  Hay existencia en domicilio
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Motivo / indicación</label>
                <input
                  value={form.motivo}
                  onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  className={inputCls} placeholder="Para qué se indica..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  rows={2}
                  className={inputCls}
                />
              </div>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300">
                Cancelar
              </button>
              <button type="submit" disabled={pending}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#1B2B4B' }}>
                <Check size={14} />
                {pending ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista: activos */}
      {activos.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Medicamentos Activos · {activos.length}
          </h2>
          <div className="space-y-2">
            {activos.map(med => (
              <MedCard
                key={med.id}
                med={med}
                expanded={expandedId === med.id}
                onToggle={() => setExpandedId(expandedId === med.id ? null : med.id)}
                onEdit={() => startEdit(med)}
                onSuspend={() => handleSuspend(med)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lista: otros */}
      {otros.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Suspendidos / PRN · {otros.length}
          </h2>
          <div className="space-y-2 opacity-60">
            {otros.map(med => (
              <MedCard
                key={med.id}
                med={med}
                expanded={expandedId === med.id}
                onToggle={() => setExpandedId(expandedId === med.id ? null : med.id)}
                onEdit={() => startEdit(med)}
              />
            ))}
          </div>
        </div>
      )}

      {kardex.length === 0 && !showForm && (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <Pill size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No hay medicamentos en el kardex</p>
          <p className="text-xs text-gray-300 mt-1">Agrega los medicamentos activos del paciente</p>
        </div>
      )}
    </div>
  )
}

function MedCard({
  med, expanded, onToggle, onEdit, onSuspend,
}: {
  med: KardexMedicamento
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onSuspend?: () => void
}) {
  const st = ESTATUS_STYLE[med.estatus]
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center px-5 py-4 gap-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: st.bg }}>
          <Pill size={16} style={{ color: st.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>{med.nombre}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: st.bg, color: st.color }}>
              {st.label}
            </span>
            {!med.existencia_domicilio && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                Sin existencia
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {med.dosis && (
              <span className="text-xs text-gray-500">{med.dosis}</span>
            )}
            {med.via && (
              <span className="text-xs text-gray-400">· {med.via}</span>
            )}
            {med.frecuencia && (
              <span className="text-xs text-gray-400">· {med.frecuencia}</span>
            )}
          </div>
          {med.horarios.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Clock size={10} className="text-gray-300" />
              {med.horarios.map(h => (
                <span key={h} className="text-xs px-1.5 py-0.5 rounded bg-[#EBF8FB] text-[#1A7A8C]">{h}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#2AABBF] hover:bg-[#EBF8FB] transition-all">
            <Pencil size={14} />
          </button>
          {med.estatus === 'activo' && onSuspend && (
            <button onClick={onSuspend}
              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-all">
              <PauseCircle size={14} />
            </button>
          )}
          <button onClick={onToggle}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-5 pb-4 pt-0 border-t border-gray-50 bg-gray-50/50 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {med.presentacion && (
            <div>
              <p className="text-gray-400 mb-0.5">Presentación</p>
              <p className="text-gray-700">{med.presentacion}</p>
            </div>
          )}
          {med.medico && (
            <div>
              <p className="text-gray-400 mb-0.5">Médico</p>
              <p className="text-gray-700">{med.medico}</p>
            </div>
          )}
          {med.fecha_inicio && (
            <div>
              <p className="text-gray-400 mb-0.5">Desde</p>
              <p className="text-gray-700">{med.fecha_inicio}</p>
            </div>
          )}
          {med.motivo && (
            <div className="sm:col-span-2">
              <p className="text-gray-400 mb-0.5">Indicación</p>
              <p className="text-gray-700">{med.motivo}</p>
            </div>
          )}
          {med.observaciones && (
            <div className="sm:col-span-3">
              <p className="text-gray-400 mb-0.5">Observaciones</p>
              <p className="text-gray-700">{med.observaciones}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
