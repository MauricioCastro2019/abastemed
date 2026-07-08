'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, fdNum, zodActionError, type ActionResult } from '../utils'
import { CompetenciaSchema, PublicarCompetenciaSchema } from '@/lib/validations'
import type { Competencia } from '@/types'

export async function getCompetenciasCatalogo(soloActivas = false): Promise<Competencia[]> {
  const { supabase } = await requireAuth()

  let query = supabase.from('competencias').select('*').order('orden')
  if (soloActivas) query = query.eq('activa', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Competencia[]
}

export async function crearCompetencia(formData: FormData): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const codigo = fd(formData, 'codigo')
  const vigenciaMesesRaw = fd(formData, 'vigencia_meses')

  const parsed = CompetenciaSchema.safeParse({
    nombre:      fd(formData, 'nombre'),
    descripcion: fd(formData, 'descripcion'),
    categoria:   fd(formData, 'categoria'),
    codigo,
    vigencia_meses: vigenciaMesesRaw ? fdNum(formData, 'vigencia_meses') : null,
    requiere_validacion_practica: formData.get('requiere_validacion_practica') === 'true',
    notas: fd(formData, 'notas'),
  })

  if (!parsed.success) return zodActionError(parsed.error)
  const v = parsed.data

  const { data, error } = await supabase
    .from('competencias')
    .insert({
      nombre:      v.nombre,
      descripcion: v.descripcion || null,
      categoria:   v.categoria,
      codigo:      v.codigo || null,
      vigencia_meses: v.vigencia_meses ?? null,
      requiere_validacion_practica: v.requiere_validacion_practica ?? false,
      notas:       v.notas || null,
      activa:      false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/enfermeros')
  return { id: data.id }
}

export async function actualizarCompetencia(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const codigo = fd(formData, 'codigo')
  const vigenciaMesesRaw = fd(formData, 'vigencia_meses')

  const parsed = CompetenciaSchema.safeParse({
    nombre:      fd(formData, 'nombre'),
    descripcion: fd(formData, 'descripcion'),
    categoria:   fd(formData, 'categoria'),
    codigo,
    vigencia_meses: vigenciaMesesRaw ? fdNum(formData, 'vigencia_meses') : null,
    requiere_validacion_practica: formData.get('requiere_validacion_practica') === 'true',
    notas: fd(formData, 'notas'),
  })

  if (!parsed.success) return zodActionError(parsed.error)
  const v = parsed.data

  const { error } = await supabase
    .from('competencias')
    .update({
      nombre:      v.nombre,
      descripcion: v.descripcion || null,
      categoria:   v.categoria,
      codigo:      v.codigo || null,
      vigencia_meses: v.vigencia_meses ?? null,
      requiere_validacion_practica: v.requiere_validacion_practica ?? false,
      notas:       v.notas || null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/enfermeros')
  return {}
}

// Publica una competencia (y su módulo de capacitación vinculado)
// exigiendo que la firma clínica esté registrada. Antes de esto la
// competencia queda en DRAFT (activa=false) y no aparece en ningún
// catálogo ni puede requerirse a pacientes.
export async function publicarCompetencia(competenciaId: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const parsed = PublicarCompetenciaSchema.safeParse({
    firmada_por:        fd(formData, 'firmada_por'),
    cedula_responsable: fd(formData, 'cedula_responsable'),
    fecha_firma:        fd(formData, 'fecha_firma'),
  })

  if (!parsed.success) return zodActionError(parsed.error)
  const v = parsed.data

  const { error } = await supabase
    .from('competencias')
    .update({
      firmada_por:        v.firmada_por,
      cedula_responsable: v.cedula_responsable,
      fecha_firma:        v.fecha_firma,
      activa:              true,
    })
    .eq('id', competenciaId)

  if (error) return { error: error.message }

  await supabase
    .from('modulos_capacitacion')
    .update({ activo: true })
    .eq('competencia_id', competenciaId)

  revalidatePath('/enfermeros')
  revalidatePath('/enfermero/capacitaciones')
  revalidatePath('/enfermero/competencias')
  return {}
}

export async function archivarCompetencia(id: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const { error } = await supabase
    .from('competencias')
    .update({ activa: false })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/enfermeros')
  revalidatePath('/enfermero/competencias')
  return {}
}
