'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole, fd, zodActionError, type ActionResult } from './utils'
import { IndicacionSchema } from '@/lib/validations'
import type { Indicacion, EventoIndicacion, FrecuenciaIndicacion } from '@/types'

// ============================================================
// Helpers de generación de eventos
// ============================================================

const HORARIOS_DEFAULT: Record<FrecuenciaIndicacion, string[]> = {
  cada_4h:                 ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  cada_6h:                 ['06:00', '12:00', '18:00', '00:00'],
  cada_8h:                 ['08:00', '16:00', '00:00'],
  cada_12h:                ['08:00', '20:00'],
  cada_24h:                ['08:00'],
  lunes_miercoles_viernes: ['08:00'],
  una_vez:                 ['08:00'],
  segun_necesidad:         [],
}

const LMV = new Set([1, 3, 5]) // lunes, miércoles, viernes (getDay())

function generarFechasEventos(
  frecuencia: FrecuenciaIndicacion,
  horarios: string[],
  fechaInicio: Date,
  fechaFin: Date
): Date[] {
  if (frecuencia === 'segun_necesidad') return []

  const efectivos = horarios.length > 0 ? horarios : HORARIOS_DEFAULT[frecuencia]

  if (frecuencia === 'una_vez') {
    const [h, m] = (efectivos[0] ?? '08:00').split(':').map(Number)
    const d = new Date(fechaInicio)
    d.setHours(h, m, 0, 0)
    return [d]
  }

  const eventos: Date[] = []
  const cursor = new Date(fechaInicio)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= fechaFin) {
    const skipDay = frecuencia === 'lunes_miercoles_viernes' && !LMV.has(cursor.getDay())

    if (!skipDay) {
      for (const horario of efectivos) {
        const [h, m] = horario.split(':').map(Number)
        const ev = new Date(cursor)
        ev.setHours(h, m, 0, 0)
        eventos.push(new Date(ev))
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return eventos
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function insertarEventos(supabase: SupabaseClient, indicacion: Indicacion): Promise<void> {
  if (indicacion.frecuencia === 'segun_necesidad') return

  const fechaInicio = new Date(indicacion.fecha_inicio + 'T00:00:00')
  const maxFin = new Date(fechaInicio)
  maxFin.setDate(maxFin.getDate() + 60)

  const fechaFin = indicacion.fecha_fin
    ? new Date(Math.min(
        new Date(indicacion.fecha_fin + 'T23:59:59').getTime(),
        maxFin.getTime()
      ))
    : maxFin

  const fechas = generarFechasEventos(
    indicacion.frecuencia,
    indicacion.horarios,
    fechaInicio,
    fechaFin
  )

  if (fechas.length === 0) return

  const rows = fechas.map(f => ({
    indicacion_id:         indicacion.id,
    paciente_id:           indicacion.paciente_id,
    fecha_hora_programada: f.toISOString(),
    status:                'pendiente' as const,
  }))

  // Batch insert en bloques de 500 para no superar el límite de Supabase
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase
      .from('eventos_indicacion')
      .insert(rows.slice(i, i + 500))
    if (error) console.error('Error generando eventos:', error.message)
  }
}

// ============================================================
// Queries
// ============================================================

export async function getAllIndicacionesActivas(): Promise<Indicacion[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('indicaciones')
    .select('*, paciente:pacientes(id, nombre, apellido)')
    .eq('activa', true)
    .order('paciente_id', { ascending: true })
    .order('created_at',  { ascending: false })

  if (error) throw new Error(error.message)
  return data as Indicacion[]
}

export async function getIndicacionesByPaciente(pacienteId: string): Promise<Indicacion[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('indicaciones')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('activa', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Indicacion[]
}

export async function getIndicacion(id: string): Promise<Indicacion> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('indicaciones')
    .select('*, paciente:pacientes(id, nombre, apellido)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Indicacion
}

export async function getEventosByFecha(
  fecha: string,          // YYYY-MM-DD (fecha local)
  pacienteId?: string
): Promise<EventoIndicacion[]> {
  const { supabase } = await requireAuth()

  // Rango del día completo en UTC
  const inicio = fecha + 'T00:00:00.000Z'
  const fin    = fecha + 'T23:59:59.999Z'

  let query = supabase
    .from('eventos_indicacion')
    .select(`
      *,
      indicacion:indicaciones(
        id, nombre, tipo, dosis, via, frecuencia, responsable,
        paciente:pacientes(id, nombre, apellido)
      )
    `)
    .gte('fecha_hora_programada', inicio)
    .lte('fecha_hora_programada', fin)
    .order('fecha_hora_programada', { ascending: true })

  if (pacienteId) query = query.eq('paciente_id', pacienteId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as EventoIndicacion[]
}

export async function getEventosByFechaEnfermero(fecha: string): Promise<EventoIndicacion[]> {
  const { supabase, perfil } = await requireAuth()
  if (!perfil.enfermero_id) return []

  // Casos del enfermero
  const { data: turnos } = await supabase
    .from('turnos')
    .select('caso_id')
    .eq('enfermero_id', perfil.enfermero_id)

  if (!turnos?.length) return []

  const casoIds = Array.from(new Set(turnos.map(t => t.caso_id as string)))

  const { data: casos } = await supabase
    .from('casos')
    .select('paciente_id')
    .in('id', casoIds)

  if (!casos?.length) return []

  const pacienteIds = Array.from(new Set(casos.map(c => c.paciente_id as string)))

  const inicio = fecha + 'T00:00:00.000Z'
  const fin    = fecha + 'T23:59:59.999Z'

  const { data, error } = await supabase
    .from('eventos_indicacion')
    .select(`
      *,
      indicacion:indicaciones(
        id, nombre, tipo, dosis, via, frecuencia, responsable,
        paciente:pacientes(id, nombre, apellido)
      )
    `)
    .in('paciente_id', pacienteIds)
    .gte('fecha_hora_programada', inicio)
    .lte('fecha_hora_programada', fin)
    .order('fecha_hora_programada', { ascending: true })

  if (error) throw new Error(error.message)
  return data as EventoIndicacion[]
}

// ============================================================
// Mutaciones
// ============================================================

export async function crearIndicacion(
  formData: FormData
): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const horarios = (formData.getAll('horarios') as string[])
    .map(h => h.trim())
    .filter(h => /^\d{2}:\d{2}$/.test(h))

  const raw = {
    paciente_id:  fd(formData, 'paciente_id'),
    caso_id:      fd(formData, 'caso_id') || undefined,
    tipo:         fd(formData, 'tipo'),
    nombre:       fd(formData, 'nombre'),
    dosis:        fd(formData, 'dosis') || undefined,
    via:          fd(formData, 'via') || undefined,
    frecuencia:   fd(formData, 'frecuencia'),
    fecha_inicio: fd(formData, 'fecha_inicio'),
    fecha_fin:    fd(formData, 'fecha_fin') || undefined,
    responsable:  fd(formData, 'responsable') || undefined,
    notas:        fd(formData, 'notas') || undefined,
  }

  const parsed = IndicacionSchema.safeParse(raw)
  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data

  const horariosFinales =
    horarios.length > 0
      ? horarios
      : HORARIOS_DEFAULT[v.frecuencia as FrecuenciaIndicacion]

  const { data: indicacion, error } = await supabase
    .from('indicaciones')
    .insert({
      paciente_id:  v.paciente_id,
      caso_id:      v.caso_id || null,
      tipo:         v.tipo,
      nombre:       v.nombre,
      dosis:        v.dosis || null,
      via:          v.via || null,
      frecuencia:   v.frecuencia,
      horarios:     horariosFinales,
      fecha_inicio: v.fecha_inicio,
      fecha_fin:    v.fecha_fin || null,
      responsable:  v.responsable || null,
      notas:        v.notas || null,
      activa:       true,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  await insertarEventos(supabase, indicacion as Indicacion)

  revalidatePath(`/pacientes/${v.paciente_id}/plan-cuidado`)
  revalidatePath('/agenda-cuidado')
  revalidatePath('/plan-cuidado')
  return { id: (indicacion as Indicacion).id }
}

export async function toggleIndicacion(
  id: string,
  activa: boolean
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { data: ind, error: fetchErr } = await supabase
    .from('indicaciones')
    .select('paciente_id')
    .eq('id', id)
    .single()

  if (fetchErr) return { error: fetchErr.message }

  const { error } = await supabase
    .from('indicaciones')
    .update({ activa })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/pacientes/${(ind as { paciente_id: string }).paciente_id}/plan-cuidado`)
  revalidatePath('/plan-cuidado')
  return {}
}

export async function actualizarStatusEvento(
  id: string,
  status: 'confirmado' | 'omitido' | 'reprogramado' | 'cancelado',
  notas?: string
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const { error } = await supabase
    .from('eventos_indicacion')
    .update({
      status,
      notas:           notas ?? null,
      fecha_hora_real: status === 'confirmado' ? new Date().toISOString() : null,
      atendido_por:    perfil.id,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/agenda-cuidado')
  revalidatePath('/enfermero/agenda-cuidado')
  return {}
}
