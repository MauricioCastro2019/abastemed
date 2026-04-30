'use client'

import { useEffect, useState, useTransition } from 'react'
import { getMisTurnos, getMiPerfil } from '@/lib/actions/enfermero-portal'
import { crearEntrega } from '@/lib/actions/entregas'
import { ArrowLeft, Plus, Trash2, Heart, Pill, FileText, AlertTriangle, User } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Turno, MedicamentoAdministrado } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

const MED_VACIO: MedicamentoAdministrado = {
  nombre: '', dosis: '', hora: '', via: 'oral', administrado: true, observaciones: '',
}

export default function EntregaTurnoPage({ params }: { params: { turnoId: string } }) {
  const [turno, setTurno]     = useState<Turno | null>(null)
  const [enfermeroId, setEnfermeroId] = useState<string | null>(null)
  const [turnosFuturos, setTurnosFuturos] = useState<Turno[]>([])
  const [medicamentos, setMedicamentos] = useState<MedicamentoAdministrado[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [turnos, { enfermero }] = await Promise.all([getMisTurnos(), getMiPerfil()])
        const actual = turnos.find(t => t.id === params.turnoId) ?? null
        setTurno(actual)
        setEnfermeroId(enfermero?.id ?? null)

        // Buscar turnos futuros del mismo caso
        const casoId = (actual?.caso as { id?: string } | undefined)?.id
        if (casoId) {
          const futuros = turnos.filter(t =>
            t.id !== params.turnoId &&
            t.status !== 'completado' &&
            (t.caso as { id?: string } | undefined)?.id === casoId
          )
          setTurnosFuturos(futuros)
        }

        // Pre-cargar medicamentos del paciente como sugerencia
        const meds = (actual?.caso as { paciente?: { medicamentos?: string[] } } | undefined)
          ?.paciente?.medicamentos ?? []
        if (meds.length > 0) {
          setMedicamentos(meds.map(m => ({ ...MED_VACIO, nombre: m })))
        } else {
          setMedicamentos([{ ...MED_VACIO }])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.turnoId])

  function addMed() {
    setMedicamentos(prev => [...prev, { ...MED_VACIO }])
  }
  function removeMed(i: number) {
    setMedicamentos(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateMed(i: number, field: keyof MedicamentoAdministrado, value: string | boolean) {
    setMedicamentos(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('turno_saliente_id', params.turnoId)
    if (enfermeroId) formData.set('enfermero_saliente_id', enfermeroId)
    formData.set('medicamentos_json', JSON.stringify(medicamentos))

    startTransition(async () => {
      try {
        const result = await crearEntrega(formData)
        if (result?.error) { setError(result.error); return }
        toast.success('Entrega registrada — turno completado')
        window.location.href = '/enfermero/turnos'
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado')
      }
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-[#2AABBF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!turno) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-700 text-sm">
      Turno no encontrado o no tienes acceso.
      <Link href="/enfermero/turnos" className="ml-2 underline">Volver a mis turnos</Link>
    </div>
  )

  const caso = turno.caso as { titulo?: string; direccion?: string; paciente?: { nombre: string; apellido: string } } | undefined
  const formatFecha = (f: string) => new Date(f).toLocaleString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/enfermero/turnos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Entrega de turno</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {caso?.titulo} · {formatFecha(turno.fecha_inicio)}
            </p>
          </div>
        </div>
        <div className="ml-9 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Al registrar la entrega, el turno quedará <strong>completado</strong> y se generará el cobro automáticamente.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Signos vitales */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={16} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Signos vitales</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={LABEL}>Presión arterial</label>
              <input name="sv_presion" className={INPUT} placeholder="120/80" />
            </div>
            <div>
              <label className={LABEL}>Frec. cardíaca (bpm)</label>
              <input name="sv_fc" type="number" min="0" className={INPUT} placeholder="75" />
            </div>
            <div>
              <label className={LABEL}>Temperatura (°C)</label>
              <input name="sv_temp" type="number" step="0.1" min="30" max="45" className={INPUT} placeholder="36.5" />
            </div>
            <div>
              <label className={LABEL}>SpO₂ (%)</label>
              <input name="sv_sato2" type="number" min="0" max="100" className={INPUT} placeholder="98" />
            </div>
            <div>
              <label className={LABEL}>Frec. respiratoria</label>
              <input name="sv_fr" type="number" min="0" className={INPUT} placeholder="16" />
            </div>
            <div>
              <label className={LABEL}>Glucosa (mg/dL)</label>
              <input name="sv_glucosa" type="number" min="0" className={INPUT} placeholder="100" />
            </div>
            <div>
              <label className={LABEL}>Peso (kg)</label>
              <input name="sv_peso" type="number" step="0.1" min="0" className={INPUT} placeholder="65" />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Observaciones signos</label>
              <input name="sv_obs" className={INPUT} placeholder="Edemas, coloración, estado de consciencia..." />
            </div>
          </div>
        </section>

        {/* Medicamentos administrados */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pill size={16} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                Medicamentos administrados
              </h2>
            </div>
            <button type="button" onClick={addMed}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#2AABBF] text-[#2AABBF] hover:bg-[#EBF8FB] transition-all">
              <Plus size={12} />
              Agregar
            </button>
          </div>

          {medicamentos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Sin medicamentos registrados. Agrega los que administraste.
            </p>
          ) : (
            <div className="space-y-3">
              {medicamentos.map((med, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-gray-50">
                  <div className="col-span-4">
                    <input value={med.nombre} onChange={e => updateMed(i, 'nombre', e.target.value)}
                      placeholder="Medicamento" className={INPUT} />
                  </div>
                  <div className="col-span-2">
                    <input value={med.dosis} onChange={e => updateMed(i, 'dosis', e.target.value)}
                      placeholder="Dosis" className={INPUT} />
                  </div>
                  <div className="col-span-2">
                    <input value={med.hora} onChange={e => updateMed(i, 'hora', e.target.value)}
                      placeholder="Hora" type="time" className={INPUT} />
                  </div>
                  <div className="col-span-2">
                    <select value={med.via} onChange={e => updateMed(i, 'via', e.target.value)} className={INPUT}>
                      <option value="oral">Oral</option>
                      <option value="IV">IV</option>
                      <option value="IM">IM</option>
                      <option value="SC">SC</option>
                      <option value="SL">SL</option>
                      <option value="topico">Tópico</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <input type="checkbox" checked={med.administrado}
                      onChange={e => updateMed(i, 'administrado', e.target.checked)}
                      className="w-4 h-4 rounded accent-[#2AABBF]" title="Administrado" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeMed(i)}
                      className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400">
                Columnas: Medicamento · Dosis · Hora · Vía · Administrado ✓
              </p>
            </div>
          )}
        </section>

        {/* Observaciones generales */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Observaciones generales *</h2>
          </div>
          <textarea name="observaciones" required rows={4} className={INPUT}
            placeholder="Estado general del paciente, actividades realizadas, notas para el próximo enfermero..." />
        </section>

        {/* Incidentes */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Incidentes</h2>
            <span className="text-xs text-gray-400">(opcional)</span>
          </div>
          <textarea name="incidentes" rows={3} className={INPUT}
            placeholder="Caídas, cambios bruscos en signos vitales, medicamentos omitidos, cualquier evento relevante..." />
        </section>

        {/* Próximo turno (opcional) */}
        {turnosFuturos.length > 0 && (
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Próximo turno</h2>
              <span className="text-xs text-gray-400">(opcional)</span>
            </div>
            <select name="turno_entrante_id" className={INPUT}
              onChange={e => {
                const t = turnosFuturos.find(t => t.id === e.target.value)
                const enf = t?.enfermero as { id?: string } | undefined
                const input = document.querySelector<HTMLInputElement>('input[name="enfermero_entrante_id"]')
                if (input) input.value = enf?.id ?? ''
              }}>
              <option value="">No especificado</option>
              {turnosFuturos.map(t => {
                const enf = t.enfermero as { nombre?: string; apellido?: string } | undefined
                const fecha = new Date(t.fecha_inicio).toLocaleString('es-VE', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })
                return (
                  <option key={t.id} value={t.id}>
                    {enf?.nombre} {enf?.apellido} — {fecha}
                  </option>
                )
              })}
            </select>
            <input type="hidden" name="enfermero_entrante_id" />
          </section>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/enfermero/turnos"
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
            Cancelar
          </Link>
          <button type="submit" disabled={isPending}
            className="px-6 py-2.5 text-sm font-bold text-white rounded-lg transition-all"
            style={{ backgroundColor: isPending ? '#94a3b8' : '#1B2B4B' }}>
            {isPending ? 'Registrando...' : 'Registrar entrega y completar turno'}
          </button>
        </div>
      </form>
    </div>
  )
}
