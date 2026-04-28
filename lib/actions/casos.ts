'use server'

import { revalidatePath } from 'next/cache'
import type { Caso } from '@/types'
import { requireAuth, requireRole, fd, fdNum, zodActionError, type ActionResult } from './utils'
import { CasoSchema } from '@/lib/validations'

export async function getCasos(search?: string) {
  const { supabase } = await requireAuth()
  let query = supabase
    .from('casos')
    .select(`
      *,
      paciente:pacientes(id, nombre, apellido, contexto)
    `)
    .order('created_at', { ascending: false })

  if (search?.trim()) {
    query = query.or(`titulo.ilike.%${search}%,direccion.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Caso[]
}

export async function getCaso(id: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('casos')
    .select(`
      *,
      paciente:pacientes(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Caso
}

export async function crearCaso(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = CasoSchema.safeParse({
    paciente_id:  fd(formData, 'paciente_id'),
    titulo:       fd(formData, 'titulo'),
    contexto:     fd(formData, 'contexto'),
    direccion:    fd(formData, 'direccion'),
    fecha_inicio: fd(formData, 'fecha_inicio'),
    tarifa_hora:  fdNum(formData, 'tarifa_hora'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data
  const { error } = await supabase.from('casos').insert({
    paciente_id:  v.paciente_id,
    titulo:       v.titulo,
    contexto:     v.contexto,
    direccion:    v.direccion,
    fecha_inicio: v.fecha_inicio,
    fecha_fin:    fd(formData, 'fecha_fin') || null,
    tarifa_hora:  v.tarifa_hora,
    notas:        fd(formData, 'notas') || null,
    status:       'activo',
  })

  if (error) return { error: error.message }

  revalidatePath('/casos')
  revalidatePath('/dashboard')
  return {}
}

export async function actualizarCaso(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = CasoSchema.safeParse({
    paciente_id:  fd(formData, 'paciente_id'),
    titulo:       fd(formData, 'titulo'),
    contexto:     fd(formData, 'contexto'),
    direccion:    fd(formData, 'direccion'),
    fecha_inicio: fd(formData, 'fecha_inicio'),
    tarifa_hora:  fdNum(formData, 'tarifa_hora'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data
  const { error } = await supabase.from('casos').update({
    paciente_id:  v.paciente_id,
    titulo:       v.titulo,
    contexto:     v.contexto,
    direccion:    v.direccion,
    fecha_inicio: v.fecha_inicio,
    fecha_fin:    fd(formData, 'fecha_fin') || null,
    tarifa_hora:  v.tarifa_hora,
    notas:        fd(formData, 'notas') || null,
    status:       fd(formData, 'status') || 'activo',
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/casos')
  revalidatePath(`/casos/${id}`)
  revalidatePath('/dashboard')
  return {}
}

export async function cambiarStatusCaso(id: string, status: 'activo' | 'pausado' | 'cerrado') {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const { error } = await supabase
    .from('casos')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/casos')
  revalidatePath(`/casos/${id}`)
  revalidatePath('/dashboard')
}
