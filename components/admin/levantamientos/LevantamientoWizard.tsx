'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  crearLevantamiento,
  actualizarLevantamiento,
  type LevantamientoPayload,
} from '@/lib/actions/levantamientos'
import type {
  LevantamientoPaciente,
  LevantamientoMedicamento,
  LevantamientoMaterial,
  RiesgoNivel,
  PrioridadNivel,
} from '@/types'
import { Plus, Trash2, AlertTriangle, ChevronRight, ChevronLeft, Save, CheckCircle } from 'lucide-react'

// ── Clases base ────────────────────────────────────────────────
const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const SELECT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"
const SECTION = "bg-white rounded-xl p-6 shadow-sm space-y-4"
const SECTION_TITLE = "text-sm font-semibold text-[#1B2B4B] pb-3 border-b border-gray-100"

// ── Estado inicial del formulario ─────────────────────────────
function estadoInicial(lev?: LevantamientoPaciente): LevantamientoPayload {
  if (lev) {
    return {
      paciente_nombre: lev.paciente_nombre, paciente_apellido: lev.paciente_apellido,
      paciente_fecha_nacimiento: lev.paciente_fecha_nacimiento ?? '',
      paciente_sexo: lev.paciente_sexo ?? '', paciente_telefono: lev.paciente_telefono ?? '',
      paciente_domicilio: lev.paciente_domicilio ?? '', paciente_referencias: lev.paciente_referencias ?? '',
      paciente_ciudad: lev.paciente_ciudad ?? '', paciente_estado_geo: lev.paciente_estado_geo ?? '',
      paciente_cp: lev.paciente_cp ?? '', paciente_obs_ubicacion: lev.paciente_obs_ubicacion ?? '',
      responsable_nombre: lev.responsable_nombre ?? '', responsable_parentesco: lev.responsable_parentesco ?? '',
      responsable_tel_principal: lev.responsable_tel_principal ?? '',
      responsable_tel_alternativo: lev.responsable_tel_alternativo ?? '',
      responsable_email: lev.responsable_email ?? '', responsable_es_pagador: lev.responsable_es_pagador,
      responsable_obs: lev.responsable_obs ?? '',
      fecha_solicitud: lev.fecha_solicitud, medio_contacto: lev.medio_contacto ?? '',
      persona_solicita: lev.persona_solicita ?? '', relacion_solicitante: lev.relacion_solicitante ?? '',
      motivo_general: lev.motivo_general ?? '', urgencia_percibida: lev.urgencia_percibida,
      tipos_servicio: lev.tipos_servicio, descripcion_necesidad: lev.descripcion_necesidad ?? '',
      expectativa_familia: lev.expectativa_familia ?? '', obs_servicio: lev.obs_servicio ?? '',
      diagnostico_principal: lev.diagnostico_principal ?? '',
      diagnosticos_secundarios: lev.diagnosticos_secundarios ?? '',
      medico_tratante: lev.medico_tratante ?? '', hospital_referencia: lev.hospital_referencia ?? '',
      fecha_evento_reciente: lev.fecha_evento_reciente ?? '', estado_conciencia: lev.estado_conciencia ?? '',
      orientacion: lev.orientacion, comunicacion: lev.comunicacion ?? '',
      movilidad: lev.movilidad ?? '', riesgo_caida: lev.riesgo_caida ?? '',
      tiene_dolor: lev.tiene_dolor, escala_dolor: lev.escala_dolor ?? 0,
      ubicacion_dolor: lev.ubicacion_dolor ?? '', tiene_heridas: lev.tiene_heridas,
      descripcion_heridas: lev.descripcion_heridas ?? '', usa_oxigeno: lev.usa_oxigeno,
      litros_oxigeno: lev.litros_oxigeno ?? '', dispositivo_oxigeno: lev.dispositivo_oxigeno ?? '',
      usa_sonda: lev.usa_sonda, tipo_sonda: lev.tipo_sonda ?? '',
      usa_cateter: lev.usa_cateter, tipo_cateter: lev.tipo_cateter ?? '',
      usa_panal: lev.usa_panal, alimentacion: lev.alimentacion ?? '',
      evacuacion: lev.evacuacion ?? '', obs_clinicas: lev.obs_clinicas ?? '',
      signos_vitales: lev.signos_vitales ?? {},
      alergias: lev.alergias ?? '', alergias_medicamentos: lev.alergias_medicamentos ?? '',
      reacciones_previas: lev.reacciones_previas ?? '',
      medicamentos_suspendidos: lev.medicamentos_suspendidos ?? '',
      obs_farmacologicas: lev.obs_farmacologicas ?? '',
      actividades_enfermeria: lev.actividades_enfermeria, obs_actividades: lev.obs_actividades ?? '',
      entorno: lev.entorno ?? {},
      fecha_inicio_estimada: lev.fecha_inicio_estimada ?? '',
      fecha_termino_estimada: lev.fecha_termino_estimada ?? '',
      tipo_turno: lev.tipo_turno ?? '', horario_requerido: lev.horario_requerido ?? '',
      frecuencia_servicio: lev.frecuencia_servicio ?? '',
      num_personas_requeridas: lev.num_personas_requeridas,
      nivel_personal: lev.nivel_personal ?? '', requiere_supervision: lev.requiere_supervision,
      prioridad: lev.prioridad, riesgo_sugerido: lev.riesgo_sugerido,
      riesgo_final: lev.riesgo_final, riesgo_modificado_manual: lev.riesgo_modificado_manual,
      costo_estimado: lev.costo_estimado ?? undefined, costo_autorizado: lev.costo_autorizado ?? undefined,
      forma_pago: lev.forma_pago ?? '', responsable_pago: lev.responsable_pago ?? '',
      material_incluido: lev.material_incluido ?? '', material_no_incluido: lev.material_no_incluido ?? '',
      obs_administrativas: lev.obs_administrativas ?? '', consentimiento: lev.consentimiento ?? {},
      estado: lev.estado,
    } as LevantamientoPayload
  }

  return {
    paciente_nombre: '', paciente_apellido: '', paciente_fecha_nacimiento: '',
    paciente_sexo: '', paciente_telefono: '', paciente_domicilio: '', paciente_referencias: '',
    paciente_ciudad: '', paciente_estado_geo: '', paciente_cp: '', paciente_obs_ubicacion: '',
    responsable_nombre: '', responsable_parentesco: '', responsable_tel_principal: '',
    responsable_tel_alternativo: '', responsable_email: '', responsable_es_pagador: false,
    responsable_obs: '',
    fecha_solicitud: new Date().toISOString(), medio_contacto: '', persona_solicita: '',
    relacion_solicitante: '', motivo_general: '', urgencia_percibida: 'media',
    tipos_servicio: [], descripcion_necesidad: '', expectativa_familia: '', obs_servicio: '',
    diagnostico_principal: '', diagnosticos_secundarios: '', medico_tratante: '',
    hospital_referencia: '', fecha_evento_reciente: '', estado_conciencia: '',
    orientacion: [], comunicacion: '', movilidad: '', riesgo_caida: '',
    tiene_dolor: false, escala_dolor: 0, ubicacion_dolor: '', tiene_heridas: false,
    descripcion_heridas: '', usa_oxigeno: false, litros_oxigeno: '', dispositivo_oxigeno: '',
    usa_sonda: false, tipo_sonda: '', usa_cateter: false, tipo_cateter: '',
    usa_panal: false, alimentacion: '', evacuacion: '', obs_clinicas: '',
    signos_vitales: {}, alergias: '', alergias_medicamentos: '', reacciones_previas: '',
    medicamentos_suspendidos: '', obs_farmacologicas: '',
    actividades_enfermeria: [], obs_actividades: '',
    entorno: {},
    fecha_inicio_estimada: '', fecha_termino_estimada: '', tipo_turno: '', horario_requerido: '',
    frecuencia_servicio: '', num_personas_requeridas: 1, nivel_personal: '',
    requiere_supervision: false, prioridad: 'media',
    riesgo_sugerido: 'bajo', riesgo_final: 'bajo', riesgo_modificado_manual: false,
    costo_estimado: undefined, costo_autorizado: undefined, forma_pago: '', responsable_pago: '',
    material_incluido: '', material_no_incluido: '', obs_administrativas: '',
    consentimiento: {}, estado: 'borrador',
  } as LevantamientoPayload
}

