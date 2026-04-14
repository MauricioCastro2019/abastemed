'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Lista todos los usuarios con rol familiar + su paciente vinculado
export async function getFamiliares() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select(`
      id, nombre, apellido, email, paciente_id,
      paciente:pacientes(id, nombre, apellido)
    `)
    .eq('rol', 'familiar')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getFamiliar(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .select(`
      id, nombre, apellido, email, paciente_id,
      paciente:pacientes(id, nombre, apellido)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

// Invitar un nuevo familiar por email + vincularlo a un paciente
export async function invitarFamiliar(formData: FormData) {
  const email      = formData.get('email') as string
  const nombre     = formData.get('nombre') as string
  const apellido   = formData.get('apellido') as string
  const pacienteId = (formData.get('paciente_id') as string) || null

  const admin = createServiceClient()

  // 1. Invitar al usuario (crea la cuenta y envía email con link de acceso)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nombre, apellido },
  })

  if (inviteError) throw new Error(`Error al invitar: ${inviteError.message}`)

  const userId = inviteData.user.id

  // 2. Actualizar el perfil con rol familiar + nombre + paciente
  const { error: perfilError } = await admin
    .from('perfiles')
    .update({ rol: 'familiar', nombre, apellido, paciente_id: pacienteId })
    .eq('id', userId)

  if (perfilError) throw new Error(`Error actualizando perfil: ${perfilError.message}`)

  revalidatePath('/familiares')
  redirect('/familiares')
}

// Vincular o cambiar el paciente de un familiar
export async function vincularPaciente(familiarId: string, pacienteId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('perfiles')
    .update({ paciente_id: pacienteId })
    .eq('id', familiarId)

  if (error) throw new Error(error.message)
  revalidatePath('/familiares')
  revalidatePath(`/familiares/${familiarId}`)
}

// Eliminar / desactivar familiar (cambia rol a null o lo deja sin acceso)
export async function removerFamiliar(id: string) {
  const admin = createServiceClient()
  // Quitar rol familiar (el usuario sigue existiendo pero no ve nada)
  await admin.from('perfiles').update({ rol: 'familiar', paciente_id: null }).eq('id', id)
  revalidatePath('/familiares')
}
