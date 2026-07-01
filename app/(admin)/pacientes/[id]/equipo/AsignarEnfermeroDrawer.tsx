'use client'

import { useState, useTransition, useMemo } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { crearAsignacion } from '@/lib/actions/equipo-cuidado'
import {
  Search, Star, CheckCircle2, AlertCircle, Clock, Users, AlertTriangle
} from 'lucide-react'
import type { EnfermeroSugerido, RolEquipo, HorarioEquipo } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1.5"

const ROLES: { value: RolEquipo; label: string; desc: string }[] = [
  { value: 'titular',     label: 'Titular',     desc: 'Responsable principal del cuidado' },
  { value: 'habitual',    label: 'Habitual',     desc: 'Participa regularmente en el servicio' },
  { value: 'suplente',    label: 'Suplente',     desc: 'Cubre ausencias del equipo habitual' },
  { value: 'coordinador', label: 'Coordinador',  desc: 'Supervisión clínica y coordinación' },
  { value: 'apoyo',       label: 'Apoyo',        desc: 'Participación puntual o de refuerzo' },
]

const HORARIOS: { value: HorarioEquipo; label: string }[] = [
  { value: 'matutino',        label: 'Matutino (07:00 – 15:00)' },
  { value: 'vespertino',      label: 'Vespertino (15:00 – 23:00)' },
  { value: 'nocturno',        label: 'Nocturno (23:00 – 07:00)' },
  { value: 'mixto',           label: 'Mixto / rotativo' },
  { value: 'sin_horario_fijo', label: 'Según disponibilidad' },
]

interface Props {
  open: boolean
  onClose: () => void
  pacienteId: string
  pacienteNombre: string
  enfermerosSugeridos: EnfermeroSugerido[]
  onSuccess: () => void
}

