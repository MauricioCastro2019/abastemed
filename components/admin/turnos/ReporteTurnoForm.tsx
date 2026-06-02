'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearReporteTurno } from '@/lib/actions/reportes-turno'
import type { KardexMedicamento, MedAdministradoReporte, StatusAdministracion } from '@/types'
import {
  Heart, Thermometer, Wind, Droplets, Activity,
  Utensils, AlertTriangle, CheckSquare, Clipboard,
  ChevronDown, ChevronUp, Plus, Trash2
} from 'lucide-react'

// ─── Tipos internos ──────────────────────────────────────────
interface Props {
  turnoId: string
  casoId: string
  enfermeroId: string
  kardex?: KardexMedicamento[]
}

interface MedEntry extends MedAdministradoReporte {
  key: number
}

const CUIDADOS_OPCIONES = [
  'Baño en cama', 'Higiene oral', 'Cambio de pañal', 'Cambio de ropa',
  'Cambio de sábanas', 'Lubricación de piel', 'Masajes', 'Cambios posturales',
  'Movilización', 'Ejercicios respiratorios', 'Ejercicios físicos',
  'Curación', 'Aspiración de secreciones', 'Manejo de sonda',
  'Manejo de oxígeno', 'Apoyo emocional',
]

const STATUS_MED_LABEL: Record<StatusAdministracion, { label: string; color: string }> = {
  administrado:  { label: 'Administrado',  color: 'bg-green-100 text-green-700'  },
  omitido:       { label: 'Omitido',       color: 'bg-red-100 text-red-700'      },
  suspendido:    { label: 'Suspendido',     color: 'bg-gray-100 text-gray-600'   },
  rechazado:     { label: 'Rechazado',      color: 'bg-orange-100 text-orange-700'},
  sin_existencia:{ label: 'Sin existencia', color: 'bg-yellow-100 text-yellow-700'},
  retrasado:     { label: 'Retrasado',      color: 'bg-blue-100 text-blue-700'   },
}

