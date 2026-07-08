'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, zodActionError, type ActionResult } from '../utils'
import { OtorgarCompetenciaManualSchema, RevocarCompetenciaSchema } from '@/lib/validations'
import { calcularOtorgamiento } from './otorgamiento'
import type { EnfermeroCompetencia } from '@/types'

export async function getCompetenciasPorEnfermero(enfermeroId: string): Promise<EnfermeroCompetencia[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('enfermero_competencias')
    .select('*, competencia:competencias(*)')
    .eq('enfermero_id', enfermeroId)

  if (error) throw new Error(error.message)
  return (data ?? []) as EnfermeroCompetencia[]
}

// Otorgamiento manual: requiere justificación auditable (Zod exige
// mínimo 10 caracteres). No pasa por el motor de cursos — coordinación
// certifica directamente (ej. certificación externa, experiencia previa).
export async function otorgarCompetenciaManual(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const parsed = OtorgarCompetenciaManualSchema.safeParse({
    enfermero_id:    fd(formData, 'enfermero_id'),
    competencia_id:  fd(formData, 'competencia_id'),
    justificacion:   fd(formData, 'justificacion'),
    certificado_url: fd(formData, 'certificado_url'),
    notas:           fd(formData, 'notas'),
  })

  if (!parsed.success) return zodActionError(parsed.error)
  const v = parsed.data

  const { data: competencia, error: compError } = await supabase
    .from('competencias')
    .select('requiere_validacion_practica, vigencia_meses, version')
    .eq('id', v.competencia_id)
    .single()

  if (compError || !competencia) return { error: 'Competencia no encontrada' }

  const estadoAlcanzado = competencia.requiere_validacion_practica ? 'validado' : 'evaluacion_aprobada'
  const otorgamiento = calcularOtorgamiento(
    {
      requiereValidacionPractica: competencia.requiere_validacion_practica,
      vigenciaMeses: competencia.vigencia_meses,
      version: competencia.version,
    },
    estadoAlcanzado
  )

  const ahora = new Date().toISOString()

  const { error } = await supabase
    .from('enfermero_competencias')
    .upsert({
      enfermero_id:     v.enfermero_id,
      competencia_id:   v.competencia_id,
      estado:           estadoAlcanzado,
      origen:           'manual',
      otorgada_por:     perfil.id,
      justificacion:    v.justificacion,
      certificado_url:  v.certificado_url || null,
      notas:            v.notas || null,
      fecha_otorgada:   otorgamiento.fechaOtorgada,
      fecha_caducidad:  otorgamiento.fechaCaducidad,
      version_otorgada: otorgamiento.versionOtorgada,
      estado_vigencia:  'vigente',
      validado_por:     estadoAlcanzado === 'validado' ? perfil.id : null,
      validado_at:      estadoAlcanzado === 'validado' ? ahora : null,
      updated_at:       ahora,
    }, { onConflict: 'enfermero_id,competencia_id', ignoreDuplicates: false })

  if (error) return { error: error.message }

  revalidatePath(`/enfermeros/${v.enfermero_id}`)
  revalidatePath('/enfermero/competencias')
  return {}
}

// Revocación: motivo obligatorio, genera registro de auditoría en
// competencia_revocaciones. No borra el otorgamiento — solo lo
// marca como no vigente para el gate de asignación.
export async function revocarCompetencia(
  enfermeroCompetenciaId: string,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const parsed = RevocarCompetenciaSchema.safeParse({
    motivo: fd(formData, 'motivo'),
  })

  if (!parsed.success) return zodActionError(parsed.error)
  const v = parsed.data

  const { data: existente, error: findError } = await supabase
    .from('enfermero_competencias')
    .select('id, enfermero_id')
    .eq('id', enfermeroCompetenciaId)
    .single()

  if (findError || !existente) return { error: 'Competencia otorgada no encontrada' }

  const { error: updateError } = await supabase
    .from('enfermero_competencias')
    .update({ estado_vigencia: 'revocada', updated_at: new Date().toISOString() })
    .eq('id', enfermeroCompetenciaId)

  if (updateError) return { error: updateError.message }

  const { error: revocacionError } = await supabase
    .from('competencia_revocaciones')
    .insert({
      enfermero_competencia_id: enfermeroCompetenciaId,
      revocada_por: perfil.id,
      motivo: v.motivo,
    })

  if (revocacionError) return { error: revocacionError.message }

  revalidatePath(`/enfermeros/${existente.enfermero_id}`)
  revalidatePath('/enfermero/competencias')
  return {}
}

// Marca como 'caducada' las competencias vigentes cuya fecha_caducidad
// ya pasó. No hay scheduler en el repo — ver README de este módulo
// para cómo dispararla (botón admin o cron externo).
export async function marcarCompetenciasCaducadas(): Promise<{ actualizadas: number; error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin')

  const { data, error } = await supabase
    .from('enfermero_competencias')
    .update({ estado_vigencia: 'caducada', updated_at: new Date().toISOString() })
    .eq('estado_vigencia', 'vigente')
    .not('fecha_caducidad', 'is', null)
    .lte('fecha_caducidad', new Date().toISOString())
    .select('id')

  if (error) return { actualizadas: 0, error: error.message }

  revalidatePath('/enfermero/competencias')
  return { actualizadas: (data ?? []).length }
}
