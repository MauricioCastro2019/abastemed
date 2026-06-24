'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, type ActionResult } from './utils'
import type { HallazgoClinico } from '@/types'

export async function getHallazgosByCaso(casoId: string): Promise<HallazgoClinico[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('hallazgos_clinicos')
    .select('*, creador:perfiles!creado_por(id, nombre, apellido)')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as HallazgoClinico[]
}

export async function getHallazgosAbiertos(casoId: string): Promise<HallazgoClinico[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('hallazgos_clinicos')
    .select('*')
    .eq('caso_id', casoId)
    .in('estado', ['abierto', 'en_seguimiento'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as HallazgoClinico[]
}

export async function crearHallazgo(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const casoId      = fd(formData, 'caso_id')
  const categoria   = fd(formData, 'categoria')
  const tipo        = fd(formData, 'tipo')
  const descripcion = fd(formData, 'descripcion')

  if (!casoId || !categoria || !tipo || !descripcion) {
    return { error: 'Caso, categoría, tipo y descripción son requeridos' }
  }

  const { error } = await supabase.from('hallazgos_clinicos').insert({
    caso_id:               casoId,
    turno_id:              fd(formData, 'turno_id') || null,
    categoria,
    tipo,
    descripcion,
    severidad:             fd(formData, 'severidad') || 'leve',
    estado:                'abierto',
    requiere_vigilancia:   formData.get('requiere_vigilancia') === 'true',
    requiere_notificacion: formData.get('requiere_notificacion') === 'true',
    creado_por:            perfil.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/pacientes`)
  revalidatePath(`/casos/${casoId}`)
  return {}
}

export async function actualizarEstadoHallazgo(
  hallazgoId: string,
  estado: 'en_seguimiento' | 'resuelto',
  notas?: string,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const updates: Record<string, unknown> = {
    estado,
    updated_at: new Date().toISOString(),
  }

  if (estado === 'resuelto') {
    updates.fecha_resolucion = new Date().toISOString()
    updates.notas_resolucion = notas ?? null
    updates.resuelto_por     = perfil.id
  }

  const { data: hallazgo, error: fetchErr } = await supabase
    .from('hallazgos_clinicos')
    .select('caso_id')
    .eq('id', hallazgoId)
    .single()

  if (fetchErr || !hallazgo) return { error: 'Hallazgo no encontrado' }

  const { error } = await supabase
    .from('hallazgos_clinicos')
    .update(updates)
    .eq('id', hallazgoId)

  if (error) return { error: error.message }

  revalidatePath(`/pacientes`)
  return {}
}
