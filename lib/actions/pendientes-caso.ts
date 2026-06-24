'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, type ActionResult } from './utils'
import type { PendienteCaso } from '@/types'

export async function getPendientesByCaso(casoId: string): Promise<PendienteCaso[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('pendientes_caso')
    .select('*, creador:perfiles!enfermero_creador_id(id, nombre, apellido)')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as PendienteCaso[]
}

export async function getPendientesActivos(casoId: string): Promise<PendienteCaso[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('pendientes_caso')
    .select('*')
    .eq('caso_id', casoId)
    .in('estado', ['pendiente', 'en_proceso'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as PendienteCaso[]
}

export async function crearPendiente(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const casoId = fd(formData, 'caso_id')
  const titulo = fd(formData, 'titulo')

  if (!casoId || !titulo) {
    return { error: 'Caso y título son requeridos' }
  }

  const { error } = await supabase.from('pendientes_caso').insert({
    caso_id:              casoId,
    turno_origen_id:      fd(formData, 'turno_id') || null,
    enfermero_creador_id: perfil.id,
    titulo,
    descripcion:          fd(formData, 'descripcion') || null,
    prioridad:            fd(formData, 'prioridad') || 'normal',
    estado:               'pendiente',
    origen:               fd(formData, 'origen') || 'manual',
    origen_id:            fd(formData, 'origen_id') || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/pacientes`)
  return {}
}

export async function actualizarEstadoPendiente(
  pendienteId: string,
  estado: 'en_proceso' | 'resuelto' | 'cancelado',
  notas?: string,
  turnoId?: string,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const updates: Record<string, unknown> = {
    estado,
    updated_at: new Date().toISOString(),
  }

  if (estado === 'resuelto' || estado === 'cancelado') {
    updates.fecha_resolucion        = new Date().toISOString()
    updates.notas_resolucion        = notas ?? null
    updates.enfermero_resolucion_id = perfil.id
    if (turnoId) updates.turno_resolucion_id = turnoId
  }

  const { error } = await supabase
    .from('pendientes_caso')
    .update(updates)
    .eq('id', pendienteId)

  if (error) return { error: error.message }

  revalidatePath(`/pacientes`)
  return {}
}
