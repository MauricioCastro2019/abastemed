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
  try {
    const { supabase, perfil } = await requireAuth()
    requireRole(perfil, 'admin', 'jefe_enfermeros')

    const horasTurno = fdNum(formData, 'horas_turno') || 8
    const costoGuardia = fdNum(formData, 'costo_guardia')

    const parsed = CasoSchema.safeParse({
      paciente_id:   fd(formData, 'paciente_id'),
      titulo:        fd(formData, 'titulo'),
      contexto:      fd(formData, 'contexto'),
      direccion:     fd(formData, 'direccion'),
      fecha_inicio:  fd(formData, 'fecha_inicio'),
      costo_guardia: costoGuardia,
      horas_turno:   horasTurno,
    })

    if (!parsed.success) return zodActionError(parsed.error)

    const v = parsed.data
    const diasRaw = formData.getAll('dias_semana') as string[]

    const { error } = await supabase.from('casos').insert({
      paciente_id:    v.paciente_id,
      titulo:         v.titulo,
      contexto:       v.contexto,
      direccion:      v.direccion,
      fecha_inicio:   v.fecha_inicio,
      fecha_fin:      fd(formData, 'fecha_fin') || null,
      tarifa_hora:    v.horas_turno > 0 ? +(v.costo_guardia / v.horas_turno).toFixed(2) : 0,
      costo_guardia:  v.costo_guardia,
      horas_turno:    v.horas_turno,
      dias_semana:    diasRaw,
      horario_inicio: fd(formData, 'horario_inicio') || null,
      horario_fin:    fd(formData, 'horario_fin') || null,
      notas:          fd(formData, 'notas') || null,
      status:         'activo',
    })

    if (error) return { error: error.message }

    revalidatePath('/casos')
    revalidatePath('/dashboard')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error inesperado al crear el caso.' }
  }
}

export async function actualizarCaso(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, perfil } = await requireAuth()
    requireRole(perfil, 'admin', 'jefe_enfermeros')

    const horasTurnoU = fdNum(formData, 'horas_turno') || 8
    const costoGuardiaU = fdNum(formData, 'costo_guardia')

    const parsed = CasoSchema.safeParse({
      paciente_id:   fd(formData, 'paciente_id'),
      titulo:        fd(formData, 'titulo'),
      contexto:      fd(formData, 'contexto'),
      direccion:     fd(formData, 'direccion'),
      fecha_inicio:  fd(formData, 'fecha_inicio'),
      costo_guardia: costoGuardiaU,
      horas_turno:   horasTurnoU,
    })

    if (!parsed.success) return zodActionError(parsed.error)

    const v = parsed.data
    const diasRawU = formData.getAll('dias_semana') as string[]

    const { error } = await supabase.from('casos').update({
      paciente_id:    v.paciente_id,
      titulo:         v.titulo,
      contexto:       v.contexto,
      direccion:      v.direccion,
      fecha_inicio:   v.fecha_inicio,
      fecha_fin:      fd(formData, 'fecha_fin') || null,
      tarifa_hora:    v.horas_turno > 0 ? +(v.costo_guardia / v.horas_turno).toFixed(2) : 0,
      costo_guardia:  v.costo_guardia,
      horas_turno:    v.horas_turno,
      dias_semana:    diasRawU,
      horario_inicio: fd(formData, 'horario_inicio') || null,
      horario_fin:    fd(formData, 'horario_fin') || null,
      notas:          fd(formData, 'notas') || null,
      status:         fd(formData, 'status') || 'activo',
    }).eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/casos')
    revalidatePath(`/casos/${id}`)
    revalidatePath('/dashboard')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error inesperado al actualizar el caso.' }
  }
}

export async function eliminarCaso(id: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { error } = await supabase.from('casos').delete().eq('id', id)
  if (error) {
    // FK RESTRICT: hay turnos u otros registros vinculados
    if (error.code === '23503') {
      return { error: 'No se puede eliminar este caso porque tiene turnos, cobranzas u otros registros vinculados. Ciérralo en lugar de eliminarlo.' }
    }
    return { error: error.message }
  }
  revalidatePath('/casos')
  revalidatePath('/dashboard')
  return {}
}

export async function getCasosByPaciente(pacienteId: string): Promise<Caso[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('casos')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Caso[]
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
