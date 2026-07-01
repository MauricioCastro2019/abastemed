'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/actions/utils'
import type { Accion, TipoPlanItem, PrioridadAccion } from '@/types'

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'

// ─────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────

export async function getAccionesByTurno(turnoId: string): Promise<Accion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('acciones')
    .select(`
      *,
      responsable:responsable_id (id, nombre, apellido)
    `)
    .eq('turno_id', turnoId)
    .order('programada_para', { ascending: true, nullsFirst: false })
    .order('prioridad', { ascending: true })
  return (data ?? []) as Accion[]
}

export async function getAccionesToday(pacienteId: string): Promise<Accion[]> {
  const supabase = await createClient()
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
  const finHoy    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1).toISOString()

  const { data } = await supabase
    .from('acciones')
    .select(`
      *,
      responsable:responsable_id (id, nombre, apellido)
    `)
    .eq('paciente_id', pacienteId)
    .gte('programada_para', inicioHoy)
    .lt('programada_para', finHoy)
    .order('programada_para', { ascending: true, nullsFirst: false })
  return (data ?? []) as Accion[]
}

export async function getAccionesPendientesTurno(pacienteId: string): Promise<Accion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('acciones')
    .select('*')
    .eq('paciente_id', pacienteId)
    .in('estado', ['pendiente', 'proxima', 'en_proceso'])
    .order('programada_para', { ascending: true })
  return (data ?? []) as Accion[]
}

export async function getUltimaActividadPaciente(pacienteId: string): Promise<Accion | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('acciones')
    .select(`
      *,
      responsable:responsable_id (id, nombre, apellido)
    `)
    .eq('paciente_id', pacienteId)
    .eq('estado', 'realizada')
    .order('completada_en', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as Accion | null
}

// ─────────────────────────────────────────────────────────────
// MOTOR DE PROGRAMACIÓN
// Genera acciones para un turno a partir del plan_items activo
// ─────────────────────────────────────────────────────────────

export async function generarAccionesParaTurno(turnoId: string): Promise<{
  ok: boolean
  generadas: number
  error?: string
}> {
  const supabase = await createClient()

  // 1. Obtener el turno con su caso y paciente
  const { data: turno, error: turnoError } = await supabase
    .from('turnos')
    .select('*, caso:caso_id (id, paciente_id)')
    .eq('id', turnoId)
    .single()

  if (turnoError || !turno) return { ok: false, generadas: 0, error: 'Turno no encontrado' }

  const pacienteId = (turno.caso as { id: string; paciente_id: string })?.paciente_id
  const casoId     = turno.caso_id

  if (!pacienteId) return { ok: false, generadas: 0, error: 'El turno no tiene paciente asociado' }

  // 2. Obtener el plan activo del paciente
  const { data: plan } = await supabase
    .from('planes_atencion')
    .select('id')
    .eq('paciente_id', pacienteId)
    .eq('estado', 'activo')
    .maybeSingle()

  if (!plan) return { ok: true, generadas: 0 } // sin plan activo — no hay acciones que generar

  // 3. Obtener los plan_items activos del plan
  const { data: items } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('activo', true)

  if (!items || items.length === 0) return { ok: true, generadas: 0 }

  // 4. Obtener acciones ya existentes para este turno (evitar duplicados)
  const { data: existentes } = await supabase
    .from('acciones')
    .select('plan_item_id, programada_para')
    .eq('turno_id', turnoId)

  const claveExistente = new Set(
    (existentes ?? []).map(e => `${e.plan_item_id}|${e.programada_para}`)
  )

  // 5. Calcular las acciones que corresponden a este turno
  const turnoInicio = new Date(turno.fecha_inicio)
  const turnoFin    = new Date(turno.fecha_fin)

  const accionesAInsertar: Record<string, unknown>[] = []

  for (const item of items) {
    // segun_necesidad y unica sin horario no generan automáticamente
    if (item.frecuencia === 'segun_necesidad') continue

    const horarios: string[] = item.horarios ?? []

    if (item.frecuencia === 'unica') {
      // Una sola acción al inicio del turno si no existe ya
      const clave = `${item.id}|unica`
      const yaExiste = (existentes ?? []).some(e => e.plan_item_id === item.id)
      if (!yaExiste) {
        accionesAInsertar.push(buildAccion(item, turnoId, pacienteId, casoId, turnoInicio.toISOString()))
      }
      continue
    }

    if (horarios.length === 0) {
      // Si no hay horarios definidos, una acción al inicio del turno
      const yaExiste = (existentes ?? []).some(e => e.plan_item_id === item.id)
      if (!yaExiste) {
        accionesAInsertar.push(buildAccion(item, turnoId, pacienteId, casoId, turnoInicio.toISOString()))
      }
      continue
    }

    // Para cada horario, verificar si cae dentro del turno
    for (const horario of horarios) {
      const [h, m] = horario.split(':').map(Number)

      // Probar en la fecha de inicio del turno
      const candidato = new Date(turnoInicio)
      candidato.setHours(h, m, 0, 0)

      // Si el horario ya pasó hoy pero el turno es nocturno, probar mañana
      if (candidato < turnoInicio) {
        candidato.setDate(candidato.getDate() + 1)
      }

      if (candidato >= turnoInicio && candidato <= turnoFin) {
        const claveAccion = `${item.id}|${candidato.toISOString()}`
        if (!claveExistente.has(claveAccion)) {
          accionesAInsertar.push(buildAccion(item, turnoId, pacienteId, casoId, candidato.toISOString()))
          claveExistente.add(claveAccion)
        }
      }
    }
  }

  if (accionesAInsertar.length === 0) return { ok: true, generadas: 0 }

  const { error: insertError } = await supabase
    .from('acciones')
    .insert(accionesAInsertar)

  if (insertError) return { ok: false, generadas: 0, error: insertError.message }

  revalidatePath(`/enfermero/turnos/${turnoId}`)
  return { ok: true, generadas: accionesAInsertar.length }
}

