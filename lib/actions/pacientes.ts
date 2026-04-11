'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Paciente } from '@/types'

export async function getPacientes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Paciente[]
}

export async function getPaciente(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Paciente
}

export async function crearPaciente(formData: FormData) {
  const supabase = await createClient()

  const medicamentos = (formData.get('medicamentos') as string)
    .split('\n').map(s => s.trim()).filter(Boolean)
  const alergias = (formData.get('alergias') as string)
    .split('\n').map(s => s.trim()).filter(Boolean)

  const contacto_familiar = {
    nombre: formData.get('contacto_nombre') as string,
    telefono: formData.get('contacto_telefono') as string,
    email: formData.get('contacto_email') as string,
    relacion: formData.get('contacto_relacion') as string,
  }

  const { error } = await supabase.from('pacientes').insert({
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    fecha_nacimiento: formData.get('fecha_nacimiento') as string,
    diagnostico: formData.get('diagnostico') as string,
    medicamentos,
    alergias,
    contacto_familiar,
    contexto: formData.get('contexto') as string,
    status: 'activo',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/pacientes')
  redirect('/pacientes')
}

export async function actualizarPaciente(id: string, formData: FormData) {
  const supabase = await createClient()

  const medicamentos = (formData.get('medicamentos') as string)
    .split('\n').map(s => s.trim()).filter(Boolean)
  const alergias = (formData.get('alergias') as string)
    .split('\n').map(s => s.trim()).filter(Boolean)

  const contacto_familiar = {
    nombre: formData.get('contacto_nombre') as string,
    telefono: formData.get('contacto_telefono') as string,
    email: formData.get('contacto_email') as string,
    relacion: formData.get('contacto_relacion') as string,
  }

  const { error } = await supabase.from('pacientes').update({
    nombre: formData.get('nombre') as string,
    apellido: formData.get('apellido') as string,
    fecha_nacimiento: formData.get('fecha_nacimiento') as string,
    diagnostico: formData.get('diagnostico') as string,
    medicamentos,
    alergias,
    contacto_familiar,
    contexto: formData.get('contexto') as string,
    status: formData.get('status') as string,
  }).eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/pacientes')
  revalidatePath(`/pacientes/${id}`)
  redirect(`/pacientes/${id}`)
}

export async function cambiarStatusPaciente(id: string, status: 'activo' | 'cerrado') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('pacientes')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/pacientes')
  revalidatePath(`/pacientes/${id}`)
}
