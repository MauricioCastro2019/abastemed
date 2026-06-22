'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, fdBool, type ActionResult } from './utils'
import type { KardexMedicamento } from '@/types'

export async function getKardexByCaso(casoId: string): Promise<KardexMedicamento[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('kardex_medicamentos')
    .select('*')
    .eq('caso_id', casoId)
    .order('estatus', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as KardexMedicamento[]
}

export async function getKardexActivo(casoId: string): Promise<KardexMedicamento[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('kardex_medicamentos')
    .select('*')
    .eq('caso_id', casoId)
    .eq('estatus', 'activo')
    .order('nombre', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as KardexMedicamento[]
}

export async function crearKardexMed(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const casoId = fd(formData, 'caso_id')
  const nombre = fd(formData, 'nombre')
  if (!casoId || !nombre) return { error: 'Caso y nombre son requeridos' }

  const horariosRaw = fd(formData, 'horarios')
  const horarios = horariosRaw
    ? horariosRaw.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const { error } = await supabase.from('kardex_medicamentos').insert({
    caso_id:      casoId,
    nombre,
    presentacion: fd(formData, 'presentacion') || null,
    dosis:        fd(formData, 'dosis')        || null,
    via:          fd(formData, 'via')          || null,
    frecuencia:   fd(formData, 'frecuencia')   || null,
    horarios,
    fecha_inicio: fd(formData, 'fecha_inicio') || null,
    medico:       fd(formData, 'medico')       || null,
    motivo:       fd(formData, 'motivo')       || null,
    estatus:      fd(formData, 'estatus')      || 'activo',
    existencia_domicilio: fdBool(formData, 'existencia_domicilio'),
    observaciones: fd(formData, 'observaciones') || null,
    creado_por:   perfil.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/casos/${casoId}/kardex`)
  return {}
}

export async function actualizarKardexMed(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const horariosRaw = fd(formData, 'horarios')
  const horarios = horariosRaw
    ? horariosRaw.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const { error } = await supabase.from('kardex_medicamentos').update({
    nombre:        fd(formData, 'nombre'),
    presentacion:  fd(formData, 'presentacion')  || null,
    dosis:         fd(formData, 'dosis')         || null,
    via:           fd(formData, 'via')           || null,
    frecuencia:    fd(formData, 'frecuencia')    || null,
    horarios,
    fecha_inicio:  fd(formData, 'fecha_inicio')  || null,
    fecha_suspension: fd(formData, 'fecha_suspension') || null,
    medico:        fd(formData, 'medico')        || null,
    motivo:        fd(formData, 'motivo')        || null,
    estatus:       fd(formData, 'estatus')       || 'activo',
    existencia_domicilio: fdBool(formData, 'existencia_domicilio'),
    observaciones: fd(formData, 'observaciones') || null,
  }).eq('id', id)

  if (error) return { error: error.message }

  const casoId = fd(formData, 'caso_id')
  revalidatePath(`/casos/${casoId}/kardex`)
  return {}
}

export async function suspenderKardexMed(id: string, casoId: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { error } = await supabase
    .from('kardex_medicamentos')
    .update({ estatus: 'suspendido', fecha_suspension: new Date().toISOString().split('T')[0] })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/casos/${casoId}/kardex`)
  return {}
}