function Section({ title, icon, children, defaultOpen = true }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-50"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: '#2AABBF' }}>{icon}</span>
          <span className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-6 py-5">{children}</div>}
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

const inputCls = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/30 focus:border-[#2AABBF]"
const selectCls = inputCls

// ─── Componente principal ────────────────────────────────────
export function ReporteTurnoForm({ turnoId, casoId, enfermeroId, kardex = [] }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [cuidados, setCuidados] = useState<string[]>([])
  const [meds, setMeds] = useState<MedEntry[]>(() =>
    kardex.filter(k => k.estatus === 'activo').map((k, i) => ({
      key: i,
      kardex_id: k.id,
      nombre: k.nombre,
      dosis: k.dosis ?? '',
      via: k.via ?? '',
      hora_programada: k.horarios[0] ?? '',
      hora_administrada: '',
      status: 'administrado' as StatusAdministracion,
      observaciones: '',
    }))
  )
  const [medCounter, setMedCounter] = useState(kardex.length)

  function toggleCuidado(c: string) {
    setCuidados(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  function addMedManual() {
    setMeds(prev => [...prev, {
      key: medCounter,
      nombre: '', dosis: '', via: '',
      hora_programada: '', hora_administrada: '',
      status: 'administrado', observaciones: '',
    }])
    setMedCounter(n => n + 1)
  }

  function updateMed(key: number, field: keyof MedEntry, value: string) {
    setMeds(prev => prev.map(m => m.key === key ? { ...m, [field]: value } : m))
  }

  function removeMed(key: number) {
    setMeds(prev => prev.filter(m => m.key !== key))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const fd = new FormData(form)

    fd.set('turno_id', turnoId)
    fd.set('caso_id', casoId)
    fd.set('enfermero_id', enfermeroId)
    fd.set('cuidados_realizados', cuidados.join(','))
    fd.set('medicamentos_json', JSON.stringify(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      meds.map(({ key: _k, ...rest }) => rest)
    ))

    startTransition(async () => {
      const result = await crearReporteTurno(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push(`/turnos/${turnoId}`)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── SIGNOS VITALES ── */}
      <Section title="Signos Vitales" icon={<Heart size={16} />}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Presión arterial">
            <input name="sv_presion" placeholder="120/80" className={inputCls} />
          </Field>
          <Field label="FC (bpm)">
            <input name="sv_fc" type="number" placeholder="80" className={inputCls} />
          </Field>
          <Field label="Temperatura (°C)">
            <input name="sv_temp" type="number" step="0.1" placeholder="36.5" className={inputCls} />
          </Field>
          <Field label="SpO₂ sin O₂ (%)">
            <input name="sv_sato2" type="number" placeholder="95" className={inputCls} />
          </Field>
          <Field label="SpO₂ con O₂ (%)">
            <input name="sv_sato2c" type="number" placeholder="98" className={inputCls} />
          </Field>
          <Field label="Litros O₂">
            <input name="sv_ltso2" type="number" step="0.5" placeholder="2" className={inputCls} />
          </Field>
          <Field label="FR (rpm)">
            <input name="sv_fr" type="number" placeholder="16" className={inputCls} />
          </Field>
          <Field label="Glucosa (mg/dL)">
            <input name="sv_glucosa" type="number" placeholder="100" className={inputCls} />
          </Field>
          <Field label="Dolor EVA (0-10)">
            <input name="sv_dolor" type="number" min="0" max="10" placeholder="0" className={inputCls} />
          </Field>
          <Field label="Soporte O₂">
            <select name="sv_soporte_o2" className={selectCls}>
              <option value="">— Sin soporte —</option>
              <option>Puntas nasales</option>
              <option>Mascarilla simple</option>
              <option>Mascarilla reservorio</option>
              <option>Concentrador</option>
              <option>Tanque</option>
            </select>
          </Field>
          <Field label="Peso (kg)">
            <input name="sv_peso" type="number" step="0.1" placeholder="65" className={inputCls} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Observaciones signos vitales">
            <textarea name="sv_obs" rows={2} className={inputCls} placeholder="Notas adicionales..." />
          </Field>
        </div>
      </Section>

      {/* ── ESTADO GENERAL ── */}
      <Section title="Estado General" icon={<Activity size={16} />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Estado neurológico">
            <select name="estado_general" className={selectCls}>
              <option value="">— Seleccionar —</option>
              <option value="alerta">Alerta</option>
              <option value="somnoliento">Somnoliento/a</option>
              <option value="confuso">Confuso/a</option>
              <option value="desorientado">Desorientado/a</option>
              <option value="ansioso">Ansioso/a</option>
              <option value="agitado">Agitado/a</option>
              <option value="cooperador">Cooperador/a</option>
              <option value="no_cooperador">No cooperador/a</option>
            </select>
          </Field>
          <Field label="Observaciones">
            <input name="estado_general_obs" className={inputCls} placeholder="Detalle del estado..." />
          </Field>
        </div>
      </Section>

      {/* ── ALIMENTACIÓN E HIDRATACIÓN ── */}
      <Section title="Alimentación e Hidratación" icon={<Utensils size={16} />} defaultOpen={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Tipo de dieta">
            <select name="tipo_dieta" className={selectCls}>
              <option value="">— Seleccionar —</option>
              <option>Normal</option>
              <option>Blanda</option>
              <option>Líquida</option>
              <option>Papilla</option>
              <option>Sonda nasogástrica</option>
              <option>Parenteral</option>
              <option>Ayuno</option>
            </select>
          </Field>
          <Field label="% Ingesta aprox." hint="0 = nada, 100 = todo">
            <input name="porcentaje_ingesta" type="number" min="0" max="100" placeholder="75" className={inputCls} />
          </Field>
          <Field label="Líquidos ingeridos">
            <input name="liquidos_ingeridos" className={inputCls} placeholder="Ej: 800 ml agua" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {[
            { name: 'nausea', label: 'Náusea' },
            { name: 'vomito', label: 'Vómito' },
            { name: 'dificultad_deglucion', label: 'Dificultad para deglutir' },
          ].map(({ name, label }) => (
            <label key={name} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" name={name} value="true" className="accent-[#2AABBF] w-4 h-4" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Field label="Observaciones">
            <textarea name="obs_alimentacion" rows={2} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* ── ELIMINACIÓN ── */}
      <Section title="Eliminación" icon={<Droplets size={16} />} defaultOpen={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Diuresis">
            <select name="diuresis" className={selectCls}>
              <option value="">— Seleccionar —</option>
              <option value="normal">Normal</option>
              <option value="disminuida">Disminuida</option>
              <option value="aumentada">Aumentada</option>
              <option value="ausente">Ausente</option>
              <option value="sonda_vesical">Por sonda vesical</option>
            </select>
          </Field>
          <Field label="Características orina">
            <input name="caracteristicas_orina" className={inputCls} placeholder="Color, aspecto..." />
          </Field>
          <Field label="Volumen drenado (sonda)">
            <input name="vol_drenado_sonda" className={inputCls} placeholder="Ej: 400 ml" />
          </Field>
          <Field label="Consistencia evacuación">
            <select name="evacuacion_consistencia" className={selectCls}>
              <option value="">—</option>
              <option>Dura</option>
              <option>Formada</option>
              <option>Pastosa</option>
              <option>Líquida</option>
              <option>Muy líquida</option>
            </select>
          </Field>
          <Field label="Color evacuación">
            <input name="evacuacion_color" className={inputCls} placeholder="Café, amarillo..." />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {[
            { name: 'evacuacion', label: 'Hubo evacuación' },
            { name: 'uso_panal', label: 'Usa pañal' },
          ].map(({ name, label }) => (
            <label key={name} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" name={name} value="true" className="accent-[#2AABBF] w-4 h-4" />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Field label="Observaciones">
            <textarea name="obs_eliminacion" rows={2} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* ── MEDICAMENTOS ── */}
      <Section title="Medicamentos Administrados" icon={<AlertTriangle size={16} />}>
        <div className="space-y-3">
          {meds.map(med => (
            <div key={med.key} className="border border-gray-100 rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Medicamento">
                  <input
                    value={med.nombre}
                    onChange={e => updateMed(med.key, 'nombre', e.target.value)}
                    className={inputCls}
                    placeholder="Nombre"
                    required
                  />
                </Field>
                <Field label="Dosis / Vía">
                  <input
                    value={`${med.dosis}${med.via ? ' · ' + med.via : ''}`}
                    onChange={e => updateMed(med.key, 'dosis', e.target.value)}
                    className={inputCls}
                    placeholder="Ej: 500mg oral"
                  />
                </Field>
                <Field label="Hora programada">
                  <input
                    type="time"
                    value={med.hora_programada}
                    onChange={e => updateMed(med.key, 'hora_programada', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Hora administrada">
                  <input
                    type="time"
                    value={med.hora_administrada ?? ''}
                    onChange={e => updateMed(med.key, 'hora_administrada', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Estado">
                  <select
                    value={med.status}
                    onChange={e => updateMed(med.key, 'status', e.target.value as StatusAdministracion)}
                    className={selectCls}
                  >
                    {Object.entries(STATUS_MED_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Observaciones">
                  <input
                    value={med.observaciones ?? ''}
                    onChange={e => updateMed(med.key, 'observaciones', e.target.value)}
                    className={inputCls}
                    placeholder="Reacción, retraso, etc."
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_MED_LABEL[med.status].color}`}>
                  {STATUS_MED_LABEL[med.status].label}
                </span>
                <button type="button" onClick={() => removeMed(med.key)}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addMedManual}
            className="flex items-center gap-2 text-sm text-[#2AABBF] hover:opacity-80 transition-opacity"
          >
            <Plus size={14} /> Agregar medicamento
          </button>
        </div>
      </Section>

      {/* ── CUIDADOS REALIZADOS ── */}
      <Section title="Cuidados Realizados" icon={<CheckSquare size={16} />}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CUIDADOS_OPCIONES.map(c => (
            <label key={c} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cuidados.includes(c)}
                onChange={() => toggleCuidado(c)}
                className="accent-[#2AABBF] w-4 h-4 flex-shrink-0"
              />
              {c}
            </label>
          ))}
        </div>
        <div className="mt-4">
          <Field label="Observaciones de cuidados">
            <textarea name="obs_cuidados" rows={2} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* ── PIEL Y LESIONES ── */}
      <Section title="Piel y Prevención de Lesiones" icon={<Thermometer size={16} />} defaultOpen={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Estado de piel">
            <select name="estado_piel" className={selectCls}>
              <option value="">— Seleccionar —</option>
              <option>Íntegra</option>
              <option>Seca</option>
              <option>Hidratada</option>
              <option>Eritematosa</option>
              <option>Con lesiones</option>
              <option>Con UPP</option>
            </select>
          </Field>
          <Field label="Zonas enrojecidas">
            <input name="zonas_enrojecidas" className={inputCls} placeholder="Sacro, talones..." />
          </Field>
          <Field label="Cambios posturales (cant.)">
            <input name="cambios_posturales_num" type="number" min="0" className={inputCls} placeholder="0" />
          </Field>
        </div>
        <div className="flex gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" name="curaciones_realizadas" value="true" className="accent-[#2AABBF] w-4 h-4" />
            Se realizaron curaciones
          </label>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Descripción de curaciones">
            <textarea name="desc_curaciones" rows={2} className={inputCls} />
          </Field>
          <Field label="Observaciones de piel">
            <textarea name="obs_piel" rows={2} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* ── PENDIENTES ── */}
      <Section title="Pendientes para siguiente turno" icon={<Clipboard size={16} />} defaultOpen={false}>
        <Field label="Pendientes y recomendaciones">
          <textarea
            name="pendientes"
            rows={4}
            className={inputCls}
            placeholder="Medicamentos pendientes, insumos por solicitar, cambios observados, indicaciones por confirmar..."
          />
        </Field>
      </Section>

      {/* ── OBSERVACIONES GENERALES ── */}
      <Section title="Observaciones Generales del Turno" icon={<Wind size={16} />}>
        <Field label="Evolución general y notas del turno">
          <textarea
            name="observaciones"
            rows={4}
            className={inputCls}
            placeholder="Resumen del turno, evolución del paciente, notas relevantes..."
          />
        </Field>
      </Section>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#1B2B4B' }}
        >
          {pending ? 'Guardando...' : 'Guardar reporte de turno'}
        </button>
      </div>
    </form>
  )
}