export function AsignarEnfermeroDrawer({
  open, onClose, pacienteId, pacienteNombre, enfermerosSugeridos, onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<EnfermeroSugerido | null>(null)
  const [rol, setRol] = useState<RolEquipo>('habitual')
  const [horario, setHorario] = useState<HorarioEquipo>('sin_horario_fijo')
  const [esPrincipal, setEsPrincipal] = useState(false)
  const [accesoExpediente, setAccesoExpediente] = useState(true)
  const [requiereAceptacion, setRequiereAceptacion] = useState(false)
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10))
  const [fechaFin, setFechaFin] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return enfermerosSugeridos
    const q = busqueda.toLowerCase()
    return enfermerosSugeridos.filter(s =>
      `${s.enfermero.nombre} ${s.enfermero.apellido}`.toLowerCase().includes(q) ||
      s.enfermero.especialidades?.some(e => e.toLowerCase().includes(q))
    )
  }, [busqueda, enfermerosSugeridos])

  const enEquipo    = filtrados.filter(s => s.ya_en_equipo)
  const disponibles = filtrados.filter(s => !s.ya_en_equipo)

  function reset() {
    setBusqueda('')
    setSeleccionado(null)
    setRol('habitual')
    setHorario('sin_horario_fijo')
    setEsPrincipal(false)
    setAccesoExpediente(true)
    setRequiereAceptacion(false)
    setFechaInicio(new Date().toISOString().slice(0, 10))
    setFechaFin('')
    setObservaciones('')
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!seleccionado) { setError('Selecciona un enfermero.'); return }
    setError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set('paciente_id', pacienteId)
      formData.set('enfermero_id', seleccionado.enfermero.id)
      formData.set('rol', rol)
      formData.set('horario', horario)
      formData.set('es_principal', String(esPrincipal))
      formData.set('acceso_expediente', String(accesoExpediente))
      formData.set('requiere_aceptacion', String(requiereAceptacion))
      formData.set('fecha_inicio', fechaInicio)
      if (fechaFin) formData.set('fecha_fin', fechaFin)
      if (observaciones) formData.set('observaciones', observaciones)

      const result = await crearAsignacion(formData)
      if (result.error) {
        setError(result.error)
      } else {
        reset()
        onSuccess()
        onClose()
      }
    })
  }

  function EnfermeroCard({ sug }: { sug: EnfermeroSugerido }) {
    const { enfermero: e } = sug
    const isSelected = seleccionado?.enfermero.id === e.id
    return (
      <button
        onClick={() => sug.ya_en_equipo ? undefined : setSeleccionado(sug)}
        disabled={sug.ya_en_equipo}
        className={`
          w-full text-left p-3 rounded-xl border transition-all
          ${isSelected ? 'border-[#2AABBF] bg-cyan-50' : 'border-gray-100 bg-white hover:border-gray-200'}
          ${sug.ya_en_equipo ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: isSelected ? '#2AABBF' : '#1B2B4B' }}>
            {e.nombre[0]}{e.apellido[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{e.nombre} {e.apellido}</p>
            {e.especialidades?.length > 0 && (
              <p className="text-xs text-gray-400 truncate">{e.especialidades.slice(0, 2).join(', ')}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {e.rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-amber-500">
                <Star size={10} fill="currentColor" /> {e.rating.toFixed(1)}
              </span>
            )}
            {sug.ya_en_equipo && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                En equipo
              </span>
            )}
            {isSelected && <CheckCircle2 size={16} className="text-[#2AABBF]" />}
          </div>
        </div>
      </button>
    )
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Asignar enfermero" width="max-w-xl">
      <div className="p-6 space-y-6">

        {/* ── PASO 1: Seleccionar enfermero ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#2AABBF] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
            <h3 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              Seleccionar enfermero
            </h3>
          </div>

          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o especialidad..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] bg-white"
            />
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {enEquipo.length > 0 && (
              <>
                <p className="text-xs text-gray-400 font-medium px-1 pt-1">Ya en el equipo</p>
                {enEquipo.map(s => <EnfermeroCard key={s.enfermero.id} sug={s} />)}
                {disponibles.length > 0 && (
                  <p className="text-xs text-gray-400 font-medium px-1 pt-2">Otros enfermeros disponibles</p>
                )}
              </>
            )}
            {disponibles.map(s => <EnfermeroCard key={s.enfermero.id} sug={s} />)}
            {filtrados.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin resultados para &ldquo;{busqueda}&rdquo;</p>
            )}
          </div>

          {seleccionado && (
            <div className="mt-3 p-3 rounded-xl flex items-center gap-2.5"
              style={{ backgroundColor: '#ECFDF5', border: '1px solid #86efac' }}>
              <CheckCircle2 size={14} style={{ color: '#059669' }} className="flex-shrink-0" />
              <span className="text-sm font-medium" style={{ color: '#059669' }}>
                {seleccionado.enfermero.nombre} {seleccionado.enfermero.apellido} seleccionado/a
              </span>
            </div>
          )}

          {/* Advertencia: competencias procedimentales sin validación práctica */}
          {seleccionado && seleccionado.advertencias_procedimentales.length > 0 && (
            <div className="mt-2 p-3 rounded-xl"
              style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D' }}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={14} style={{ color: '#D97706' }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#92400E' }}>
                    Sin validación práctica confirmada
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {seleccionado.advertencias_procedimentales.map(nombre => (
                      <li key={nombre} className="text-xs" style={{ color: '#92400E' }}>
                        · {nombre}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs mt-1.5" style={{ color: '#B45309' }}>
                    La decisión final corresponde a coordinación. Esta advertencia es informativa.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── PASO 2: Rol y horario ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#2AABBF] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
            <h3 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Rol y configuración</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className={LABEL}>Rol en el equipo *</label>
              <div className="grid grid-cols-1 gap-1.5">
                {ROLES.map(r => (
                  <label key={r.value}
                    className={`
                      flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${rol === r.value ? 'border-[#2AABBF] bg-cyan-50' : 'border-gray-100 bg-white hover:border-gray-200'}
                    `}>
                    <input type="radio" name="rol" value={r.value}
                      checked={rol === r.value}
                      onChange={() => setRol(r.value)}
                      className="mt-0.5 accent-[#2AABBF]" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.label}</p>
                      <p className="text-xs text-gray-400">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={LABEL}>Horario habitual</label>
              <select value={horario} onChange={e => setHorario(e.target.value as HorarioEquipo)} className={INPUT}>
                {HORARIOS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Fecha de inicio *</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Fecha de término</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} min={fechaInicio} className={INPUT} />
                <p className="text-xs text-gray-400 mt-0.5">Opcional — dejar vacío si es permanente</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white">
                <input type="checkbox" checked={esPrincipal} onChange={e => setEsPrincipal(e.target.checked)}
                  className="mt-0.5 accent-[#2AABBF]" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Marcar como enfermero principal</p>
                  <p className="text-xs text-gray-400">Visible destacado en el perfil del paciente. Solo puede haber uno.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white">
                <input type="checkbox" checked={accesoExpediente} onChange={e => setAccesoExpediente(e.target.checked)}
                  className="mt-0.5 accent-[#2AABBF]" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Acceso al expediente clínico</p>
                  <p className="text-xs text-gray-400">Permite ver el historial completo del paciente.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white">
                <input type="checkbox" checked={requiereAceptacion} onChange={e => setRequiereAceptacion(e.target.checked)}
                  className="mt-0.5 accent-[#2AABBF]" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Requiere aceptación del enfermero</p>
                  <p className="text-xs text-gray-400">La asignación quedará pendiente hasta que el enfermero confirme.</p>
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* ── PASO 3: Observaciones ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#2AABBF] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
            <h3 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Observaciones operativas</h3>
          </div>
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={3}
            placeholder="Ej: Conoce el servicio, turno preferente nocturno, experiencia con cateterismo…"
            className={INPUT}
          />
        </section>

        {/* ── RESUMEN ── */}
        {seleccionado && (
          <section className="rounded-xl border border-gray-100 p-4 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Resumen</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Enfermero</span>
                <span className="font-medium text-gray-800">{seleccionado.enfermero.nombre} {seleccionado.enfermero.apellido}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paciente</span>
                <span className="font-medium text-gray-800">{pacienteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rol</span>
                <span className="font-medium text-gray-800 capitalize">{rol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado inicial</span>
                <span className="font-medium" style={{ color: requiereAceptacion ? '#d97706' : '#059669' }}>
                  {requiereAceptacion ? 'Pendiente de aceptación' : 'Activa de inmediato'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #fca5a5' }}>
            <AlertCircle size={14} style={{ color: '#dc2626' }} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* ── ACCIONES ── */}
        <div className="flex gap-3 pb-2">
          <button
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-all bg-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !seleccionado}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: '#2AABBF' }}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Clock size={14} className="animate-spin" /> Guardando…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Users size={14} /> Asignar al equipo
              </span>
            )}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
