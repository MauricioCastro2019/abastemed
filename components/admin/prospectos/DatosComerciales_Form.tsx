'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { upsertServiceRequest } from '@/lib/actions/evaluaciones'
import type { ServiceRequest } from '@/types'

const STAFF_OPTIONS = [
  { value: 'mujer',              label: 'Mujer' },
  { value: 'hombre',             label: 'Hombre' },
  { value: 'indistinto',         label: 'Indistinto' },
  { value: 'exp_adulto_mayor',   label: 'Experiencia en adulto mayor' },
  { value: 'exp_clinica',        label: 'Experiencia clínica' },
  { value: 'fuerza_fisica',      label: 'Fuerza física (movilización)' },
  { value: 'trato_calido',       label: 'Trato paciente y cálido' },
]

interface Props {
  prospectId: string
  preassessmentId: string | null
  existing: ServiceRequest | null
}

export function DatosComerciales_Form({ prospectId, preassessmentId, existing }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [staffPref, setStaffPref] = useState<string[]>(existing?.staff_preference ?? [])

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  function toggleStaff(val: string) {
    setStaffPref(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    staffPref.forEach(s => fd.append('staff_preference', s))

    startTransition(async () => {
      const res = await upsertServiceRequest(prospectId, preassessmentId, fd)
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
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Datos comerciales del servicio</h1>
          <p className="text-sm text-gray-500 mt-1">Paso 6 de 8</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: '#1B2B4B' }}>Tipo de servicio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de servicio solicitado</label>
              <select name="requested_service_type" defaultValue={existing?.requested_service_type ?? 'no_sabe'} className={inputCls}>
                <option value="acompanamiento_basico">Acompañamiento básico</option>
                <option value="cuidado_asistido">Cuidado asistido</option>
                <option value="cuidado_clinico">Cuidado clínico</option>
                <option value="cuidado_especializado">Cuidado especializado</option>
                <option value="no_sabe">No sabe / requiere orientación</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Duración de guardia</label>
              <select name="shift_duration_hours" defaultValue={existing?.shift_duration_hours ?? 8} className={inputCls}>
                <option value={4}>4 horas</option>
                <option value={6}>6 horas</option>
                <option value={8}>8 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Horario</label>
              <select name="shift_schedule" defaultValue={existing?.shift_schedule ?? 'por_definir'} className={inputCls}>
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="nocturno">Nocturno</option>
                <option value="mixto">Mixto</option>
                <option value="rotativo">Rotativo</option>
                <option value="por_definir">Por definir</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Frecuencia</label>
              <select name="frequency" defaultValue={existing?.frequency ?? 'por_definir'} className={inputCls}>
                <option value="una_sola_vez">Una sola vez</option>
                <option value="dias_especificos">Algunos días específicos</option>
                <option value="diario_temporal">Diario temporal</option>
                <option value="diario_indefinido">Diario indefinido</option>
                <option value="veinticuatro_siete">24/7 con varios turnos</option>
                <option value="por_definir">Por definir</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha de inicio</label>
              <select name="requested_start_date" defaultValue={existing?.requested_start_date ?? 'sin_fecha'} className={inputCls}>
                <option value="hoy_mismo">Hoy mismo</option>
                <option value="manana">Mañana</option>
                <option value="esta_semana">Esta semana</option>
                <option value="fecha_especifica">Fecha específica</option>
                <option value="sin_fecha">Sin fecha definida</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Duración estimada</label>
              <select name="estimated_duration" defaultValue={existing?.estimated_duration ?? 'no_se_sabe'} className={inputCls}>
                <option value="una_guardia">Solo una guardia</option>
                <option value="dos_tres_dias">2 a 3 días</option>
                <option value="una_semana">Una semana</option>
                <option value="dos_cuatro_semanas">2 a 4 semanas</option>
                <option value="mas_mes">Más de un mes</option>
                <option value="indefinido">Indefinido</option>
                <option value="no_se_sabe">No se sabe</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Ubicación / zona</label>
              <select name="location_type" defaultValue={existing?.location_type ?? 'normal'} className={inputCls}>
                <option value="normal">Zona cercana / normal</option>
                <option value="lejana">Zona lejana</option>
                <option value="dificil">Zona de difícil acceso</option>
                <option value="fuera_ciudad">Fuera de ciudad (cotización especial)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: '#1B2B4B' }}>Preferencias de personal</h2>
          <div className="grid grid-cols-2 gap-2">
            {STAFF_OPTIONS.map(opt => (
              <label key={opt.value}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ${staffPref.includes(opt.value) ? 'border-[#2AABBF] bg-[#EBF8FB]' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="checkbox" checked={staffPref.includes(opt.value)} onChange={() => toggleStaff(opt.value)} className="w-4 h-4 accent-[#2AABBF]" />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold mb-5" style={{ color: '#1B2B4B' }}>Reportes, supervisión y pagos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de reporte</label>
              <select name="report_type" defaultValue={existing?.report_type ?? 'reporte_breve'} className={inputCls}>
                <option value="avisos_importantes">Solo avisos importantes</option>
                <option value="reporte_breve">Reporte breve al finalizar (+$50)</option>
                <option value="bitacora_formal">Bitácora formal por guardia (+$100)</option>
                <option value="reporte_clinico">Reporte clínico estructurado (+$150)</option>
                <option value="resumen_semanal">Resumen semanal familiar (+$250/sem)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Supervisión</label>
              <select name="supervision_type" defaultValue={existing?.supervision_type ?? 'ninguna'} className={inputCls}>
                <option value="ninguna">No</option>
                <option value="valoracion_unica">Valoración inicial única (+$700)</option>
                <option value="semanal">Supervisión semanal (+$500)</option>
                <option value="por_evento">Supervisión por evento (+$375)</option>
                <option value="obligatoria">Obligatoria por complejidad (+$500)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Control de medicamentos</label>
              <select name="medication_control_type" defaultValue={existing?.medication_control_type ?? 'ninguno'} className={inputCls}>
                <option value="ninguno">No</option>
                <option value="solo_apoyo">Solo apoyar</option>
                <option value="registro">Registrar administrados (+$100)</option>
                <option value="organizar_horarios">Organizar horarios (+$150)</option>
                <option value="revisar_existencia">Revisar existencia (+$100)</option>
                <option value="control_completo">Control completo y alertas (+$250)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Manejo de insumos</label>
              <select name="supplies_handling" defaultValue={existing?.supplies_handling ?? 'familia_provee'} className={inputCls}>
                <option value="familia_provee">La familia proporciona todo</option>
                <option value="abastemed_compra_reembolso">Abastemed compra con reembolso</option>
                <option value="abastemed_cotiza">Abastemed los incluye en cotización</option>
                <option value="por_definir">Por definir</option>
                <option value="no_saben">No saben qué necesitan</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Forma de pago</label>
              <select name="payment_method" defaultValue={existing?.payment_method ?? 'por_definir'} className={inputCls}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="deposito">Depósito</option>
                <option value="tarjeta">Tarjeta / terminal</option>
                <option value="por_definir">Por definir</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Frecuencia de pago</label>
              <select name="payment_frequency" defaultValue={existing?.payment_frequency ?? 'por_definir'} className={inputCls}>
                <option value="por_guardia">Por guardia</option>
                <option value="semanal_anticipado">Semanal anticipado</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="por_definir">Por definir</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Notas comerciales</label>
              <textarea name="commercial_notes" defaultValue={existing?.commercial_notes ?? ''} rows={3} className={inputCls} placeholder="Condiciones especiales, acuerdos, observaciones..." />
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
            {pending ? 'Guardando...' : 'Guardar datos comerciales'}
          </button>
        </div>
      </form>
    </div>
  )
}
