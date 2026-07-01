'use client'

import { useState, useTransition } from 'react'
import {
  crearPlan, activarPlan, suspenderPlan,
  agregarPlanItem, togglePlanItem, eliminarPlanItem,
} from '@/lib/actions/plan-atencion'
import {
  Plus, ChevronDown, ChevronUp, Power, PowerOff,
  Trash2, ClipboardList, CheckCircle2, AlertTriangle,
  Pill, Heart, Activity, Stethoscope, Utensils,
  Droplets, MoveHorizontal, MessageSquare, Pencil
} from 'lucide-react'
import type {
  PlanAtencion, PlanItem, TipoPlanItem, FrecuenciaPlan, PrioridadAccion,
} from '@/types'
import { TIPO_PLAN_ITEM_CONFIG, FRECUENCIA_PLAN_LABEL } from '@/types'

// ─── Ícono por tipo ───────────────────────────────────────────

function TipoIcon({ tipo, size = 14 }: { tipo: TipoPlanItem; size?: number }) {
  const p = { size, strokeWidth: 2 }
  const map: Record<TipoPlanItem, React.ReactNode> = {
    medicamento:  <Pill {...p} />,
    rutina:       <Heart {...p} />,
    monitoreo:    <Activity {...p} />,
    procedimiento:<Stethoscope {...p} />,
    nutricion:    <Utensils {...p} />,
    eliminacion:  <Droplets {...p} />,
    movilidad:    <MoveHorizontal {...p} />,
    comunicacion: <MessageSquare {...p} />,
  }
  return <>{map[tipo]}</>
}

// ─── Formulario para agregar un ítem ─────────────────────────

interface AddItemFormProps {
  planId: string
  pacienteId: string
  onDone: () => void
}

const TIPOS: TipoPlanItem[] = [
  'medicamento', 'rutina', 'monitoreo', 'procedimiento',
  'nutricion', 'eliminacion', 'movilidad', 'comunicacion',
]

const FRECUENCIAS: FrecuenciaPlan[] = [
  'unica', 'diaria', 'bid', 'tid', 'qid',
  'cada_4h', 'cada_6h', 'cada_8h', 'cada_12h',
  'semanal', 'segun_necesidad', 'personalizada',
]

const HORARIOS_SUGERIDOS: Record<FrecuenciaPlan, string[]> = {
  unica:         [],
  diaria:        ['08:00'],
  bid:           ['08:00', '20:00'],
  tid:           ['08:00', '14:00', '20:00'],
  qid:           ['08:00', '12:00', '16:00', '22:00'],
  cada_4h:       ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'],
  cada_6h:       ['06:00', '12:00', '18:00', '00:00'],
  cada_8h:       ['06:00', '14:00', '22:00'],
  cada_12h:      ['08:00', '20:00'],
  semanal:       [],
  segun_necesidad:[],
  personalizada: [],
}

