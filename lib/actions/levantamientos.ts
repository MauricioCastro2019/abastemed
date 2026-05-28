'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, type ActionResult } from './utils'
import type {
  LevantamientoPaciente,
  LevantamientoMedicamento,
  LevantamientoMaterial,
} from '@/types'

// ============================================================
// Tipos internos para el payload del wizard
// ============================================================

export type LevantamientoPayload = Omit<
  LevantamientoPaciente,
  'id' | 'created_at' | 'updated_at' | 'medicamentos' | 'materiales' | 'levantador'
>

// ============================================================
// QUERIES
// ============================================================

export interface LevantamientoFiltros {
  q?: string
  estado?: string
  riesgo?: string
  prioridad?: string
}

export async function getLevantamientos(filtros?: LevantamientoFiltros) {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('levantamientos_paciente')
    .select(`
      id, paciente_nombre, paciente_apellido, paciente_fecha_nacimiento,
      tipos_servicio, riesgo_final, prioridad, estado, urgencia_percibida,
      responsable_nombre, responsable_tel_principal,
      fecha_inicio_estimada, nivel_personal, levantado_por,
      created_at, updated_at,
      levantador:levantado_por(nombre, apellido)
    `)
    .order('created_at', { ascending: false })

  if (filtros?.estado && filtros.estado !== 'todos') {
    query = query.eq('estado', filtros.estado)
  }
  if (filtros?.riesgo && filtros.riesgo !== 'todos') {
    query = query.eq('riesgo_final', filtros.riesgo)
  }
  if (filtros?.prioridad && filtros.prioridad !== 'todos') {
    query = query.eq('prioridad', filtros.prioridad)
  }
  if (filtros?.q?.trim()) {
    const q = filtros.q.trim()
    query = query.or(
      `paciente_nombre.ilike.%${q}%,paciente_apellido.ilike.%${q}%,responsable_nombre.ilike.%${q}%,responsable_tel_principal.ilike.%${q}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as LevantamientoPaciente[]
}

export async function getLevantamiento(id: string) {
  const { supabase } = await requireAuth()

  const [levResult, medResult, matResult] = await Promise.all([
    supabase
      .from('levantamientos_paciente')
      .select('*, levantador:levantado_por(nombre, apellido)')
      .eq('id', id)
      .single(),
    supabase
      .from('levantamiento_medicamentos')
      .select('*')
      .eq('levantamiento_id', id)
      .order('orden'),
    supabase
      .from('levantamiento_materiales')
      .select('*')
      .eq('levantamiento_id', id)
      .order('orden'),
  ])

  if (levResult.error) throw new Error(levResult.error.message)

  return {
    ...(levResult.data as LevantamientoPaciente),
    medicamentos: (medResult.data ?? []) as LevantamientoMedicamento[],
    materiales: (matResult.data ?? []) as LevantamientoMaterial[],
  }
}

// ============================================================
// CREAR
// ============================================================

export async function crearLevantamiento(
  payload: LevantamientoPayload,
  medicamentos: Omit<LevantamientoMedicamento, 'id' | 'levantamiento_id'>[],
  materiales: Omit<LevantamientoMaterial, 'id' | 'levantamiento_id'>[]
): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const insertData = buildInsertPayload(payload, perfil.id)

  const { data: lev, error: levErr } = await supabase
    .from('levantamientos_paciente')
    .insert(insertData)
    .select('id')
    .single()

  if (levErr) return { error: levErr.message }

  const levId = lev.id

  // Insertar medicamentos
  if (medicamentos.length > 0) {
    const { error: medErr } = await supabase
      .from('levantamiento_medicamentos')
      .insert(
        medicamentos.map((m, i) => ({ ...m, levantamiento_id: levId, orden: i }))
      )
    if (medErr) return { error: medErr.message }
  }

  // Insertar materiales
  if (materiales.length > 0) {
    const { error: matErr } = await supabase
      .from('levantamiento_materiales')
      .insert(
        materiales.map((m, i) => ({ ...m, levantamiento_id: levId, orden: i }))
      )
    if (matErr) return { error: matErr.message }
  }

  revalidatePath('/levantamientos')
  return { id: levId }
}

// ============================================================
// ACTUALIZAR
// ============================================================

export async function actualizarLevantamiento(
  id: string,
  payload: LevantamientoPayload,
  medicamentos: Omit<LevantamientoMedicamento, 'id' | 'levantamiento_id'>[],
  materiales: Omit<LevantamientoMaterial, 'id' | 'levantamiento_id'>[]
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const insertData = buildInsertPayload(payload, perfil.id)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { levantado_por: _lp, ...updateData } = insertData

  const { error: levErr } = await supabase
    .from('levantamientos_paciente')
    .update(updateData)
    .eq('id', id)

  if (levErr) return { error: levErr.message }

  // Reemplazar medicamentos y materiales
  await supabase.from('levantamiento_medicamentos').delete().eq('levantamiento_id', id)
  await supabase.from('levantamiento_materiales').delete().eq('levantamiento_id', id)

  if (medicamentos.length > 0) {
    await supabase
      .from('levantamiento_medicamentos')
      .insert(medicamentos.map((m, i) => ({ ...m, levantamiento_id: id, orden: i })))
  }

  if (materiales.length > 0) {
    await supabase
      .from('levantamiento_materiales')
      .insert(materiales.map((m, i) => ({ ...m, levantamiento_id: id, orden: i })))
  }

  revalidatePath('/levantamientos')
  revalidatePath(`/levantamientos/${id}`)
  return {}
}

// ============================================================
// CAMBIAR ESTADO
// ============================================================

export async function cambiarEstadoLevantamiento(
  id: string,
  estado: LevantamientoPaciente['estado']
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const { error } = await supabase
    .from('levantamientos_paciente')
    .update({ estado })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/levantamientos')
  revalidatePath(`/levantamientos/${id}`)
  return {}
}

// ============================================================
// HELPER: construir payload limpio para DB
// ============================================================

function buildInsertPayload(payload: LevantamientoPayload, levantadoPor: string) {
  return {
    // Datos del paciente
    paciente_nombre:           payload.paciente_nombre || '',
    paciente_apellido:         payload.paciente_apellido || '',
    paciente_fecha_nacimiento: payload.paciente_fecha_nacimiento || null,
    paciente_sexo:             payload.paciente_sexo || null,
    paciente_telefono:         payload.paciente_telefono || null,
    paciente_domicilio:        payload.paciente_domicilio || null,
    paciente_referencias:      payload.paciente_referencias || null,
    paciente_ciudad:           payload.paciente_ciudad || null,
    paciente_estado_geo:       payload.paciente_estado_geo || null,
    paciente_cp:               payload.paciente_cp || null,
    paciente_obs_ubicacion:    payload.paciente_obs_ubicacion || null,
    // Responsable
    responsable_nombre:          payload.responsable_nombre || null,
    responsable_parentesco:      payload.responsable_parentesco || null,
    responsable_tel_principal:   payload.responsable_tel_principal || null,
    responsable_tel_alternativo: payload.responsable_tel_alternativo || null,
    responsable_email:           payload.responsable_email || null,
    responsable_es_pagador:      payload.responsable_es_pagador ?? false,
    responsable_obs:             payload.responsable_obs || null,
    // Solicitud
    fecha_solicitud:     payload.fecha_solicitud || new Date().toISOString(),
    medio_contacto:      payload.medio_contacto || null,
    persona_solicita:    payload.persona_solicita || null,
    relacion_solicitante: payload.relacion_solicitante || null,
    motivo_general:      payload.motivo_general || null,
    urgencia_percibida:  payload.urgencia_percibida || 'media',
    // Servicio
    tipos_servicio:       payload.tipos_servicio ?? [],
    descripcion_necesidad: payload.descripcion_necesidad || null,
    expectativa_familia:  payload.expectativa_familia || null,
    obs_servicio:         payload.obs_servicio || null,
    // Valoración clínica
    diagnostico_principal:    payload.diagnostico_principal || null,
    diagnosticos_secundarios: payload.diagnosticos_secundarios || null,
    medico_tratante:          payload.medico_tratante || null,
    hospital_referencia:      payload.hospital_referencia || null,
    fecha_evento_reciente:    payload.fecha_evento_reciente || null,
    estado_conciencia:        payload.estado_conciencia || null,
    orientacion:              payload.orientacion ?? [],
    comunicacion:             payload.comunicacion || null,
    movilidad:                payload.movilidad || null,
    riesgo_caida:             payload.riesgo_caida || null,
    tiene_dolor:              payload.tiene_dolor ?? false,
    escala_dolor:             payload.escala_dolor ?? null,
    ubicacion_dolor:          payload.ubicacion_dolor || null,
    tiene_heridas:            payload.tiene_heridas ?? false,
    descripcion_heridas:      payload.descripcion_heridas || null,
    usa_oxigeno:              payload.usa_oxigeno ?? false,
    litros_oxigeno:           payload.litros_oxigeno || null,
    dispositivo_oxigeno:      payload.dispositivo_oxigeno || null,
    usa_sonda:                payload.usa_sonda ?? false,
    tipo_sonda:               payload.tipo_sonda || null,
    usa_cateter:              payload.usa_cateter ?? false,
    tipo_cateter:             payload.tipo_cateter || null,
    usa_panal:                payload.usa_panal ?? false,
    alimentacion:             payload.alimentacion || null,
    evacuacion:               payload.evacuacion || null,
    obs_clinicas:             payload.obs_clinicas || null,
    signos_vitales:           payload.signos_vitales ?? {},
    // Farmacología
    alergias:                payload.alergias || null,
    alergias_medicamentos:   payload.alergias_medicamentos || null,
    reacciones_previas:      payload.reacciones_previas || null,
    medicamentos_suspendidos: payload.medicamentos_suspendidos || null,
    obs_farmacologicas:      payload.obs_farmacologicas || null,
    // Actividades
    actividades_enfermeria: payload.actividades_enfermeria ?? [],
    obs_actividades:        payload.obs_actividades || null,
    // Entorno
    entorno: payload.entorno ?? {},
    // Plan
    fecha_inicio_estimada:   payload.fecha_inicio_estimada || null,
    fecha_termino_estimada:  payload.fecha_termino_estimada || null,
    tipo_turno:              payload.tipo_turno || null,
    horario_requerido:       payload.horario_requerido || null,
    frecuencia_servicio:     payload.frecuencia_servicio || null,
    num_personas_requeridas: payload.num_personas_requeridas ?? 1,
    nivel_personal:          payload.nivel_personal || null,
    requiere_supervision:    payload.requiere_supervision ?? false,
    prioridad:               payload.prioridad || 'media',
    // Riesgo
    riesgo_sugerido:          payload.riesgo_sugerido || 'bajo',
    riesgo_final:             payload.riesgo_final || 'bajo',
    riesgo_modificado_manual: payload.riesgo_modificado_manual ?? false,
    // Costos
    costo_estimado:    payload.costo_estimado ?? null,
    costo_autorizado:  payload.costo_autorizado ?? null,
    forma_pago:        payload.forma_pago || null,
    responsable_pago:  payload.responsable_pago || null,
    material_incluido: payload.material_incluido || null,
    material_no_incluido: payload.material_no_incluido || null,
    obs_administrativas: payload.obs_administrativas || null,
    // Consentimiento
    consentimiento: payload.consentimiento ?? {},
    // Control
    estado:        payload.estado || 'borrador',
    levantado_por: levantadoPor,
  }
}
