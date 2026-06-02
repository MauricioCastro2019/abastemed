'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, type ActionResult } from './utils'
import type { Incidencia } from '@/types'

export async function getIncidenciasByCaso(
  casoId: string,
  limit = 50
): Promise<Incidencia[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('incidencias')
    .select(`
      *,
      turno:turnos(id, fecha_inicio),
      reportado_por_perfil:perfiles!reportado_por(id, nombre, apellido)
    `)
    .eq('caso_id', casoId)
    .order('fecha_hora', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as Incidencia[]
}

export async function getIncidenciasRecientes(casoId: string): Promise<Incidencia[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('incidencias')
    .select('*')
    .eq('caso_id', casoId)
    .gte('fecha_hora', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('fecha_hora', { ascending: false })
    .limit(5)

  if (error) throw new Error(error.message)
  return (data ?? []) as Incidencia[]
}

export async function crearIncidencia(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros', 'enfermero')

  const casoId  = fd(formData, 'caso_id')
  const tipo    = fd(formData, 'tipo')
  const descripcion = fd(formData, 'descripcion')

  if (!casoId || !tipo || !descripcion) {
    return { error: 'Caso, tipo y descripción son requeridos' }
  }

  let signos_vitales = {}
  try {
    const raw = fd(formData, 'signos_vitales_json')
    if (raw) signos_vitales = JSON.parse(raw)
  } catch { /* vacío */ }

  const fechaHoraRaw = fd(formData, 'fecha_hora')

  const { error } = await supabase.from('incidencias').insert({
    caso_id:         casoId,
    turno_id:        fd(formData, 'turno_id')        || null,
    reporte_turno_id: fd(formData, 'reporte_turno_id') || null,
    tipo,
    descripcion,
    signos_vitales,
    intervencion:    fd(formData, 'intervencion')    || null,
    a_quien_se_aviso: fd(formData, 'a_quien_se_aviso') || null,
    respuesta:       fd(formData, 'respuesta')       || null,
    estado_posterior: fd(formData, 'estado_posterior') || null,
    gravedad:        fd(formData, 'gravedad')        || 'moderada',
    reportado_por:   perfil.id,
    fecha_hora:      fechaHoraRaw || new Date().toISOString(),
  })

  if (error) return { error: error.message }

  revalidatePath(`/casos/${casoId}/incidencias`)
  revalidatePath(`/casos/${casoId}`)
  return {}
}

export async function getConteoIncidenciasCriticas(casoId: string): Promise<number> {
  const { supabase } = await requireAuth()
  const { count } = await supabase
    .from('incidencias')
    .select('id', { count: 'exact', head: true })
    .eq('caso_id', casoId)
    .in('gravedad', ['grave', 'critica'])
    .gte('fecha_hora', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())

  return count ?? 0
}
