'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertActivationChecklist, convertirAPaciente } from '@/lib/actions/cotizacion'
import type { ActivationChecklist } from '@/types'

interface CheckItem {
  key: keyof ActivationChecklist
  label: string
  description: string
  mandatory: boolean
}

const ITEMS: CheckItem[] = [
  { key: 'patient_data_complete',         label: 'Datos del paciente completos',    description: 'Nombre, edad, diagnóstico, domicilio',                           mandatory: true  },
  { key: 'address_confirmed',             label: 'Domicilio confirmado',             description: 'Dirección verificada con la familia',                           mandatory: true  },
  { key: 'payment_responsible_confirmed', label: 'Responsable de pago definido',    description: 'Nombre, teléfono y forma de pago',                              mandatory: true  },
  { key: 'emergency_contact_confirmed',   label: 'Contacto de emergencia',          description: 'Nombre y teléfono de contacto disponible 24h',                   mandatory: true  },
  { key: 'final_price_authorized',        label: 'Precio final autorizado',         description: 'Precio acordado y documentado',                                 mandatory: true  },
  { key: 'deposit_registered',            label: 'Anticipo registrado',             description: 'Anticipo recibido y confirmado',                                mandatory: true  },
  { key: 'terms_accepted',                label: 'Condiciones aceptadas',           description: 'La familia aceptó las condiciones del servicio',                 mandatory: true  },
  { key: 'start_date_confirmed',          label: 'Fecha de inicio confirmada',      description: 'Fecha, hora y turno definidos',                                 mandatory: true  },
  { key: 'staff_profile_confirmed',       label: 'Personal asignado',               description: 'Perfil confirmado y asignado',                                  mandatory: true  },
  { key: 'medical_indications_available', label: 'Indicaciones médicas',            description: 'Receta o indicaciones disponibles (si aplica)',                  mandatory: false },
  { key: 'medication_list_available',     label: 'Lista de medicamentos',           description: 'Medicamentos disponibles en domicilio (si aplica)',              mandatory: false },
  { key: 'supplies_ready',                label: 'Insumos listos',                  description: 'Insumos básicos de cuidado disponibles',                        mandatory: false },
  { key: 'assessment_completed_if_required', label: 'Valoración presencial',       description: 'Valoración realizada si fue requerida por el score',             mandatory: false },
]

interface Props {
  prospectId: string
  preassessmentId: string | null
  quoteId: string | null
  existing?: ActivationChecklist | null
}

export function ActivacionChecklistForm({ prospectId, preassessmentId, quoteId, existing }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [converting, setConverting] = useTransition()
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  const initial: Record<string, boolean> = {}
  if (existing) {
    ITEMS.forEach(item => { initial[item.key as string] = (existing as unknown as Record<string, unknown>)[item.key] as boolean ?? false })
  }
  const [checks, setChecks] = useState<Record<string, boolean>>(initial)

  const mandatory = ITEMS.filter(i => i.mandatory)
  const optional  = ITEMS.filter(i => !i.mandatory)
  const allMandatoryDone = mandatory.every(i => checks[i.key as string])
  const missing = mandatory.filter(i => !checks[i.key as string]).map(i => i.label)

  function toggle(key: string) {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setError('')
    const fd = new FormData()
    ITEMS.forEach(item => fd.set(item.key as string, String(checks[item.key as string] ?? false)))

    startTransition(async () => {
      const res = await upsertActivationChecklist(prospectId, preassessmentId, quoteId, fd)
      if (res.error) { setError(res.error); return }
      setSuccess('Checklist guardado correctamente.')
    })
  }

  async function handleConvert() {
    setError('')
    setConverting(async () => {
      const res = await convertirAPaciente(prospectId)
      if (res.error) { setError(res.error); return }
      router.push(`/pacientes/${res.pacienteId}?success=1`)
    })
  }

  function CheckRow({ item }: { item: CheckItem }) {
    const checked = checks[item.key as string] ?? false
    return (
      <label
        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
          checked
            ? 'border-[#2AABBF] bg-[#EBF8FB]'
            : 'border-gray-100 bg-white hover:border-gray-200'
        }`}>
        <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
          checked ? 'bg-[#2AABBF] border-[#2AABBF]' : 'border-gray-300'
        }`}>
          {checked && <span className="text-white text-xs">✓</span>}
        </div>
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={() => toggle(item.key as string)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium ${checked ? 'text-gray-800' : 'text-gray-700'}`}>{item.label}</p>
            {item.mandatory
              ? <span className="text-xs text-red-500 font-medium">Obligatorio</span>
              : <span className="text-xs text-gray-400">Recomendado</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
        </div>
      </label>
    )
  }

  return (
    <div className="space-y-6">

      {/* Progreso */}
      <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-5">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium" style={{ color: '#1B2B4B' }}>Condiciones obligatorias</span>
            <span className="font-bold" style={{ color: allMandatoryDone ? '#059669' : '#dc2626' }}>
              {mandatory.filter(i => checks[i.key as string]).length}/{mandatory.length}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.round(mandatory.filter(i => checks[i.key as string]).length / mandatory.length * 100)}%`,
                backgroundColor: allMandatoryDone ? '#22c55e' : '#2AABBF',
              }}
            />
          </div>
        </div>
      </div>

      {/* Condiciones obligatorias */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Condiciones obligatorias</h3>
        <div className="space-y-2">
          {mandatory.map(item => <CheckRow key={item.key as string} item={item} />)}
        </div>
      </div>

      {/* Condiciones recomendadas */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Condiciones recomendadas</h3>
        <div className="space-y-2">
          {optional.map(item => <CheckRow key={item.key as string} item={item} />)}
        </div>
      </div>

      {/* Alerta de condiciones faltantes */}
      {!allMandatoryDone && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">No se puede activar. Faltan condiciones obligatorias:</p>
          <ul className="space-y-1">
            {missing.map((m, i) => (
              <li key={i} className="text-sm text-red-600 flex items-center gap-2">
                <span>•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error   && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">{success}</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#2AABBF' }}>
          {pending ? 'Guardando...' : 'Guardar checklist'}
        </button>

        <button
          onClick={handleConvert}
          disabled={!allMandatoryDone || converting}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: allMandatoryDone ? '#059669' : '#9ca3af' }}>
          {converting ? 'Convirtiendo...' : '✓ Convertir a Paciente Activo'}
        </button>
      </div>
    </div>
  )
}
