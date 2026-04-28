'use server'

import { revalidatePath } from 'next/cache'
import type { Enfermero } from '@/types'
import { requireAuth, requireRole, fd, fdBool, fdLines, zodActionError, type ActionResult } from './utils'
import { EnfermeroSchema } from '@/lib/validations'

export async function getEnfermeros(search?: string) {
  const { supabase } = await requireAuth()
  let query = supabase
    .from('enfermeros')
    .select('*')
    .order('created_at', { ascending: false })

  if (search?.trim()) {
    query = query.or(
      `nombre.ilike.%${search}%,apellido.ilike.%${search}%,cedula.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Enfermero[]
}

export async function getEnfermero(id: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('enfermeros')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Enfermero
}

export async function crearEnfermero(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = EnfermeroSchema.safeParse({
    nombre:   fd(formData, 'nombre'),
    apellido: fd(formData, 'apellido'),
    cedula:   fd(formData, 'cedula'),
    telefono: fd(formData, 'telefono'),
    email:    fd(formData, 'email'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data
  const { error } = await supabase.from('enfermeros').insert({
    nombre:        v.nombre,
    apellido:      v.apellido,
    cedula:        v.cedula,
    especialidades: fdLines(formData, 'especialidades'),
    telefono:      v.telefono,
    email:         v.email,
    bio:           fd(formData, 'bio') || null,
    disponible:    fdBool(formData, 'disponible'),
    cv_url:        fd(formData, 'cv_url') || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/enfermeros')
  return {}
}

export async function actualizarEnfermero(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = EnfermeroSchema.safeParse({
    nombre:   fd(formData, 'nombre'),
    apellido: fd(formData, 'apellido'),
    cedula:   fd(formData, 'cedula'),
    telefono: fd(formData, 'telefono'),
    email:    fd(formData, 'email'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data
  const { error } = await supabase.from('enfermeros').update({
    nombre:        v.nombre,
    apellido:      v.apellido,
    cedula:        v.cedula,
    especialidades: fdLines(formData, 'especialidades'),
    telefono:      v.telefono,
    email:         v.email,
    bio:           fd(formData, 'bio') || null,
    disponible:    fdBool(formData, 'disponible'),
    cv_url:        fd(formData, 'cv_url') || null,
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/enfermeros')
  revalidatePath(`/enfermeros/${id}`)
  return {}
}

export async function aprobarEnfermero(id: string) {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const { error } = await supabase
    .from('enfermeros')
    .update({ disponible: true })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/enfermeros')
  revalidatePath(`/enfermeros/${id}`)
}
