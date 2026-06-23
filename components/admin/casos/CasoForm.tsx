'use client'

import { useTransition, useState } from 'react'
import { crearCaso, actualizarCaso } from '@/lib/actions/casos'
import type { Caso, Paciente, PerfilUsuario, RolUsuario } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const INPUT_ERR = "w-full px-3 py-2 rounded-lg border border-red-300 text-sm outline-none focus:border-red-400 transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"
const FIELD_ERR = "text-xs text-red-500 mt-1"

const DIAS_SEMANA = [
  { key: 'lunes',     short: 'L' },
  { key: 'martes',    short: 'M' },
  { key: 'miercoles', short: 'Mi' },
  { key: 'jueves',    short: 'J' },
  { key: 'viernes',   short: 'V' },
  { key: 'sabado',    short: 'S' },
  { key: 'domingo',   short: 'D' },
]

interface Props {
  caso?: Caso
  pacientes: Paciente[]
  coordinadores?: PerfilUsuario[]
  rolActual?: RolUsuario
  defaultPacienteId?: string
  defaultCosto?: number
}

function fmt(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CasoForm({ caso, pacientes, coordinadores, rolActual, defaultPacienteId, defaultCosto }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Estado controlado para auto-fill
  const [pacienteId, setPacienteId]       = useState(caso?.paciente_id ?? defaultPacienteId ?? '')
  const [coordinadorId, setCoordinadorId] = useState(caso?.coordinador_id ?? '')
  const [contexto, setContexto]           = useState(caso?.contexto ?? 'domicilio')
  const [notas, setNotas]                 = useState(caso?.notas ?? '')
  const [titulo, setTitulo]               = useState(caso?.titulo ?? '')
  const [diasSemana, setDiasSemana]       = useState<string[]>(caso?.dias_semana ?? [])
  const [costoGuardia, setCostoGuardia]   = useState<number>(caso?.costo_guardia ?? defaultCosto ?? 0)
  const [horasTurno, setHorasTurno]       = useState<number>(caso?.horas_turno ?? 8)

  const tarifaHoraCalc = horasTurno > 0 ? costoGuardia / horasTurno : 0

  function inp(name: string) {
    return fieldErrors[name] ? INPUT_ERR : INPUT
  }

  function handlePacienteChange(id: string) {
    setPacienteId(id)
    const p = pacientes.find(px => px.id === id)
    if (!p) return

    setContexto(p.contexto)

    // Auto-sugerir título
    if (!titulo || titulo === '') {
      setTitulo(`Cuidados ${p.contexto === 'hospital' ? 'hospitalarios' : 'domiciliarios'} — ${p.nombre} ${p.apellido}`)
    }

    // Auto-sugerir notas con datos clínicos del paciente
    const lines: string[] = []
    if (p.diagnostico)            lines.push(`Dx: ${p.diagnostico}`)
    if (p.alergias?.length)       lines.push(`Alergias: ${p.alergias.join(', ')}`)
    if (p.medicamentos?.length)   lines.push(`Medicamentos: ${p.medicamentos.join(', ')}`)
    if (p.contacto_familiar?.nombre) {
      lines.push(`Familiar: ${p.contacto_familiar.nombre} (${p.contacto_familiar.relacion}) · ${p.contacto_familiar.telefono}`)
    }
    if (lines.length) setNotas(lines.join('\n'))
  }

  function toggleDia(dia: string) {
    setDiasSemana(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    // Días no van en el form nativo con checkboxes desactivados, los agrego manualmente
    diasSemana.forEach(d => formData.append('dias_semana', d))

    startTransition(async () => {
      try {
        const result = caso
          ? await actualizarCaso(caso.id, formData)
          : await crearCaso(formData)
        if (result?.fieldErrors) setFieldErrors(result.fieldErrors)
        else if (result?.error) setError(result.error)
        else window.location.href = caso ? `/casos/${caso.id}?ok=updated` : '/casos?ok=created'
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado. Intenta de nuevo.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Paciente ─────────────────────────────────────────── */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Paciente</h2>
        <div className="space-y-4">
          <div>
            <label className={LABEL}>Paciente *</label>
            <select
              name="paciente_id"
              value={pacienteId}
              onChange={e => handlePacienteChange(e.target.value)}
              className={inp('paciente_id')}
            >
              <option value="" disabled>Selecciona un paciente...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
              ))}
            </select>
            {fieldErrors.paciente_id && <p className={FIELD_ERR}>{fieldErrors.paciente_id}</p>}
            {pacientes.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No hay pacientes activos. <a href="/pacientes/nuevo" className="underline">Crear paciente</a>
              </p>
            )}
            {pacienteId && (
              <p className="text-xs text-[#2AABBF] mt-1">
                Contexto y datos clínicos aplicados automáticamente en notas
              </p>
            )}
          </div>

          <div>
            <label className={LABEL}>Título del caso *</label>
            <input
              name="titulo"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className={inp('titulo')}
              placeholder="ej: Cuidados paliativos — Margarita de Anda"
            />
            {fieldErrors.titulo && <p className={FIELD_ERR}>{fieldErrors.titulo}</p>}
          </div>

          {caso && (
            <div>
              <label className={LABEL}>Status</label>
              <select name="status" defaultValue={caso.status} className={INPUT}>
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* ── Coordinador (solo admin) ────────────────────────── */}
      {rolActual === 'admin' && coordinadores && coordinadores.length > 0 && (
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Coordinador</h2>
          <div>
            <label className={LABEL}>Asignar coordinador</label>
            <select
              name="coordinador_id"
              value={coordinadorId ?? ''}
              onChange={e => setCoordinadorId(e.target.value)}
              className={INPUT}
            >
              <option value="">Sin asignar</option>
              {coordinadores.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* ── Horario de atención ──────────────────────────────── */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-1">Horario de atención</h2>
        <p className="text-xs text-gray-400 mb-4">Define los días y horario del servicio</p>

        {/* Días de la semana */}
        <div className="mb-4">
          <label className={LABEL}>Días de servicio</label>
          <div className="flex gap-2 flex-wrap">
            {DIAS_SEMANA.map(({ key, short }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleDia(key)}
                className={`w-10 h-10 rounded-full text-sm font-semibold border-2 transition-all ${
                  diasSemana.includes(key)
                    ? 'text-white border-[#2AABBF]'
                    : 'text-gray-400 border-gray-200 bg-white hover:border-[#2AABBF] hover:text-[#2AABBF]'
                }`}
                style={diasSemana.includes(key) ? { backgroundColor: '#2AABBF' } : {}}
              >
                {short}
              </button>
            ))}
          </div>
          {diasSemana.length === 7 && (
            <p className="text-xs text-[#2AABBF] mt-1.5">Todos los días de la semana</p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Hora inicio</label>
            <input
              name="horario_inicio"
              type="time"
              defaultValue={caso?.horario_inicio ?? '07:00'}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Hora fin</label>
            <input
              name="horario_fin"
              type="time"
              defaultValue={caso?.horario_fin ?? '19:00'}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Horas por turno *</label>
            <select
              name="horas_turno"
              value={horasTurno}
              onChange={e => setHorasTurno(Number(e.target.value))}
              className={INPUT}
            >
              <option value={4}>4 horas</option>
              <option value={6}>6 horas</option>
              <option value={8}>8 horas</option>
              <option value={12}>12 horas</option>
              <option value={24}>24 horas</option>
            </select>
            {fieldErrors.horas_turno && <p className={FIELD_ERR}>{fieldErrors.horas_turno}</p>}
          </div>
        </div>
      </section>

      {/* ── Costo del servicio ───────────────────────────────── */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-1">Costo del servicio</h2>
        <p className="text-xs text-gray-400 mb-4">El costo por guardia define automáticamente la tarifa horaria</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Costo por guardia ($) *</label>
            <input
              name="costo_guardia"
              type="number"
              step="1"
              min="0"
              value={costoGuardia || ''}
              onChange={e => setCostoGuardia(Number(e.target.value))}
              className={inp('costo_guardia')}
              placeholder="1920"
            />
            {fieldErrors.costo_guardia && <p className={FIELD_ERR}>{fieldErrors.costo_guardia}</p>}
          </div>
          <div>
            <label className={LABEL}>Tarifa por hora (calculada)</label>
            <div className="w-full px-3 py-2 rounded-lg border border-gray-100 text-sm bg-gray-50 text-gray-600 flex items-center gap-2">
              <span className="text-[#2AABBF] font-semibold">{fmt(tarifaHoraCalc)}</span>
              <span className="text-gray-400 text-xs">= {fmt(costoGuardia)} ÷ {horasTurno}h</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logística ────────────────────────────────────────── */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-4">Logística</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Contexto *</label>
            <select
              name="contexto"
              value={contexto}
              onChange={e => setContexto(e.target.value as typeof contexto)}
              className={inp('contexto')}
            >
              <option value="domicilio">Domicilio</option>
              <option value="hospital">Hospital</option>
              <option value="casa_reposo">Casa de reposo</option>
            </select>
            {fieldErrors.contexto && <p className={FIELD_ERR}>{fieldErrors.contexto}</p>}
          </div>
          <div>
            <label className={LABEL}>Fecha de inicio *</label>
            <input
              name="fecha_inicio"
              type="date"
              defaultValue={caso?.fecha_inicio ?? new Date().toISOString().split('T')[0]}
              className={inp('fecha_inicio')}
            />
            {fieldErrors.fecha_inicio && <p className={FIELD_ERR}>{fieldErrors.fecha_inicio}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Dirección / Ubicación *</label>
            <input
              name="direccion"
              defaultValue={caso?.direccion}
              className={inp('direccion')}
              placeholder="Calle, número, colonia, ciudad"
            />
            {fieldErrors.direccion && <p className={FIELD_ERR}>{fieldErrors.direccion}</p>}
          </div>
          <div>
            <label className={LABEL}>Fecha de cierre estimada</label>
            <input name="fecha_fin" type="date" defaultValue={caso?.fecha_fin ?? ''} className={INPUT} />
          </div>
        </div>
      </section>

      {/* ── Notas para enfermeros ─────────────────────────────── */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1B2B4B] mb-1">Notas para los enfermeros</h2>
        <p className="text-xs text-gray-400 mb-3">
          {pacienteId
            ? 'Pre-llenadas con datos clínicos del paciente — edita según sea necesario'
            : 'Indicaciones especiales, acceso al domicilio, equipo disponible, preferencias...'}
        </p>
        <textarea
          name="notas"
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={5}
          className={INPUT}
          placeholder="Dx: Cuidados paliativos&#10;Alergias: ninguna conocida&#10;Familiar: Verónica Medina · 4773199600"
        />
      </section>

      {error && !Object.keys(fieldErrors).length && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex gap-3 justify-end">
        <a href="/casos"
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
          Cancelar
        </a>
        <button type="submit" disabled={isPending}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
          style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
          {isPending ? 'Guardando...' : caso ? 'Guardar cambios' : 'Crear caso'}
        </button>
      </div>
    </form>
  )
}