function AddItemForm({ planId, pacienteId, onDone }: AddItemFormProps) {
  const [tipo, setTipo]             = useState<TipoPlanItem>('medicamento')
  const [nombre, setNombre]         = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPlan>('diaria')
  const [horarios, setHorarios]     = useState<string[]>(['08:00'])
  const [prioridad, setPrioridad]   = useState<PrioridadAccion>('normal')
  const [requiereEvidencia, setRE]  = useState(false)
  const [configJson, setConfigJson] = useState('')
  const [pending, startT]           = useTransition()
  const [error, setError]           = useState('')

  const handleFrecuenciaChange = (f: FrecuenciaPlan) => {
    setFrecuencia(f)
    setHorarios(HORARIOS_SUGERIDOS[f])
  }

  const addHorario = () => setHorarios(h => [...h, '08:00'])
  const updateHorario = (i: number, val: string) =>
    setHorarios(h => h.map((x, j) => j === i ? val : x))
  const removeHorario = (i: number) =>
    setHorarios(h => h.filter((_, j) => j !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setError('')

    let configuracion: Record<string, unknown> = {}
    if (configJson.trim()) {
      try { configuracion = JSON.parse(configJson) }
      catch { setError('El JSON de configuración es inválido'); return }
    }

    startT(async () => {
      const res = await agregarPlanItem(planId, pacienteId, {
        tipo, nombre: nombre.trim(), descripcion: descripcion.trim() || undefined,
        frecuencia, horarios: horarios.filter(Boolean),
        configuracion, prioridad, requiere_evidencia: requiereEvidencia,
      })
      if (res.ok) { onDone() }
      else { setError(res.error ?? 'Error al guardar') }
    })
  }

  const tipoConf = TIPO_PLAN_ITEM_CONFIG[tipo]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Tipo de acción</label>
        <div className="grid grid-cols-4 gap-2">
          {TIPOS.map(t => {
            const c = TIPO_PLAN_ITEM_CONFIG[t]
            return (
              <button key={t} type="button"
                onClick={() => setTipo(t)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition-all"
                style={{
                  borderColor: tipo === t ? c.color : '#e5e7eb',
                  backgroundColor: tipo === t ? c.bg : 'white',
                  color: tipo === t ? c.color : '#6b7280',
                }}>
                <span style={{ color: tipo === t ? c.color : '#9ca3af' }}>
                  <TipoIcon tipo={t} size={16} />
                </span>
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
        <input
          type="text" value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder={tipo === 'medicamento' ? 'ej. Metformina 500mg' : tipo === 'monitoreo' ? 'ej. Signos vitales completos' : 'Nombre del ítem'}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': tipoConf.color } as React.CSSProperties}
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción / instrucciones</label>
        <textarea
          value={descripcion} onChange={e => setDescripcion(e.target.value)}
          rows={2} placeholder="Instrucciones específicas para el enfermero..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
        />
      </div>

      {/* Frecuencia */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Frecuencia</label>
          <select value={frecuencia}
            onChange={e => handleFrecuenciaChange(e.target.value as FrecuenciaPlan)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
            {FRECUENCIAS.map(f => (
              <option key={f} value={f}>{FRECUENCIA_PLAN_LABEL[f]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Prioridad</label>
          <select value={prioridad}
            onChange={e => setPrioridad(e.target.value as PrioridadAccion)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
            <option value="critica">Crítica</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="normal">Normal</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {/* Horarios */}
      {frecuencia !== 'segun_necesidad' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-600">Horarios programados</label>
            <button type="button" onClick={addHorario}
              className="text-xs flex items-center gap-1 hover:underline" style={{ color: '#2AABBF' }}>
              <Plus size={11} /> Agregar horario
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {horarios.map((h, i) => (
              <div key={i} className="flex items-center gap-1">
                <input type="time" value={h}
                  onChange={e => updateHorario(i, e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                {horarios.length > 1 && (
                  <button type="button" onClick={() => removeHorario(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requiere evidencia */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={requiereEvidencia}
          onChange={e => setRE(e.target.checked)}
          className="w-4 h-4 rounded" />
        <span className="text-sm text-gray-600">Requiere evidencia fotográfica</span>
      </label>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending}
          className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50"
          style={{ backgroundColor: tipoConf.color }}>
          {pending ? 'Guardando...' : 'Agregar al plan'}
        </button>
        <button type="button" onClick={onDone}
          className="px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Tarjeta de un plan_item ──────────────────────────────────

function PlanItemCard({
  item, pacienteId, onRefresh,
}: {
  item: PlanItem; pacienteId: string; onRefresh: () => void
}) {
  const [pending, startT] = useTransition()
  const conf = TIPO_PLAN_ITEM_CONFIG[item.tipo]

  const handleToggle = () =>
    startT(async () => {
      await togglePlanItem(item.id, pacienteId, !item.activo)
      onRefresh()
    })

  const handleDelete = () => {
    if (!confirm(`¿Eliminar "${item.nombre}" del plan?`)) return
    startT(async () => {
      await eliminarPlanItem(item.id, pacienteId)
      onRefresh()
    })
  }

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${!item.activo ? 'opacity-50' : ''}`}
      style={{ borderColor: item.activo ? `${conf.color}30` : '#e5e7eb', backgroundColor: item.activo ? conf.bg : '#f9fafb' }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${conf.color}20`, color: conf.color }}>
          <TipoIcon tipo={item.tipo} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[#1B2B4B]">{item.nombre}</p>
              {item.descripcion && (
                <p className="text-xs text-gray-500 mt-0.5">{item.descripcion}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={handleToggle} disabled={pending}
                title={item.activo ? 'Desactivar' : 'Activar'}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400">
                {item.activo ? <PowerOff size={13} /> : <Power size={13} />}
              </button>
              <button onClick={handleDelete} disabled={pending}
                title="Eliminar"
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors text-gray-400">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${conf.color}15`, color: conf.color }}>
              {conf.label}
            </span>
            <span className="text-xs text-gray-500">
              {FRECUENCIA_PLAN_LABEL[item.frecuencia]}
            </span>
            {item.horarios.length > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-500">{item.horarios.join(', ')}</span>
              </>
            )}
            {item.prioridad !== 'normal' && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs font-medium capitalize"
                  style={{ color: item.prioridad === 'critica' ? '#dc2626' : item.prioridad === 'urgente' ? '#ea580c' : item.prioridad === 'alta' ? '#d97706' : '#6b7280' }}>
                  {item.prioridad}
                </span>
              </>
            )}
            {item.requiere_evidencia && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">📷 evidencia</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────

interface Props {
  pacienteId: string
  casoId: string | null
  planActivo: (PlanAtencion & { plan_items: PlanItem[] }) | null
  historial: PlanAtencion[]
}

export function PlanAtencionClient({ pacienteId, casoId, planActivo, historial }: Props) {
  const [showAddItem, setShowAddItem] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)
  const [pending, startT] = useTransition()
  const [error, setError] = useState('')
  const [localItems, setLocalItems] = useState<PlanItem[]>(planActivo?.plan_items ?? [])
  const [plan, setPlan] = useState(planActivo)

  const handleCrearPlan = () => {
    startT(async () => {
      const res = await crearPlan({ paciente_id: pacienteId, caso_id: casoId })
      if (res.ok && res.plan) {
        await activarPlan(res.plan.id, pacienteId)
        // Refresh — en Next.js 14 esto recargará la página con router.refresh()
        window.location.reload()
      } else {
        setError(res.error ?? 'Error al crear plan')
      }
    })
  }

  const handleActivar = (planId: string) => {
    startT(async () => {
      await activarPlan(planId, pacienteId)
      window.location.reload()
    })
  }

  const handleSuspender = (planId: string) => {
    if (!confirm('¿Suspender el plan activo? Las acciones programadas dejarán de generarse.')) return
    startT(async () => {
      await suspenderPlan(planId, pacienteId)
      window.location.reload()
    })
  }

  // Refresca ítems localmente tras agregar/eliminar
  const handleItemAdded = () => {
    setShowAddItem(false)
    window.location.reload()
  }

  const itemsActivos   = (plan?.plan_items ?? []).filter(i => i.activo)
  const itemsInactivos = (plan?.plan_items ?? []).filter(i => !i.activo)

  return (
    <div className="space-y-4">

      {/* Sin plan */}
      {!plan && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-200" />
          <h2 className="text-lg font-bold text-[#1B2B4B] mb-1">Sin plan de atención</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            El Plan de Atención define qué debe hacerse, cuándo y cómo. El sistema genera automáticamente la cola de acciones del enfermero al iniciar cada turno.
          </p>
          <button onClick={handleCrearPlan} disabled={pending}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50"
            style={{ backgroundColor: '#1B2B4B' }}>
            <Plus size={16} />
            {pending ? 'Creando...' : 'Crear Plan de Atención'}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Plan activo */}
      {plan && (
        <>
          {/* Cabecera del plan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: plan.estado === 'activo' ? '#ECFDF5' : '#F3F4F6' }}>
                  <CheckCircle2 size={20} style={{ color: plan.estado === 'activo' ? '#059669' : '#9ca3af' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1B2B4B]">
                      Plan de atención {plan.nombre ? `— ${plan.nombre}` : `v${plan.version}`}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      plan.estado === 'activo'    ? 'bg-emerald-100 text-emerald-700' :
                      plan.estado === 'suspendido'? 'bg-amber-100 text-amber-700'    :
                                                    'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.estado.charAt(0).toUpperCase() + plan.estado.slice(1)}
                    </span>
                  </div>
                  {plan.notas_generales && (
                    <p className="text-xs text-gray-500 mt-0.5">{plan.notas_generales}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {plan.estado === 'activo' && (
                  <button onClick={() => handleSuspender(plan.id)} disabled={pending}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all">
                    <PowerOff size={12} /> Suspender
                  </button>
                )}
                {plan.estado === 'suspendido' && (
                  <button onClick={() => handleActivar(plan.id)} disabled={pending}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-all"
                    style={{ backgroundColor: '#059669' }}>
                    <Power size={12} /> Activar
                  </button>
                )}
                <button onClick={() => setShowAddItem(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-all"
                  style={{ backgroundColor: '#1B2B4B' }}>
                  <Plus size={12} />
                  {showAddItem ? 'Cancelar' : 'Agregar ítem'}
                </button>
              </div>
            </div>
          </div>

          {/* Formulario agregar ítem */}
          {showAddItem && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-[#1B2B4B] mb-4">Nuevo ítem del plan</h3>
              <AddItemForm
                planId={plan.id}
                pacienteId={pacienteId}
                onDone={handleItemAdded}
              />
            </div>
          )}

          {/* Ítems activos */}
          <div className="space-y-3">
            {itemsActivos.length === 0 && !showAddItem && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400 mb-3">El plan no tiene ítems aún.</p>
                <button onClick={() => setShowAddItem(true)}
                  className="text-sm font-semibold flex items-center gap-1.5 mx-auto"
                  style={{ color: '#2AABBF' }}>
                  <Plus size={14} /> Agregar primer ítem
                </button>
              </div>
            )}
            {itemsActivos.map(item => (
              <PlanItemCard
                key={item.id}
                item={item}
                pacienteId={pacienteId}
                onRefresh={() => window.location.reload()}
              />
            ))}
          </div>

          {/* Ítems inactivos (colapsados) */}
          {itemsInactivos.length > 0 && (
            <div>
              <button onClick={() => setShowHistorial(v => !v)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-2">
                {showHistorial ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {itemsInactivos.length} ítem{itemsInactivos.length > 1 ? 's' : ''} inactivo{itemsInactivos.length > 1 ? 's' : ''}
              </button>
              {showHistorial && (
                <div className="space-y-2">
                  {itemsInactivos.map(item => (
                    <PlanItemCard
                      key={item.id}
                      item={item}
                      pacienteId={pacienteId}
                      onRefresh={() => window.location.reload()}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Historial de planes */}
      {historial.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-600">Historial de planes</h3>
            <span className="text-xs text-gray-400">{historial.length} versiones</span>
          </div>
          <div className="divide-y divide-gray-50">
            {historial.filter(p => p.id !== plan?.id).map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-700">Plan v{p.version}</span>
                  <span className="ml-2 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('es-MX')}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  p.estado === 'archivado'  ? 'bg-gray-100 text-gray-500' :
                  p.estado === 'suspendido' ? 'bg-amber-100 text-amber-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {p.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
