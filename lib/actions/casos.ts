'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Caso } from '@/types'

export async function getCasos() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('casos')
    .select(`
      *,
      paciente:pacientes(id, nombre, apellido, contexto)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Caso[]
}

export async function getCaso(id: string) {
  const supabase = await createClient()
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

export async function crearCaso(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('casos').insert({
    paciente_id: formData.get('paciente_id') as string,
    titulo: formData.get('titulo') as string,
    contexto: formData.get('contexto') as string,
    direccion: formData.get('direccion') as string,
    fecha_inicio: formData.get('fecha_inicio') as string,
    fecha_fin: (formData.get('fecha_fin') as string) || null,
    tarifa_hora: parseFloat(formData.get('tarifa_hora') as string),
    notas: (formData.get('notas') as string) || null,
    status: 'activo',
  })

  if (error) return { error: error.message }

  revalidatePath('/casos')
  revalidatePath('/dashboard')
  return {}
}

export async function actualizarCaso(id: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from('casos').update({
    paciente_id: formData.get('paciente_id') as string,
    titulo: formData.get('titulo') as string,
    contexto: formData.get('contexto') as string,
    direccion: formData.get('direccion') as string,
    fecha_inicio: formData.get('fecha_inicio') as string,
    fecha_fin: (formData.get('fecha_fin') as string) || null,
    tarifa_hora: parseFloat(formData.get('tarifa_hora') as string),
    notas: (formData.get('notas') as string) || null,
    status: formData.get('status') as string,
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/casos')
  revalidatePath(`/casos/${id}`)
  revalidatePath('/dashboard')
  return {}
}

export async function cambiarStatusCaso(id: string, status: 'activo' | 'pausado' | 'cerrado') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('casos')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/casos')
  revalidatePath(`/casos/${id}`)
  revalidatePath('/dashboard')
}
