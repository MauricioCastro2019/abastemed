'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/actions/utils'
import type { Notificacion } from '@/types'

export async function getNotificaciones(soloNoLeidas = false): Promise<Notificacion[]> {
  const { supabase, user } = await requireAuth()

  let query = supabase
    .from('notificaciones')
    .select('*')
    .eq('perfil_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (soloNoLeidas) {
    query = query.eq('leida', false)
  }

  const { data } = await query
  return (data ?? []) as Notificacion[]
}

export async function getConteoNoLeidas(): Promise<number> {
  const { supabase, user } = await requireAuth()

  const { count } = await supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('perfil_id', user.id)
    .eq('leida', false)

  return count ?? 0
}

export async function marcarLeida(id: string): Promise<void> {
  const { supabase, user } = await requireAuth()

  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id)
    .eq('perfil_id', user.id)

  revalidatePath('/enfermero/notificaciones')
  revalidatePath('/enfermero/dashboard')
}

export async function marcarTodasLeidas(): Promise<void> {
  const { supabase, user } = await requireAuth()

  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('perfil_id', user.id)
    .eq('leida', false)

  revalidatePath('/enfermero/notificaciones')
  revalidatePath('/enfermero/dashboard')
}
