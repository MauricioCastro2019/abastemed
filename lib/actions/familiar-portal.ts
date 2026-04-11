'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMiCaso() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('paciente_id, nombre, apellido')
    .eq('id', user.id)
    .single()

  if (!perfil?.paciente_id) return { perfil, paciente: null, caso: null, turnos: [] }

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', perfil.paciente_id)
    .single()

  const { data: caso } = await supabase
    .from('casos')
    .select('*')
    .eq('paciente_id', perfil.paciente_id)
    .eq('status', 'activo')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let turnos: unknown[] = []
  if (caso) {
    const { data } = await supabase
      .from('turnos')
      .select('*, enfermero:enfermeros(nombre, apellido, telefono, especialidades, rating)')
      .eq('caso_id', caso.id)
      .neq('status', 'completado')
      .order('fecha_inicio', { ascending: true })
      .limit(10)
    turnos = data ?? []
  }

  return { perfil, paciente, caso, turnos }
}
