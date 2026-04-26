'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

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

export async function invitarFamiliar(formData: FormData): Promise<{ error?: string }> {
  const email      = formData.get('email') as string
  const nombre     = formData.get('nombre') as string
  const apellido   = formData.get('apellido') as string
  const pacienteId = (formData.get('paciente_id') as string) || null

  const admin = createServiceClient()

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nombre, apellido },
  })

  if (inviteError) return { error: `Error al invitar: ${inviteError.message}` }

  const userId = inviteData.user.id

  const { error: perfilError } = await admin
    .from('perfiles')
    .update({ rol: 'familiar', nombre, apellido, paciente_id: pacienteId })
    .eq('id', userId)

  if (perfilError) return { error: `Error actualizando perfil: ${perfilError.message}` }

  revalidatePath('/familiares')
  return {}
}

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

export async function removerFamiliar(id: string) {
  const admin = createServiceClient()
  await admin.from('perfiles').update({ rol: 'familiar', paciente_id: null }).eq('id', id)
  revalidatePath('/familiares')
}