function medVacio(): Omit<LevantamientoMedicamento, 'id' | 'levantamiento_id'> {
  return { nombre: '', dosis: '', frecuencia: '', via: '', horario: '', indicado_por: '', observaciones: '' }
}
function matVacio(): Omit<LevantamientoMaterial, 'id' | 'levantamiento_id'> {
  return { nombre: '', cantidad: '', proporciona: 'pendiente', observaciones: '' }
}

// ── Cálculo de riesgo ─────────────────────────────────────────
function calcularRiesgo(d: LevantamientoPayload): RiesgoNivel {
  const altos: string[] = []
  const medios: string[] = []

  if (['inconsciente', 'desorientado'].includes(d.estado_conciencia ?? '')) altos.push('conciencia')
  if (d.riesgo_caida === 'alto') altos.push('caida_alto')
  if (d.movilidad === 'postrado_cama') altos.push('postrado')
  if (Number(d.escala_dolor) >= 8) altos.push('dolor_severo')

  if (d.usa_oxigeno) medios.push('oxigeno')
  if (d.usa_sonda) medios.push('sonda')
  if (d.usa_cateter) medios.push('cateter')
  if (d.tiene_heridas) medios.push('heridas')
  if (d.riesgo_caida === 'medio') medios.push('caida_medio')
  if ((d.tipos_servicio ?? []).some(s => ['vigilancia_nocturna', 'servicio_24h'].includes(s))) medios.push('vigilancia')
  if (Number(d.escala_dolor) >= 5) medios.push('dolor_moderado')
  if (['silla_ruedas', 'camina_con_apoyo'].includes(d.movilidad ?? '')) medios.push('movilidad_red')
  if (d.estado_conciencia === 'somnoliento') medios.push('somnoliento')

  if (altos.length >= 1) return 'alto'
  if (medios.length >= 3) return 'alto'
  if (medios.length >= 1) return 'medio'
  return 'bajo'
}