function buildAccion(
  item: Record<string, unknown>,
  turnoId: string,
  pacienteId: string,
  casoId: string | null,
  programadaPara: string,
): Record<string, unknown> {
  return {
    plan_item_id:   item.id,
    paciente_id:    pacienteId,
    caso_id:        casoId,
    turno_id:       turnoId,
    organization_id: DEFAULT_ORG_ID,
    tipo:           item.tipo,
    nombre:         item.nombre,
    estado:         'pendiente',
    prioridad:      item.prioridad,
    programada_para: programadaPara,
    datos:          {},
  }
}

// ─────────────────────────────────────────────────────────────
// REGISTRO DE ACCIONES (ejecución)
// ─────────────────────────────────────────────────────────────

export async function registrarAccion(
  accionId: string,
  pacienteId: string,
  datos: Record<string, unknown>,
  observaciones?: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Obtener perfil del usuario actual
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id')
    .eq('id', user?.id)
    .maybeSingle()

  const { error } = await supabase
    .from('acciones')
    .update({
      estado:         'realizada',
      completada_en:  new Date().toISOString(),
      responsable_id: perfil?.id ?? null,
      datos,
      observaciones:  observaciones ?? null,
    })
    .eq('id', accionId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}`)
  return { ok: true }
}

export async function omitirAccion(
  accionId: string,
  pacienteId: string,
  motivo: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id')
    .eq('id', user?.id)
    .maybeSingle()

  const { error } = await supabase
    .from('acciones')
    .update({
      estado:         'omitida',
      completada_en:  new Date().toISOString(),
      responsable_id: perfil?.id ?? null,
      observaciones:  motivo,
    })
    .eq('id', accionId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}`)
  return { ok: true }
}

export async function iniciarAccion(
  accionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('acciones')
    .update({
      estado:     'en_proceso',
      iniciada_en: new Date().toISOString(),
    })
    .eq('id', accionId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function verificarAccion(
  accionId: string,
  pacienteId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await requireAuth(); requireRole(perfil, 'admin', 'coordinador')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('acciones')
    .update({
      estado:         'verificada',
      verificada_por: user?.id ?? null,
      verificada_en:  new Date().toISOString(),
    })
    .eq('id', accionId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}`)
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────
// ACCIÓN MANUAL (sin plan_item — espontánea)
// ─────────────────────────────────────────────────────────────

export async function crearAccionManual(data: {
  paciente_id: string
  caso_id?: string | null
  turno_id?: string | null
  tipo: TipoPlanItem
  nombre: string
  prioridad?: PrioridadAccion
  observaciones?: string
  datos?: Record<string, unknown>
}): Promise<{ ok: boolean; accion?: Accion; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id')
    .eq('id', user?.id)
    .maybeSingle()

  const { data: accion, error } = await supabase
    .from('acciones')
    .insert({
      plan_item_id:   null,
      paciente_id:    data.paciente_id,
      caso_id:        data.caso_id ?? null,
      turno_id:       data.turno_id ?? null,
      organization_id: DEFAULT_ORG_ID,
      tipo:           data.tipo,
      nombre:         data.nombre,
      estado:         'realizada',
      prioridad:      data.prioridad ?? 'normal',
      programada_para: new Date().toISOString(),
      completada_en:  new Date().toISOString(),
      responsable_id: perfil?.id ?? null,
      datos:          data.datos ?? {},
      observaciones:  data.observaciones ?? null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${data.paciente_id}`)
  if (data.turno_id) revalidatePath(`/enfermero/turnos/${data.turno_id}`)
  return { ok: true, accion: accion as Accion }
}

// ─────────────────────────────────────────────────────────────
// RESUMEN DEL DÍA (para NAI hub)
// ─────────────────────────────────────────────────────────────

export async function getResumenNai(pacienteId: string): Promise<{
  total: number
  realizadas: number
  pendientes: number
  omitidas: number
  proxima: Accion | null
  score_cumplimiento: number
}> {
  const acciones = await getAccionesToday(pacienteId)

  const realizadas = acciones.filter(a => a.estado === 'realizada' || a.estado === 'verificada').length
  const omitidas   = acciones.filter(a => a.estado === 'omitida' || a.estado === 'rechazada').length
  const pendientes = acciones.filter(a => a.estado === 'pendiente' || a.estado === 'en_proceso').length
  const total      = acciones.length

  const proxima = acciones.find(a => a.estado === 'pendiente' || a.estado === 'proxima') ?? null

  const denominador = realizadas + omitidas + pendientes
  const score = denominador > 0 ? Math.round((realizadas / (denominador)) * 100) : 100

  return { total, realizadas, pendientes, omitidas, proxima, score_cumplimiento: score }
}

// Timeline NAI del paciente
export async function getTimelineNai(pacienteId: string, limit = 30): Promise<Record<string, unknown>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('v_nai_timeline')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('evento_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Record<string, unknown>[]
}
