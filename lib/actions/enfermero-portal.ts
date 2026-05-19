'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import type { Enfermero, PerfilUsuario } from '@/types'

export async function getMiPerfil(): Promise<{ perfil: PerfilUsuario; enfermero: Enfermero | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw new Error(error.message)

  let enfermero = null
  if (perfil.enfermero_id) {
    const { data } = await supabase
      .from('enfermeros')
      .select('*')
      .eq('id', perfil.enfermero_id)
      .single()
    enfermero = data
  } else {
    // Buscar por email si no está vinculado
    const { data } = await supabase
      .from('enfermeros')
      .select('*')
      .eq('email', user.email!)
      .maybeSingle()

    if (data) {
      // Vincular automáticamente
      await supabase
        .from('perfiles')
        .update({ enfermero_id: data.id })
        .eq('id', user.id)
      enfermero = data
    }
  }

  return { perfil, enfermero }
}

export async function getMisTurnos() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.enfermero_id) return []

  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      caso:casos(id, titulo, direccion, contexto, paciente:pacientes(nombre, apellido))
    `)
    .eq('enfermero_id', perfil.enfermero_id)
    .order('fecha_inicio', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function actualizarMiPerfil(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.enfermero_id) throw new Error('No tienes un perfil de enfermero vinculado')

  const especialidades = (formData.get('especialidades') as string)
    .split('\n').map(s => s.trim()).filter(Boolean)

  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('enfermeros')
    .update({
      telefono: formData.get('telefono') as string,
      bio: formData.get('bio') as string || null,
      especialidades,
      disponible: formData.get('disponible') === 'true',
    })
    .eq('id', perfil.enfermero_id)

  if (error) throw new Error(error.message)
  revalidatePath('/enfermero/perfil')
}
