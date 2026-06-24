'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, type ActionResult } from './utils'
import type { AlertaActiva } from '@/types'

export async function getAlertasActivasByCaso(casoId: string): Promise<AlertaActiva[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('alertas_activas')
    .select('*, activador:perfiles!activado_por(id, nombre, apellido)')
    .eq('caso_id', casoId)
    .eq('activa', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as AlertaActiva[]
}

export async function getTodasAlertasByCaso(casoId: string): Promise<AlertaActiva[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('alertas_activas')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as AlertaActiva[]
}

export async function crearAlertaActiva(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const casoId = fd(formData, 'caso_id')
  const tipo   = fd(formData, 'tipo')

  if (!casoId || !tipo) {
    return { error: 'Caso y tipo de alerta son requeridos' }
  }

  const { error } = await supabase.from('alertas_activas').insert({
    caso_id:             casoId,
    turno_activacion_id: fd(formData, 'turno_id') || null,
    activado_por:        perfil.id,
    tipo,
    descripcion:         fd(formData, 'descripcion') || null,
    nivel:               fd(formData, 'nivel') || 'moderado',
    activa:              true,
  })

  if (error) return { error: error.message }

  revalidatePath(`/pacientes`)
  return {}
}

export async function desactivarAlerta(
  alertaId: string,
  motivo?: string,
  turnoId?: string,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const { error } = await supabase
    .from('alertas_activas')
    .update({
      activa:                   false,
      desactivado_por:          perfil.id,
      fecha_desactivacion:      new Date().toISOString(),
      motivo_desactivacion:     motivo ?? null,
      turno_desactivacion_id:   turnoId ?? null,
    })
    .eq('id', alertaId)

  if (error) return { error: error.message }

  revalidatePath(`/pacientes`)
  return {}
}
