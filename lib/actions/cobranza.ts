'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCobranza() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cobranza_items')
    .select(`
      *,
      caso:casos(id, titulo),
      turno:turnos(id, fecha_inicio, fecha_fin, enfermero:enfermeros(nombre, apellido))
    `)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function marcarPagado(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('cobranza_items')
    .update({ status: 'pagado' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/cobranza')
  revalidatePath('/dashboard')
}