// ── Badges ────────────────────────────────────────────────────
function RiesgoBadge({ riesgo }: { riesgo: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    bajo:  { bg: '#DCFCE7', text: '#166534', label: '● Bajo' },
    medio: { bg: '#FEF9C3', text: '#854D0E', label: '● Medio' },
    alto:  { bg: '#FEE2E2', text: '#991B1B', label: '● Alto' },
  }
  const s = map[riesgo] ?? map.bajo
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

function PrioridadBadge({ prioridad }: { prioridad: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    baja:    { bg: '#F3F4F6', text: '#374151', label: 'Baja' },
    media:   { bg: '#EFF6FF', text: '#1D4ED8', label: 'Media' },
    alta:    { bg: '#FFF7ED', text: '#C2410C', label: 'Alta' },
    urgente: { bg: '#FEE2E2', text: '#991B1B', label: '🚨 Urgente' },
  }
  const s = map[prioridad] ?? map.media
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ── Tipos de servicio ─────────────────────────────────────────
const TIPOS_SERVICIO = [
  'Cuidado general', 'Cuidado de adulto mayor', 'Cuidado postoperatorio', 'Cuidado paliativo',
  'Acompañamiento hospitalario', 'Acompañamiento domiciliario', 'Aplicación de medicamentos',
  'Curaciones', 'Manejo de heridas', 'Baño de paciente', 'Movilización', 'Apoyo en alimentación',
  'Cambio de pañal', 'Manejo de sonda', 'Manejo de oxígeno', 'Vigilancia nocturna',
  'Servicio por horas', 'Servicio por turno', 'Servicio 24 horas', 'Otro',
]

const ACTIVIDADES = [
  'Toma de signos vitales', 'Administración de medicamentos', 'Curaciones', 'Manejo de heridas',
  'Baño en cama', 'Baño asistido', 'Cambio de ropa', 'Cambio de pañal', 'Movilización',
  'Cambios de posición', 'Prevención de úlceras por presión', 'Apoyo en alimentación',
  'Registro de líquidos', 'Apoyo emocional', 'Vigilancia nocturna', 'Reporte a familiar',
  'Reporte a médico', 'Limpieza del área del paciente', 'Manejo de oxígeno',
  'Manejo de sonda', 'Manejo de catéter', 'Acompañamiento hospitalario', 'Otro',
]

const MATERIALES_SUGERIDOS = [
  'Guantes', 'Cubrebocas', 'Gasas', 'Solución fisiológica', 'Antiséptico', 'Jeringas',
  'Agujas', 'Apósitos', 'Vendas', 'Tela adhesiva', 'Pañales', 'Toallas húmedas',
  'Campos', 'Sondas', 'Bolsas recolectoras', 'Oxígeno', 'Baumanómetro', 'Oxímetro',
  'Glucómetro', 'Termómetro', 'Cama hospitalaria', 'Barandales', 'Colchón antillagas',
  'Silla de ruedas', 'Andadera', 'Otro',
]

// ── Pasos del wizard ──────────────────────────────────────────
const PASOS = [
  { label: 'Paciente', short: '1' },
  { label: 'Contacto', short: '2' },
  { label: 'Solicitud', short: '3' },
  { label: 'Clínico', short: '4' },
  { label: 'Signos/Med.', short: '5' },
  { label: 'Actividades', short: '6' },
  { label: 'Materiales', short: '7' },
  { label: 'Entorno', short: '8' },
  { label: 'Plan', short: '9' },
  { label: 'Resumen', short: '✓' },
]

// ── Componente principal ──────────────────────────────────────
interface Props {
  levantamiento?: LevantamientoPaciente
}

export function LevantamientoWizard({ levantamiento }: Props) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<LevantamientoPayload>(() => estadoInicial(levantamiento))
  const [medicamentos, setMedicamentos] = useState<Omit<LevantamientoMedicamento, 'id' | 'levantamiento_id'>[]>(
    () => levantamiento?.medicamentos?.map(m => ({
      nombre: m.nombre, dosis: m.dosis, frecuencia: m.frecuencia, via: m.via,
      horario: m.horario, indicado_por: m.indicado_por, observaciones: m.observaciones,
    })) ?? []
  )
  const [materiales, setMateriales] = useState<Omit<LevantamientoMaterial, 'id' | 'levantamiento_id'>[]>(
    () => levantamiento?.materiales?.map(m => ({
      nombre: m.nombre, cantidad: m.cantidad, proporciona: m.proporciona,
      costo_estimado: m.costo_estimado ?? undefined, observaciones: m.observaciones,
    })) ?? []
  )
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [riesgoManual, setRiesgoManual] = useState(levantamiento?.riesgo_modificado_manual ?? false)

  const riesgoSugerido = calcularRiesgo(data)

  const upd = useCallback(<K extends keyof LevantamientoPayload>(key: K, value: LevantamientoPayload[K]) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [])

  function toggleArray(key: 'tipos_servicio' | 'actividades_enfermeria' | 'orientacion', value: string) {
    setData(prev => {
      const arr = (prev[key] as string[]) ?? []
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }

  function toggleEntorno(key: string, value: boolean | string) {
    setData(prev => ({ ...prev, entorno: { ...prev.entorno, [key]: value } }))
  }

  function toggleConsentimiento(key: string, value: boolean | string) {
    setData(prev => ({ ...prev, consentimiento: { ...prev.consentimiento, [key]: value } }))
  }

  function actualizarSigno(key: string, value: string) {
    setData(prev => ({ ...prev, signos_vitales: { ...prev.signos_vitales, [key]: value } }))
  }

  function guardar(estadoTarget: LevantamientoPaciente['estado']) {
    setError(null)
    const payload: LevantamientoPayload = {
      ...data,
      riesgo_sugerido: riesgoSugerido,
      riesgo_final: riesgoManual ? data.riesgo_final : riesgoSugerido,
      riesgo_modificado_manual: riesgoManual,
      estado: estadoTarget,
    }

    startTransition(async () => {
      try {
        if (levantamiento) {
          const result = await actualizarLevantamiento(levantamiento.id, payload, medicamentos, materiales)
          if (result.error) { setError(result.error); return }
          window.location.href = `/levantamientos/${levantamiento.id}?ok=updated`
        } else {
          const result = await crearLevantamiento(payload, medicamentos, materiales)
          if (result.error) { setError(result.error); return }
          window.location.href = `/levantamientos/${result.id}?ok=created`
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error inesperado')
      }
    })
  }

  const pacienteNombre = [data.paciente_nombre, data.paciente_apellido].filter(Boolean).join(' ') || 'Nuevo paciente'

  // ── Barra de progreso ───────────────────────────────────────
  const ProgressBar = () => (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PASOS.map((p, i) => (
          <button key={i} onClick={() => setStep(i)}
            className="flex flex-col items-center gap-1 flex-shrink-0 group" type="button">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < step ? 'bg-[#2AABBF] text-white' : i === step ? 'bg-[#1B2B4B] text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
            }`}>
              {i < step ? '✓' : p.short}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-[#1B2B4B] font-semibold' : 'text-gray-400'}`}>
              {p.label}
            </span>
          </button>
        ))}
        <div className="flex-1 h-0.5 bg-gray-100 relative mx-2 hidden sm:block">
          <div className="absolute inset-y-0 left-0 bg-[#2AABBF] transition-all"
            style={{ width: `${(step / (PASOS.length - 1)) * 100}%` }} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">Paso {step + 1} de {PASOS.length} — {PASOS[step].label}</p>
        <div className="flex items-center gap-2">
          <RiesgoBadge riesgo={riesgoManual ? data.riesgo_final : riesgoSugerido} />
          <PrioridadBadge prioridad={data.prioridad} />
        </div>
      </div>
    </div>
  )

  // ── Botones de navegación ───────────────────────────────────
  const NavButtons = () => (
    <div className="flex items-center justify-between gap-3 pt-2">
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
            <ChevronLeft size={15} /> Anterior
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => guardar('borrador')} disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
          <Save size={15} /> Borrador
        </button>
        {step < PASOS.length - 1 ? (
          <button type="button" onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: '#2AABBF' }}>
            Siguiente <ChevronRight size={15} />
          </button>
        ) : (
          <button type="button" onClick={() => guardar('pendiente_revision')} disabled={isPending}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: isPending ? '#94a3b8' : '#1B2B4B' }}>
            <CheckCircle size={15} />
            {isPending ? 'Guardando...' : 'Enviar a revisión'}
          </button>
        )}
      </div>
    </div>
  )

  // ── PASO 1: Datos del Paciente ──────────────────────────────
  const Paso1 = () => (
    <div className={SECTION}>
      <h2 className={SECTION_TITLE}>Datos del Paciente</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={LABEL}>Nombre *</label>
          <input className={INPUT} value={data.paciente_nombre}
            onChange={e => upd('paciente_nombre', e.target.value)} placeholder="María" /></div>
        <div><label className={LABEL}>Apellido *</label>
          <input className={INPUT} value={data.paciente_apellido}
            onChange={e => upd('paciente_apellido', e.target.value)} placeholder="González" /></div>
        <div><label className={LABEL}>Fecha de nacimiento</label>
          <input type="date" className={INPUT} value={data.paciente_fecha_nacimiento ?? ''}
            onChange={e => upd('paciente_fecha_nacimiento', e.target.value)} /></div>
        <div><label className={LABEL}>Sexo</label>
          <select className={SELECT} value={data.paciente_sexo ?? ''}
            onChange={e => upd('paciente_sexo', e.target.value)}>
            <option value="">Seleccionar</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select></div>
        <div><label className={LABEL}>Teléfono del paciente</label>
          <input className={INPUT} value={data.paciente_telefono ?? ''}
            onChange={e => upd('paciente_telefono', e.target.value)} placeholder="+52 55 0000 0000" /></div>
      </div>
      <div><label className={LABEL}>Domicilio completo *</label>
        <input className={INPUT} value={data.paciente_domicilio ?? ''}
          onChange={e => upd('paciente_domicilio', e.target.value)} placeholder="Calle, número, colonia" /></div>
      <div><label className={LABEL}>Referencias del domicilio</label>
        <input className={INPUT} value={data.paciente_referencias ?? ''}
          onChange={e => upd('paciente_referencias', e.target.value)} placeholder="Entre calles, color de casa..." /></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className={LABEL}>Ciudad</label>
          <input className={INPUT} value={data.paciente_ciudad ?? ''}
            onChange={e => upd('paciente_ciudad', e.target.value)} /></div>
        <div><label className={LABEL}>Estado</label>
          <input className={INPUT} value={data.paciente_estado_geo ?? ''}
            onChange={e => upd('paciente_estado_geo', e.target.value)} /></div>
        <div><label className={LABEL}>C.P.</label>
          <input className={INPUT} value={data.paciente_cp ?? ''}
            onChange={e => upd('paciente_cp', e.target.value)} /></div>
      </div>
      <div><label className={LABEL}>Observaciones de ubicación</label>
        <textarea className={INPUT} rows={2} value={data.paciente_obs_ubicacion ?? ''}
          onChange={e => upd('paciente_obs_ubicacion', e.target.value)}
          placeholder="Instrucciones especiales para llegar..." /></div>
    </div>
  )

  // ── PASO 2: Contacto y Responsable ─────────────────────────
  const Paso2 = () => (
    <div className={SECTION}>
      <h2 className={SECTION_TITLE}>Responsable / Contacto Familiar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={LABEL}>Nombre completo *</label>
          <input className={INPUT} value={data.responsable_nombre ?? ''}
            onChange={e => upd('responsable_nombre', e.target.value)} /></div>
        <div><label className={LABEL}>Parentesco</label>
          <input className={INPUT} value={data.responsable_parentesco ?? ''}
            onChange={e => upd('responsable_parentesco', e.target.value)} placeholder="Hijo, Cónyuge, Hermana..." /></div>
        <div><label className={LABEL}>Teléfono principal *</label>
          <input className={INPUT} value={data.responsable_tel_principal ?? ''}
            onChange={e => upd('responsable_tel_principal', e.target.value)} /></div>
        <div><label className={LABEL}>Teléfono alternativo</label>
          <input className={INPUT} value={data.responsable_tel_alternativo ?? ''}
            onChange={e => upd('responsable_tel_alternativo', e.target.value)} /></div>
        <div><label className={LABEL}>Correo electrónico</label>
          <input type="email" className={INPUT} value={data.responsable_email ?? ''}
            onChange={e => upd('responsable_email', e.target.value)} /></div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
        <input type="checkbox" id="resp_pago" className="w-4 h-4 accent-[#2AABBF]"
          checked={data.responsable_es_pagador}
          onChange={e => upd('responsable_es_pagador', e.target.checked)} />
        <label htmlFor="resp_pago" className="text-sm text-gray-700 font-medium cursor-pointer">
          Este responsable es quien autoriza y cubre el pago del servicio
        </label>
      </div>
      <div><label className={LABEL}>Observaciones del contacto</label>
        <textarea className={INPUT} rows={2} value={data.responsable_obs ?? ''}
          onChange={e => upd('responsable_obs', e.target.value)} /></div>
    </div>
  )

  // ── PASO 3: Solicitud y Servicio ───────────────────────────
  const Paso3 = () => (
    <div className="space-y-5">
      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>Origen de la Solicitud</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={LABEL}>Fecha y hora de solicitud</label>
            <input type="datetime-local" className={INPUT}
              value={data.fecha_solicitud ? data.fecha_solicitud.slice(0, 16) : ''}
              onChange={e => upd('fecha_solicitud', new Date(e.target.value).toISOString())} /></div>
          <div><label className={LABEL}>Medio de contacto</label>
            <select className={SELECT} value={data.medio_contacto ?? ''}
              onChange={e => upd('medio_contacto', e.target.value)}>
              <option value="">Seleccionar</option>
              {['WhatsApp','Llamada','Médico','Hospital','Recomendación','Red social','Página web','Otro'].map(o => (
                <option key={o} value={o.toLowerCase()}>{o}</option>
              ))}
            </select></div>
          <div><label className={LABEL}>Persona que solicita</label>
            <input className={INPUT} value={data.persona_solicita ?? ''}
              onChange={e => upd('persona_solicita', e.target.value)} /></div>
          <div><label className={LABEL}>Relación con el paciente</label>
            <input className={INPUT} value={data.relacion_solicitante ?? ''}
              onChange={e => upd('relacion_solicitante', e.target.value)} placeholder="Hijo, médico, trabajadora social..." /></div>
        </div>
        <div><label className={LABEL}>Motivo general de la solicitud</label>
          <textarea className={INPUT} rows={2} value={data.motivo_general ?? ''}
            onChange={e => upd('motivo_general', e.target.value)} /></div>
        <div><label className={LABEL}>Urgencia percibida</label>
          <div className="grid grid-cols-4 gap-2">
            {(['baja', 'media', 'alta', 'urgente'] as const).map(u => (
              <button key={u} type="button" onClick={() => upd('urgencia_percibida', u)}
                className={`py-2 rounded-lg text-xs font-semibold border transition-all capitalize ${
                  data.urgencia_percibida === u
                    ? 'border-[#2AABBF] bg-[#EBF8FB] text-[#1B2B4B]'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>{u}</button>
            ))}
          </div></div>
      </div>

      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>Tipo de Servicio Requerido *</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TIPOS_SERVICIO.map(t => (
            <label key={t} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
              (data.tipos_servicio ?? []).includes(t)
                ? 'border-[#2AABBF] bg-[#EBF8FB] text-[#1B2B4B] font-medium'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
              <input type="checkbox" className="sr-only" checked={(data.tipos_servicio ?? []).includes(t)}
                onChange={() => toggleArray('tipos_servicio', t)} />
              <span className="w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: (data.tipos_servicio ?? []).includes(t) ? '#2AABBF' : '#D1D5DB',
                  backgroundColor: (data.tipos_servicio ?? []).includes(t) ? '#2AABBF' : 'transparent' }}>
                {(data.tipos_servicio ?? []).includes(t) && <span className="text-white text-xs">✓</span>}
              </span>
              {t}
            </label>
          ))}
        </div>
        <div><label className={LABEL}>Descripción clara de lo que necesita el paciente</label>
          <textarea className={INPUT} rows={3} value={data.descripcion_necesidad ?? ''}
            onChange={e => upd('descripcion_necesidad', e.target.value)} /></div>
        <div><label className={LABEL}>Expectativa de la familia</label>
          <textarea className={INPUT} rows={2} value={data.expectativa_familia ?? ''}
            onChange={e => upd('expectativa_familia', e.target.value)} /></div>
      </div>
    </div>
  )

  // ── PASO 4: Valoración Clínica ──────────────────────────────
  const Paso4 = () => (
    <div className="space-y-5">
      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>Diagnóstico y Antecedentes</h2>
        <div><label className={LABEL}>Diagnóstico principal</label>
          <textarea className={INPUT} rows={2} value={data.diagnostico_principal ?? ''}
            onChange={e => upd('diagnostico_principal', e.target.value)} /></div>
        <div><label className={LABEL}>Diagnósticos secundarios</label>
          <textarea className={INPUT} rows={2} value={data.diagnosticos_secundarios ?? ''}
            onChange={e => upd('diagnosticos_secundarios', e.target.value)} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={LABEL}>Médico tratante</label>
            <input className={INPUT} value={data.medico_tratante ?? ''}
              onChange={e => upd('medico_tratante', e.target.value)} /></div>
          <div><label className={LABEL}>Hospital / Institución de referencia</label>
            <input className={INPUT} value={data.hospital_referencia ?? ''}
              onChange={e => upd('hospital_referencia', e.target.value)} /></div>
          <div><label className={LABEL}>Fecha de cirugía o evento reciente</label>
            <input type="date" className={INPUT} value={data.fecha_evento_reciente ?? ''}
              onChange={e => upd('fecha_evento_reciente', e.target.value)} /></div>
        </div>
      </div>

      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>Estado Clínico</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={LABEL}>Estado de conciencia</label>
            <select className={SELECT} value={data.estado_conciencia ?? ''}
              onChange={e => upd('estado_conciencia', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="alerta">Alerta</option>
              <option value="somnoliento">Somnoliento</option>
              <option value="desorientado">Desorientado</option>
              <option value="inconsciente">Inconsciente</option>
              <option value="intermitente">Intermitente</option>
            </select></div>
          <div><label className={LABEL}>Movilidad</label>
            <select className={SELECT} value={data.movilidad ?? ''}
              onChange={e => upd('movilidad', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="independiente">Independiente</option>
              <option value="camina_con_apoyo">Camina con apoyo</option>
              <option value="silla_ruedas">Silla de ruedas</option>
              <option value="postrado_cama">Postrado en cama</option>
              <option value="movilizacion_completa">Requiere movilización completa</option>
            </select></div>
          <div><label className={LABEL}>Comunicación</label>
            <select className={SELECT} value={data.comunicacion ?? ''}
              onChange={e => upd('comunicacion', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="habla_normalmente">Habla normalmente</option>
              <option value="dificultad_hablar">Dificultad para hablar</option>
              <option value="no_verbal">No verbal</option>
              <option value="usa_apoyo">Usa apoyo comunicativo</option>
            </select></div>
          <div><label className={LABEL}>Riesgo de caída</label>
            <select className={SELECT} value={data.riesgo_caida ?? ''}
              onChange={e => upd('riesgo_caida', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="bajo">Bajo</option>
              <option value="medio">Medio</option>
              <option value="alto">Alto</option>
            </select></div>
          <div><label className={LABEL}>Alimentación</label>
            <select className={SELECT} value={data.alimentacion ?? ''}
              onChange={e => upd('alimentacion', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="come_solo">Come solo</option>
              <option value="requiere_apoyo">Requiere apoyo</option>
              <option value="sonda">Sonda</option>
              <option value="dieta_especial">Dieta especial</option>
            </select></div>
          <div><label className={LABEL}>Evacuación / Orina</label>
            <select className={SELECT} value={data.evacuacion ?? ''}
              onChange={e => upd('evacuacion', e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="normal">Normal</option>
              <option value="dificultad">Dificultad</option>
              <option value="incontinencia">Incontinencia</option>
              <option value="sonda">Sonda</option>
            </select></div>
        </div>

        <div><label className={LABEL}>Orientación</label>
          <div className="flex flex-wrap gap-2">
            {['Persona', 'Tiempo', 'Espacio'].map(o => (
              <label key={o} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-all ${
                data.orientacion.includes(o) ? 'border-[#2AABBF] bg-[#EBF8FB] text-[#1B2B4B] font-medium' : 'border-gray-200 text-gray-600'
              }`}>
                <input type="checkbox" className="sr-only" checked={data.orientacion.includes(o)}
                  onChange={() => toggleArray('orientacion', o)} />
                {o}
              </label>
            ))}
          </div></div>

        {/* Dispositivos médicos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { key: 'usa_oxigeno', label: 'Oxígeno', detail: ['litros_oxigeno', 'dispositivo_oxigeno'], placeholders: ['L/min', 'Tipo de dispositivo'] },
            { key: 'usa_sonda', label: 'Sonda', detail: ['tipo_sonda'], placeholders: ['Tipo de sonda'] },
            { key: 'usa_cateter', label: 'Catéter', detail: ['tipo_cateter'], placeholders: ['Tipo'] },
            { key: 'usa_panal', label: 'Pañal', detail: [], placeholders: [] },
            { key: 'tiene_heridas', label: 'Heridas', detail: ['descripcion_heridas'], placeholders: ['Descripción y ubicación'] },
          ].map(({ key, label }) => {
            const val = !!(data as Record<string, unknown>)[key]
            return (
              <div key={key} className={`p-3 rounded-lg border cursor-pointer transition-all ${
                val ? 'border-[#2AABBF] bg-[#EBF8FB]' : 'border-gray-200'
              }`} onClick={() => setData(prev => ({ ...prev, [key]: !val }))}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    val ? 'border-[#2AABBF] bg-[#2AABBF]' : 'border-gray-300'
                  }`}>
                    {val && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              </div>
            )
          })}
        </div>

        {data.usa_oxigeno && (
          <div className="grid grid-cols-2 gap-3 bg-blue-50 rounded-lg p-3">
            <div><label className={LABEL}>Litros por minuto</label>
              <input className={INPUT} value={data.litros_oxigeno ?? ''}
                onChange={e => upd('litros_oxigeno', e.target.value)} placeholder="2 L/min" /></div>
            <div><label className={LABEL}>Dispositivo</label>
              <input className={INPUT} value={data.dispositivo_oxigeno ?? ''}
                onChange={e => upd('dispositivo_oxigeno', e.target.value)} placeholder="Puntas nasales, mascarilla..." /></div>
          </div>
        )}
        {data.usa_sonda && (
          <div className="bg-blue-50 rounded-lg p-3">
            <label className={LABEL}>Tipo de sonda</label>
            <input className={INPUT} value={data.tipo_sonda ?? ''}
              onChange={e => upd('tipo_sonda', e.target.value)} placeholder="Foley, nasogástrica..." />
          </div>
        )}
        {data.usa_cateter && (
          <div className="bg-blue-50 rounded-lg p-3">
            <label className={LABEL}>Tipo de catéter</label>
            <input className={INPUT} value={data.tipo_cateter ?? ''}
              onChange={e => upd('tipo_cateter', e.target.value)} />
          </div>
        )}
        {data.tiene_heridas && (
          <div className="bg-amber-50 rounded-lg p-3">
            <label className={LABEL}>Descripción y ubicación de heridas</label>
            <textarea className={INPUT} rows={2} value={data.descripcion_heridas ?? ''}
              onChange={e => upd('descripcion_heridas', e.target.value)} />
          </div>
        )}

        {/* Dolor */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="tiene_dolor" className="w-4 h-4 accent-[#2AABBF]"
              checked={data.tiene_dolor} onChange={e => upd('tiene_dolor', e.target.checked)} />
            <label htmlFor="tiene_dolor" className="text-sm font-medium text-gray-700 cursor-pointer">El paciente refiere dolor</label>
          </div>
          {data.tiene_dolor && (
            <div className="bg-amber-50 rounded-lg p-3 space-y-3">
              <div>
                <label className={LABEL}>Escala de dolor (0-10)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={10} value={data.escala_dolor ?? 0}
                    onChange={e => upd('escala_dolor', Number(e.target.value))}
                    className="flex-1 accent-[#2AABBF]" />
                  <span className="text-lg font-bold text-amber-600 w-8 text-center">{data.escala_dolor}</span>
                </div>
              </div>
              <div><label className={LABEL}>Ubicación del dolor</label>
                <input className={INPUT} value={data.ubicacion_dolor ?? ''}
                  onChange={e => upd('ubicacion_dolor', e.target.value)} placeholder="Cabeza, abdomen, pierna..." /></div>
            </div>
          )}
        </div>

        <div><label className={LABEL}>Observaciones clínicas generales</label>
          <textarea className={INPUT} rows={3} value={data.obs_clinicas ?? ''}
            onChange={e => upd('obs_clinicas', e.target.value)} /></div>
      </div>
    </div>
  )

  // ── PASO 5: Signos Vitales + Medicamentos ──────────────────
  const Paso5 = () => (
    <div className="space-y-5">
      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>Signos Vitales Iniciales</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { key: 'presion_arterial', label: 'Presión arterial', ph: '120/80' },
            { key: 'frecuencia_cardiaca', label: 'Frec. cardiaca (bpm)', ph: '72' },
            { key: 'frecuencia_respiratoria', label: 'Frec. respiratoria', ph: '16' },
            { key: 'temperatura', label: 'Temperatura (°C)', ph: '36.5' },
            { key: 'saturacion_oxigeno', label: 'SpO2 (%)', ph: '98' },
            { key: 'glucosa_capilar', label: 'Glucosa (mg/dL)', ph: '90' },
            { key: 'peso', label: 'Peso aprox. (kg)', ph: '70' },
            { key: 'talla', label: 'Talla aprox. (m)', ph: '1.65' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className={LABEL}>{label}</label>
              <input className={INPUT} placeholder={ph}
                value={(data.signos_vitales as Record<string, string>)[key] ?? ''}
                onChange={e => actualizarSigno(key, e.target.value)} />
            </div>
          ))}
        </div>
        <div><label className={LABEL}>Fecha y hora de toma</label>
          <input type="datetime-local" className={INPUT}
            value={(data.signos_vitales as Record<string, string>).fecha_hora ?? ''}
            onChange={e => actualizarSigno('fecha_hora', e.target.value)} /></div>
      </div>

      <div className={SECTION}>
        <h2 className={SECTION_TITLE}>Medicamentos Actuales</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Medicamento *', 'Dosis', 'Frecuencia', 'Vía', 'Horario', 'Indicado por', ''].map(h => (
                  <th key={h} className="text-left px-2 py-2 text-xs font-medium text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicamentos.map((m, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-1 py-1.5"><input className={INPUT} value={m.nombre}
                    onChange={e => setMedicamentos(arr => arr.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                    placeholder="Nombre" /></td>
                  <td className="px-1 py-1.5"><input className={INPUT} value={m.dosis}
                    onChange={e => setMedicamentos(arr => arr.map((x, j) => j === i ? { ...x, dosis: e.target.value } : x))}
                    placeholder="50mg" /></td>
                  <td className="px-1 py-1.5"><input className={INPUT} value={m.frecuencia}
                    onChange={e => setMedicamentos(arr => arr.map((x, j) => j === i ? { ...x, frecuencia: e.target.value } : x))}
                    placeholder="Cada 8h" /></td>
                  <td className="px-1 py-1.5">
                    <select className={SELECT} value={m.via}
                      onChange={e => setMedicamentos(arr => arr.map((x, j) => j === i ? { ...x, via: e.target.value } : x))}>
                      <option value="">-</option>
                      <option value="oral">Oral</option>
                      <option value="iv">IV</option>
                      <option value="im">IM</option>
                      <option value="sc">SC</option>
                      <option value="topica">Tópica</option>
                      <option value="inhalatoria">Inhalatoria</option>
                      <option value="otra">Otra</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5"><input className={INPUT} value={m.horario}
                    onChange={e => setMedicamentos(arr => arr.map((x, j) => j === i ? { ...x, horario: e.target.value } : x))}
                    placeholder="08:00, 16:00" /></td>
                  <td className="px-1 py-1.5"><input className={INPUT} value={m.indicado_por}
                    onChange={e => setMedicamentos(arr => arr.map((x, j) => j === i ? { ...x, indicado_por: e.target.value } : x))}
                    placeholder="Dr. López" /></td>
                  <td className="px-1 py-1.5">
                    <button type="button" onClick={() => setMedicamentos(arr => arr.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setMedicamentos(arr => [...arr, medVacio()])}
          className="flex items-center gap-1.5 text-sm font-medium text-[#2AABBF] hover:text-[#1B2B4B] transition-colors mt-2">
          <Plus size={15} /> Agregar medicamento
        </button>

        <div className="pt-4 border-t border-gray-100 space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alergias y advertencias</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={LABEL}>Alergias conocidas</label>
              <textarea className={INPUT} rows={2} value={data.alergias ?? ''}
                onChange={e => upd('alergias', e.target.value)} /></div>
            <div><label className={LABEL}>Alergias a medicamentos</label>
              <textarea className={INPUT} rows={2} value={data.alergias_medicamentos ?? ''}
                onChange={e => upd('alergias_medicamentos', e.target.value)} /></div>
            <div><label className={LABEL}>Reacciones previas</label>
              <input className={INPUT} value={data.reacciones_previas ?? ''}
                onChange={e => upd('reacciones_previas', e.target.value)} /></div>
            <div><label className={LABEL}>Medicamentos suspendidos</label>
              <input className={INPUT} value={data.medicamentos_suspendidos ?? ''}
                onChange={e => upd('medicamentos_suspendidos', e.target.value)} /></div>
          </div>
          <div><label className={LABEL}>Observaciones farmacológicas</label>
            <textarea className={INPUT} rows={2} value={data.obs_farmacologicas ?? ''}
              onChange={e => upd('obs_farmacologicas', e.target.value)} /></div>
        </div>
      </div>
    </div>
  )

  // ── PASO 6: Actividades de Enfermería ──────────────────────
  const Paso6 = () => (
    <div className={SECTION}>
      <h2 className={SECTION_TITLE}>Actividades de Enfermería Requeridas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ACTIVIDADES.map(a => (
          <label key={a} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
            data.actividades_enfermeria.includes(a)
              ? 'border-[#2AABBF] bg-[#EBF8FB] text-[#1B2B4B] font-medium'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}>
            <input type="checkbox" className="sr-only" checked={data.actividades_enfermeria.includes(a)}
              onChange={() => toggleArray('actividades_enfermeria', a)} />
            <span className="w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center"
              style={{ borderColor: data.actividades_enfermeria.includes(a) ? '#2AABBF' : '#D1D5DB',
                backgroundColor: data.actividades_enfermeria.includes(a) ? '#2AABBF' : 'transparent' }}>
              {data.actividades_enfermeria.includes(a) && <span className="text-white text-xs">✓</span>}
            </span>
            {a}
          </label>
        ))}
      </div>
      <div><label className={LABEL}>Observaciones especiales de actividades</label>
        <textarea className={INPUT} rows={3} value={data.obs_actividades ?? ''}
          onChange={e => upd('obs_actividades', e.target.value)} /></div>
    </div>
  )

  // ── PASO 7: Materiales y Equipo ────────────────────────────
  const Paso7 = () => (
    <div className={SECTION}>
      <h2 className={SECTION_TITLE}>Materiales, Insumos y Equipo Requerido</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Material / Equipo *', 'Cantidad', 'Proporciona', 'Costo est.', ''].map(h => (
                <th key={h} className="text-left px-2 py-2 text-xs font-medium text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materiales.map((m, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="px-1 py-1.5">
                  <input className={INPUT} list="materiales-list" value={m.nombre}
                    onChange={e => setMateriales(arr => arr.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))}
                    placeholder="Nombre del material" />
                </td>
                <td className="px-1 py-1.5"><input className={INPUT} value={m.cantidad}
                  onChange={e => setMateriales(arr => arr.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                  placeholder="1 caja" /></td>
                <td className="px-1 py-1.5">
                  <select className={SELECT} value={m.proporciona}
                    onChange={e => setMateriales(arr => arr.map((x, j) => j === i ? { ...x, proporciona: e.target.value } : x))}>
                    <option value="pendiente">Pendiente</option>
                    <option value="familia">Familia</option>
                    <option value="abastemed">Abastemed</option>
                    <option value="compra_aparte">Compra aparte</option>
                    <option value="renta">Renta</option>
                  </select>
                </td>
                <td className="px-1 py-1.5"><input type="number" className={INPUT} value={m.costo_estimado ?? ''}
                  onChange={e => setMateriales(arr => arr.map((x, j) => j === i ? { ...x, costo_estimado: Number(e.target.value) || undefined } : x))}
                  placeholder="0.00" /></td>
                <td className="px-1 py-1.5">
                  <button type="button" onClick={() => setMateriales(arr => arr.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="materiales-list">
          {MATERIALES_SUGERIDOS.map(m => <option key={m} value={m} />)}
        </datalist>
      </div>
      <button type="button" onClick={() => setMateriales(arr => [...arr, matVacio()])}
        className="flex items-center gap-1.5 text-sm font-medium text-[#2AABBF] hover:text-[#1B2B4B] transition-colors mt-2">
        <Plus size={15} /> Agregar material
      </button>
    </div>
  )

  // ── PASO 8: Entorno del Paciente ───────────────────────────
  const entorno = data.entorno as Record<string, boolean | string>

  const Paso8 = () => (
    <div className={SECTION}>
      <h2 className={SECTION_TITLE}>Evaluación del Entorno (Domicilio)</h2>
      <div><label className={LABEL}>Tipo de vivienda</label>
        <select className={SELECT} value={(entorno.tipo_vivienda as string) ?? ''}
          onChange={e => toggleEntorno('tipo_vivienda', e.target.value)}>
          <option value="">Seleccionar</option>
          <option value="casa">Casa</option>
          <option value="departamento">Departamento</option>
          <option value="cuarto">Cuarto</option>
          <option value="hospital">Hospital / Clínica</option>
          <option value="casa_reposo">Casa de reposo</option>
        </select></div>
      <div><label className={LABEL}>Condiciones generales de higiene</label>
        <select className={SELECT} value={(entorno.condiciones_higiene as string) ?? ''}
          onChange={e => toggleEntorno('condiciones_higiene', e.target.value)}>
          <option value="">Seleccionar</option>
          <option value="buenas">Buenas</option>
          <option value="regulares">Regulares</option>
          <option value="deficientes">Deficientes</option>
        </select></div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { key: 'acceso_dificil', label: 'Acceso difícil' },
          { key: 'hay_escaleras', label: 'Hay escaleras' },
          { key: 'hay_elevador', label: 'Hay elevador' },
          { key: 'espacio_suficiente', label: 'Espacio para equipo' },
          { key: 'bano_cercano', label: 'Baño cercano' },
          { key: 'buena_iluminacion', label: 'Buena iluminación' },
          { key: 'buena_ventilacion', label: 'Buena ventilación' },
          { key: 'riesgo_caidas_domicilio', label: 'Riesgo de caídas' },
          { key: 'hay_mascotas', label: 'Hay mascotas' },
          { key: 'familiar_presente', label: 'Familiar presente' },
        ].map(({ key, label }) => (
          <div key={key}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              entorno[key] ? 'border-[#2AABBF] bg-[#EBF8FB]' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => toggleEntorno(key, !entorno[key])}>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                entorno[key] ? 'border-[#2AABBF] bg-[#2AABBF]' : 'border-gray-300'
              }`}>
                {entorno[key] && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm text-gray-700">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div><label className={LABEL}>Observaciones del entorno</label>
        <textarea className={INPUT} rows={3}
          value={(entorno.obs_entorno as string) ?? ''}
          onChange={e => toggleEntorno('obs_entorno', e.target.value)} /></div>
    </div>
  )

  // ── PASO 9: Plan de Servicio ───────────────────────────────
  const Paso9 = () => {
    const cons = data.consentimiento as Record<string, boolean | string>
    return (
      <div className="space-y-5">
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Plan de Servicio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={LABEL}>Fecha estimada de inicio</label>
              <input type="date" className={INPUT} value={data.fecha_inicio_estimada ?? ''}
                onChange={e => upd('fecha_inicio_estimada', e.target.value)} /></div>
            <div><label className={LABEL}>Fecha estimada de término</label>
              <input type="date" className={INPUT} value={data.fecha_termino_estimada ?? ''}
                onChange={e => upd('fecha_termino_estimada', e.target.value)} /></div>
            <div><label className={LABEL}>Tipo de turno</label>
              <select className={SELECT} value={data.tipo_turno ?? ''}
                onChange={e => upd('tipo_turno', e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="nocturno">Nocturno</option>
                <option value="12h">12 horas</option>
                <option value="24h">24 horas</option>
                <option value="por_horas">Por horas</option>
                <option value="eventual">Eventual</option>
              </select></div>
            <div><label className={LABEL}>Horario requerido</label>
              <input className={INPUT} value={data.horario_requerido ?? ''}
                onChange={e => upd('horario_requerido', e.target.value)} placeholder="08:00 – 20:00" /></div>
            <div><label className={LABEL}>Frecuencia</label>
              <select className={SELECT} value={data.frecuencia_servicio ?? ''}
                onChange={e => upd('frecuencia_servicio', e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="unico">Único</option>
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="fines_semana">Fines de semana</option>
                <option value="personalizado">Personalizado</option>
              </select></div>
            <div><label className={LABEL}>Número de personas requeridas</label>
              <input type="number" min={1} max={10} className={INPUT} value={data.num_personas_requeridas}
                onChange={e => upd('num_personas_requeridas', Number(e.target.value))} /></div>
            <div><label className={LABEL}>Nivel de personal requerido</label>
              <select className={SELECT} value={data.nivel_personal ?? ''}
                onChange={e => upd('nivel_personal', e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="cuidador">Cuidador</option>
                <option value="auxiliar_enfermeria">Auxiliar de enfermería</option>
                <option value="enfermero_general">Enfermero general</option>
                <option value="enfermero_especializado">Enfermero especializado</option>
                <option value="jefe_enfermeria">Jefe de enfermería</option>
              </select></div>
            <div><label className={LABEL}>Prioridad</label>
              <div className="grid grid-cols-4 gap-1">
                {(['baja', 'media', 'alta', 'urgente'] as PrioridadNivel[]).map(p => (
                  <button key={p} type="button" onClick={() => upd('prioridad', p)}
                    className={`py-1.5 rounded text-xs font-semibold border transition-all capitalize ${
                      data.prioridad === p ? 'border-[#2AABBF] bg-[#EBF8FB] text-[#1B2B4B]' : 'border-gray-200 text-gray-500'
                    }`}>{p}</button>
                ))}
              </div></div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="supervision" className="w-4 h-4 accent-[#2AABBF]"
              checked={data.requiere_supervision}
              onChange={e => upd('requiere_supervision', e.target.checked)} />
            <label htmlFor="supervision" className="text-sm font-medium text-gray-700">Requiere supervisión del jefe de enfermería</label>
          </div>
        </div>

        {/* Riesgo */}
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Nivel de Riesgo</h2>
          <div className="p-4 rounded-lg bg-gray-50 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Riesgo sugerido por el sistema</p>
              <RiesgoBadge riesgo={riesgoSugerido} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Riesgo final</p>
              <RiesgoBadge riesgo={riesgoManual ? (data.riesgo_final as string) : riesgoSugerido} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input type="checkbox" id="riesgo_manual" className="w-4 h-4 accent-amber-500"
                checked={riesgoManual} onChange={e => setRiesgoManual(e.target.checked)} />
              <label htmlFor="riesgo_manual" className="text-sm font-medium text-gray-700">
                Ajustar riesgo manualmente
              </label>
            </div>
            {riesgoManual && (
              <div>
                {riesgoManual && data.riesgo_final < riesgoSugerido && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Estás bajando el riesgo por debajo del nivel sugerido. Asegúrate de que sea correcto.</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {(['bajo', 'medio', 'alto'] as RiesgoNivel[]).map(r => (
                    <button key={r} type="button" onClick={() => upd('riesgo_final', r)}
                      className={`py-2 rounded-lg text-sm font-semibold border transition-all capitalize ${
                        data.riesgo_final === r ? 'border-[#1B2B4B] bg-[#1B2B4B] text-white' : 'border-gray-200 text-gray-600'
                      }`}>{r}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Costos */}
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Costos y Pago</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={LABEL}>Costo estimado</label>
              <input type="number" className={INPUT} value={data.costo_estimado ?? ''}
                onChange={e => upd('costo_estimado', Number(e.target.value) || undefined)} placeholder="0.00" /></div>
            <div><label className={LABEL}>Costo autorizado</label>
              <input type="number" className={INPUT} value={data.costo_autorizado ?? ''}
                onChange={e => upd('costo_autorizado', Number(e.target.value) || undefined)} placeholder="0.00" /></div>
            <div><label className={LABEL}>Forma de pago</label>
              <select className={SELECT} value={data.forma_pago ?? ''}
                onChange={e => upd('forma_pago', e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="por_definir">Por definir</option>
              </select></div>
            <div><label className={LABEL}>Responsable de pago</label>
              <input className={INPUT} value={data.responsable_pago ?? ''}
                onChange={e => upd('responsable_pago', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={LABEL}>Material incluido en el costo</label>
              <textarea className={INPUT} rows={2} value={data.material_incluido ?? ''}
                onChange={e => upd('material_incluido', e.target.value)} /></div>
            <div><label className={LABEL}>Material no incluido</label>
              <textarea className={INPUT} rows={2} value={data.material_no_incluido ?? ''}
                onChange={e => upd('material_no_incluido', e.target.value)} /></div>
          </div>
          <div><label className={LABEL}>Observaciones administrativas</label>
            <textarea className={INPUT} rows={2} value={data.obs_administrativas ?? ''}
              onChange={e => upd('obs_administrativas', e.target.value)} /></div>
        </div>

        {/* Consentimiento */}
        <div className={SECTION}>
          <h2 className={SECTION_TITLE}>Consentimiento y Autorización</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={LABEL}>Nombre de quien autoriza</label>
              <input className={INPUT} value={(cons.autorizado_por as string) ?? ''}
                onChange={e => toggleConsentimiento('autorizado_por', e.target.value)} /></div>
            <div><label className={LABEL}>Relación con el paciente</label>
              <input className={INPUT} value={(cons.relacion_autoriza as string) ?? ''}
                onChange={e => toggleConsentimiento('relacion_autoriza', e.target.value)} /></div>
            <div><label className={LABEL}>Fecha y hora de autorización</label>
              <input type="datetime-local" className={INPUT} value={(cons.fecha_autorizacion as string) ?? ''}
                onChange={e => toggleConsentimiento('fecha_autorizacion', e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            {[
              { key: 'acepta_servicio', label: 'Acepta las condiciones del servicio' },
              { key: 'acepta_datos', label: 'Acepta el manejo de datos personales' },
              { key: 'acepta_evidencias', label: 'Acepta registro de evidencias clínicas' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#2AABBF]"
                  checked={(cons[key] as boolean) ?? false}
                  onChange={e => toggleConsentimiento(key, e.target.checked)} />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
          <div><label className={LABEL}>Observaciones de consentimiento</label>
            <textarea className={INPUT} rows={2} value={(cons.obs_consentimiento as string) ?? ''}
              onChange={e => toggleConsentimiento('obs_consentimiento', e.target.value)} /></div>
        </div>
      </div>
    )
  }

  // ── PASO 10: Resumen Final ─────────────────────────────────
  const Paso10 = () => {
    const riesgoEfectivo = riesgoManual ? data.riesgo_final : riesgoSugerido
    const faltantes: string[] = []
    if (!data.paciente_nombre) faltantes.push('Nombre del paciente')
    if (!data.responsable_tel_principal) faltantes.push('Teléfono del responsable')
    if (!data.paciente_domicilio) faltantes.push('Domicilio del paciente')
    if (!data.tipos_servicio?.length) faltantes.push('Tipo de servicio')
    if (!data.fecha_inicio_estimada) faltantes.push('Fecha estimada de inicio')
    if (!data.actividades_enfermeria?.length) faltantes.push('Actividades de enfermería')
    if (!data.responsable_pago) faltantes.push('Responsable de pago')

    return (
      <div className="space-y-5">
        {/* Alertas */}
        {(riesgoEfectivo === 'alto') && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-700 font-medium">Paciente con riesgo alto — requiere revisión del jefe de enfermería antes de aprobar.</p>
          </div>
        )}
        {faltantes.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-800 mb-2">Información pendiente para aprobación:</p>
            <ul className="list-disc list-inside space-y-1">
              {faltantes.map(f => <li key={f} className="text-sm text-amber-700">{f}</li>)}
            </ul>
          </div>
        )}

        {/* Tarjeta de resumen operativo */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #2AABBF 100%)' }}>
            <h2 className="text-white font-bold text-lg">{pacienteNombre}</h2>
            <p className="text-white/70 text-sm mt-0.5">Resumen operativo del levantamiento</p>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: 'Responsable', value: data.responsable_nombre },
              { label: 'Teléfono', value: data.responsable_tel_principal },
              { label: 'Domicilio', value: data.paciente_domicilio },
              { label: 'Tipo de servicio', value: data.tipos_servicio?.join(', ') },
              { label: 'Fecha de inicio', value: data.fecha_inicio_estimada },
              { label: 'Horario', value: data.horario_requerido },
              { label: 'Personal requerido', value: data.nivel_personal?.replace(/_/g, ' ') },
              { label: 'Costo autorizado', value: data.costo_autorizado ? `$${data.costo_autorizado.toLocaleString()}` : 'Por definir' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">{value || '—'}</p>
              </div>
            ))}
            <div>
              <p className="text-xs text-gray-400">Riesgo</p>
              <div className="mt-1"><RiesgoBadge riesgo={riesgoEfectivo} /></div>
            </div>
            <div>
              <p className="text-xs text-gray-400">Prioridad</p>
              <div className="mt-1"><PrioridadBadge prioridad={data.prioridad} /></div>
            </div>
          </div>
        </div>

        {/* Actividades */}
        {data.actividades_enfermeria.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#1B2B4B] mb-3">Actividades de enfermería</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.actividades_enfermeria.map(a => (
                <span key={a} className="px-2.5 py-1 rounded-full text-xs bg-[#EBF8FB] text-[#1B2B4B] font-medium">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Medicamentos */}
        {medicamentos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#1B2B4B] mb-3">Medicamentos ({medicamentos.length})</h3>
            <div className="space-y-1">
              {medicamentos.map((m, i) => (
                <p key={i} className="text-sm text-gray-600">
                  <span className="font-medium">{m.nombre}</span>
                  {m.dosis && ` ${m.dosis}`}
                  {m.frecuencia && ` — ${m.frecuencia}`}
                  {m.via && ` (${m.via})`}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Materiales */}
        {materiales.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-semibold text-[#1B2B4B] mb-3">Materiales y equipo ({materiales.length})</h3>
            <div className="space-y-1">
              {materiales.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm text-gray-600">
                  <span>{m.nombre} {m.cantidad && `· ${m.cantidad}`}</span>
                  <span className="text-xs text-gray-400 capitalize">{m.proporciona?.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado final */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-[#1B2B4B] mb-3">Guardar como</h3>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => guardar('borrador')} disabled={isPending}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
              <Save size={15} className="inline mr-1.5" />
              Guardar borrador
            </button>
            <button type="button" onClick={() => guardar('pendiente_revision')} disabled={isPending}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
              <CheckCircle size={15} className="inline mr-1.5" />
              {isPending ? 'Guardando...' : 'Enviar a revisión'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const pasos = [Paso1, Paso2, Paso3, Paso4, Paso5, Paso6, Paso7, Paso8, Paso9, Paso10]
  const StepComponent = pasos[step]

  return (
    <div className="space-y-5">
      <ProgressBar />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <StepComponent />

      <NavButtons />
    </div>
  )
}
