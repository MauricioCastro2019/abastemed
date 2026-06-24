'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, type ActionResult } from './utils'
import type { VigilanciaEspecial } from '@/types'

export async function getVigilanciasByCaso(casoId: string): Promise<VigilanciaEspecial[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('vigilancias_especiales')
    .select('*, creador:perfiles!creado_por(id, nombre, apellido)')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as VigilanciaEspecial[]
}

export async function getVigilanciaActivasByCaso(casoId: string): Promise<VigilanciaEspecial[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('vigilancias_especiales')
    .select('*')
    .eq('caso_id', casoId)
    .eq('activa', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as VigilanciaEspecial[]
}

export async function crearVigilancia(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const casoId    = fd(formData, 'caso_id')
  const parametro = fd(formData, 'parametro')

  if (!casoId || !parametro) {
    return { error: 'Caso y parámetro son requeridos' }
  }

  const { error } = await supabase.from('vigilancias_especiales').insert({
    caso_id:      casoId,
    creado_por:   perfil.id,
    parametro,
    descripcion:  fd(formData, 'descripcion') || null,
    frecuencia:   fd(formData, 'frecuencia') || null,
    instrucciones: fd(formData, 'instrucciones') || null,
    activa:       true,
  })

  if (error) return { error: error.message }

  revalidatePath(`/pacientes`)
  return {}
}

export async function desactivarVigilancia(vigilanciaId: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const { error } = await supabase
    .from('vigilancias_especiales')
    .update({
      activa:              false,
      desactivado_por:     perfil.id,
      fecha_desactivacion: new Date().toISOString(),
    })
    .eq('id', vigilanciaId)

  if (error) return { error: error.message }

  revalidatePath(`/pacientes`)
  return {}
}
