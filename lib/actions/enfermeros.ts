'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Enfermero } from '@/types'

export async function getEnfermeros() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('enfermeros')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Enfermero[]
}

export async function getEnfermero(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('enfermeros')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Enfermero
}

export async function crearEnfermero(formData: FormData) {
  const supabase = await createClient()

  const especialidades = (formData.get('especialidades') as string)
    .split('\n').map(s => s.trim()).filter(Boolean)

  const cv_url = formData.get('cv_url') as string

  const { error } = await supabase.from('enfermeros').insert({
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    cedula: formData.get('cedula') as string,
    especialidades,
    telefono: formData.get('telefono') as string,
    email: formData.get('email') as string,
    bio: formData.get('bio') as string || null,
    disponible: formData.get('disponible') === 'true',
    cv_url: cv_url || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/enfermeros')
  redirect('/enfermeros')
}

export async function actualizarEnfermero(id: string, formData: FormData) {
  const supabase = await createClient()

  const especialidades = (formData.get('especialidades') as string)
    .split('\n').map(s => s.trim()).filter(Boolean)

  const cv_url = formData.get('cv_url') as string

  const { error } = await supabase.from('enfermeros').update({
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    cedula: formData.get('cedula') as string,
    especialidades,
    telefono: formData.get('telefono') as string,
    email: formData.get('email') as string,
    bio: formData.get('bio') as string || null,
    disponible: formData.get('disponible') === 'true',
    cv_url: cv_url || null,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/enfermeros')
  revalidatePath(`/enfermeros/${id}`)
  redirect(`/enfermeros/${id}`)
}

export async function aprobarEnfermero(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('enfermeros')
    .update({ disponible: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/enfermeros')
  revalidatePath(`/enfermeros/${id}`)
}
