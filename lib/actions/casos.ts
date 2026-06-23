'use server'

import { revalidatePath } from 'next/cache'
import type { Caso, PerfilUsuario } from '@/types'
import { requireAuth, requireRole, fd, fdNum, zodActionError, DEFAULT_ORG_ID, type ActionResult } from './utils'
import { CasoSchema } from '@/lib/validations'

export async function getCasos(search?: string) {
  const { supabase } = await requireAuth()
  let query = supabase
    .from('casos')
    .select(`
      *,
      paciente:pacientes(id, nombre, apellido, contexto),
      coordinador:perfiles!coordinador_id(id, nombre, apellido)
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
      paciente:pacientes(*),
      coordinador:perfiles!coordinador_id(id, nombre, apellido)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Caso
}

export async function getCoordinadores(): Promise<PerfilUsuario[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, apellido, rol, email, telefono, foto_url, enfermero_id, paciente_id, created_at')
    .eq('rol', 'coordinador')
    .order('nombre')
  if (error) throw new Error(error.message)
  return (data ?? []) as PerfilUsuario[]
}

export async function asignarCoordinador(casoId: string, coordinadorId: string | null): Promise<ActionResult> {
  try {
    const { supabase, perfil } = await requireAuth()
    requireRole(perfil, 'admin')

    const { error } = await supabase
      .from('casos')
      .update({ coordinador_id: coordinadorId })
      .eq('id', casoId)

    if (error) return { error: error.message }

    revalidatePath('/casos')
    revalidatePath(`/casos/${casoId}`)
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error inesperado al asignar coordinador.' }
  }
}

export async function crearCaso(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, perfil } = await requireAuth()
    requireRole(perfil, 'admin', 'coordinador')

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

    // Coordinador se auto-asigna; admin puede elegir coordinador del form
    const coordinadorId = perfil.rol === 'coordinador'
      ? perfil.id
      : (fd(formData, 'coordinador_id') || null)

    const { error } = await supabase.from('casos').insert({
      paciente_id:     v.paciente_id,
      titulo:          v.titulo,
      contexto:        v.contexto,
      direccion:       v.direccion,
      fecha_inicio:    v.fecha_inicio,
      fecha_fin:       fd(formData, 'fecha_fin') || null,
      tarifa_hora:     v.horas_turno > 0 ? +(v.costo_guardia / v.horas_turno).toFixed(2) : 0,
      costo_guardia:   v.costo_guardia,
      horas_turno:     v.horas_turno,
      dias_semana:     diasRaw,
      horario_inicio:  fd(formData, 'horario_inicio') || null,
      horario_fin:     fd(formData, 'horario_fin') || null,
      notas:           fd(formData, 'notas') || null,
      status:          'activo',
      organization_id: DEFAULT_ORG_ID,
      coordinador_id:  coordinadorId,
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
    requireRole(perfil, 'admin', 'coordinador')

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

    const updateData: Record<string, unknown> = {
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
    }

    // Solo admin puede reasignar coordinador desde el formulario de edición
    if (perfil.rol === 'admin') {
      updateData.coordinador_id = fd(formData, 'coordinador_id') || null
    }

    const { error } = await supabase.from('casos').update(updateData).eq('id', id)

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
    if (error.code === '23503') {
      return { error: 'TIENE_DEPENDENCIAS' }
    }
    return { error: error.message }
  }
  revalidatePath('/casos')
  revalidatePath('/dashboard')
  return {}
}

export async function eliminarCasoForzado(id: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  // Anular referencias en bitácora (FK nullable sin ON DELETE)
  await supabase.from('bitacora').update({ caso_id: null }).eq('caso_id', id)

  // Borrar en orden para respetar FKs RESTRICT
  await supabase.from('reportes_turno').delete().eq('caso_id', id)
  await supabase.from('cobranza_items').delete().eq('caso_id', id)
  await supabase.from('turnos').delete().eq('caso_id', id)

  // Borrar el caso (ON DELETE CASCADE limpia: kardex, incidencias, insumos_usados)
  const { error } = await supabase.from('casos').delete().eq('id', id)
  if (error) return { error: error.message }

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
  requireRole(perfil, 'admin', 'coordinador')

  const { error } = await supabase
    .from('casos')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/casos')
  revalidatePath(`/casos/${id}`)
  revalidatePath('/dashboard')
}
