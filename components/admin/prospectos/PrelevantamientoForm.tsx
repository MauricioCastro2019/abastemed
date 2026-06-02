'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { upsertPreassessment } from '@/lib/actions/evaluaciones'
import type { PatientPreassessment } from '@/types'

interface Props {
  prospectId: string
  existing: PatientPreassessment | null
}

export function PrelevantamientoForm({ prospectId, existing }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await upsertPreassessment(prospectId, fd)
      if (res.error) { setError(res.error); return }
      router.push(`/prospectos/${prospectId}`)
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/prospectos/${prospectId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Pre-levantamiento del paciente</h1>
          <p className="text-sm text-gray-500 mt-1">Paso 2 de 8 — Datos del paciente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: '#1B2B4B' }}>Datos del paciente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nombre completo del paciente *</label>
              <input name="patient_name" defaultValue={existing?.patient_name} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Edad</label>
              <input name="patient_age" type="number" min={0} max={120} defaultValue={existing?.patient_age ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Sexo</label>
              <select name="patient_gender" defaultValue={existing?.patient_gender ?? ''} className={inputCls}>
                <option value="">No especificado</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Peso aproximado (kg)</label>
              <input name="approximate_weight" type="number" min={0} defaultValue={existing?.approximate_weight ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>¿Dónde se encuentra actualmente?</label>
              <select name="current_location" defaultValue={existing?.current_location ?? 'casa'} className={inputCls}>
                <option value="casa">Casa</option>
                <option value="hospital">Hospital</option>
                <option value="asilo">Asilo / casa de reposo</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Diagnóstico conocido</label>
              <textarea name="diagnosis" defaultValue={existing?.diagnosis ?? ''} rows={2} className={inputCls} placeholder="Diagnóstico médico principal..." />
            </div>
            <div>
              <label className={labelCls}>Médico tratante</label>
              <input name="doctor_name" defaultValue={existing?.doctor_name ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Hospital o clínica de referencia</label>
              <input name="hospital_reference" defaultValue={existing?.hospital_reference ?? ''} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="currently_hospitalized" value="true"
                  defaultChecked={existing?.currently_hospitalized}
                  className="w-4 h-4 accent-[#2AABBF]" />
                <span className="text-sm text-gray-700">Actualmente está hospitalizado</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: '#1B2B4B' }}>Domicilio del servicio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Dirección</label>
              <input name="service_address" defaultValue={existing?.service_address ?? ''} className={inputCls} placeholder="Calle, número..." />
            </div>
            <div>
              <label className={labelCls}>Colonia / zona</label>
              <input name="neighborhood" defaultValue={existing?.neighborhood ?? ''} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Ciudad</label>
              <input name="city" defaultValue={existing?.city ?? ''} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Observaciones generales</label>
              <textarea name="general_observations" defaultValue={existing?.general_observations ?? ''} rows={3} className={inputCls} placeholder="Condiciones del domicilio, acceso, escaleras, etc." />
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" disabled={pending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#2AABBF' }}>
            {pending ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </div>
      </form>
    </div>
  )
}
