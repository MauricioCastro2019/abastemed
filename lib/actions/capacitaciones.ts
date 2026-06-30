'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ModuloCapacitacion, ProgresoCapacitacion } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

// Resuelve el enfermero_id del usuario actual.
// Primero busca en perfiles.enfermero_id; si no está, busca en enfermeros por email
// y actualiza el vínculo automáticamente (igual que getMiPerfil).
async function resolveEnfermeroId(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<string | null> {
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', userId)
    .single()

  if (perfil?.enfermero_id) return perfil.enfermero_id

  // Fallback: buscar por email
  const { data: enf } = await supabase
    .from('enfermeros')
    .select('id')
    .eq('email', userEmail)
    .maybeSingle()

  if (enf?.id) {
    // Auto-link para futuras llamadas
    await supabase
      .from('perfiles')
      .update({ enfermero_id: enf.id })
      .eq('id', userId)
    return enf.id
  }

  return null
}

export async function getMisCapacitaciones(): Promise<{
  modulos: ModuloCapacitacion[]
  progresos: ProgresoCapacitacion[]
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { modulos: [], progresos: [] }

  const enfermeroId = await resolveEnfermeroId(supabase, user.id, user.email ?? '')

  const [modulosResult, progresosResult] = await Promise.all([
    supabase
      .from('modulos_capacitacion')
      .select('*, competencia:competencias(id, nombre, categoria)')
      .eq('activo', true)
      .order('obligatorio', { ascending: false })
      .order('orden', { ascending: true }),

    enfermeroId
      ? supabase
          .from('progreso_capacitacion')
          .select('*')
          .eq('enfermero_id', enfermeroId)
      : Promise.resolve({ data: [] }),
  ])

  return {
    modulos: (modulosResult.data ?? []) as ModuloCapacitacion[],
    progresos: (progresosResult.data ?? []) as ProgresoCapacitacion[],
  }
}

export async function getModuloConProgreso(moduloId: string): Promise<{
  modulo: ModuloCapacitacion | null
  progreso: ProgresoCapacitacion | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { modulo: null, progreso: null }

  const enfermeroId = await resolveEnfermeroId(supabase, user.id, user.email ?? '')

  const [moduloResult, progresoResult] = await Promise.all([
    supabase
      .from('modulos_capacitacion')
      .select('*, competencia:competencias(*)')
      .eq('id', moduloId)
      .single(),

    enfermeroId
      ? supabase
          .from('progreso_capacitacion')
          .select('*')
          .eq('modulo_id', moduloId)
          .eq('enfermero_id', enfermeroId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    modulo: moduloResult.data as ModuloCapacitacion | null,
    progreso: progresoResult.data as ProgresoCapacitacion | null,
  }
}

export async function iniciarModulo(moduloId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const enfermeroId = await resolveEnfermeroId(supabase, user.id, user.email ?? '')
  if (!enfermeroId) return { ok: false, error: 'Perfil de enfermero no encontrado. Contacta al administrador.' }

  const { error } = await supabase
    .from('progreso_capacitacion')
    .upsert({
      enfermero_id: enfermeroId,
      modulo_id: moduloId,
      estado: 'en_progreso',
      progreso_pct: 10,
      iniciado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'enfermero_id,modulo_id', ignoreDuplicates: false })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/enfermero/capacitaciones')
  revalidatePath('/enfermero/dashboard')
  return { ok: true }
}

export async function completarModulo(
  moduloId: string,
  respuestas: number[],
  evaluacion: { pregunta: string; opciones: string[]; respuesta_correcta: number }[]
): Promise<{ ok: boolean; score: number; aprobado: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, score: 0, aprobado: false, error: 'No autenticado' }

  const enfermeroId = await resolveEnfermeroId(supabase, user.id, user.email ?? '')
  if (!enfermeroId) return { ok: false, score: 0, aprobado: false, error: 'Perfil de enfermero no encontrado. Contacta al administrador.' }

  // Calcular score
  let correctas = 0
  for (let i = 0; i < evaluacion.length; i++) {
    if (respuestas[i] === evaluacion[i].respuesta_correcta) correctas++
  }
  const score = evaluacion.length > 0
    ? Math.round((correctas / evaluacion.length) * 100)
    : 100
  const aprobado = score >= 70

  const ahora = new Date().toISOString()

  // Verificar progreso anterior para conteo de intentos
  const { data: progresoActual } = await supabase
    .from('progreso_capacitacion')
    .select('intentos')
    .eq('modulo_id', moduloId)
    .eq('enfermero_id', enfermeroId)
    .maybeSingle()

  const intentos = (progresoActual?.intentos ?? 0) + 1

  const { error } = await supabase
    .from('progreso_capacitacion')
    .upsert({
      enfermero_id: enfermeroId,
      modulo_id: moduloId,
      estado: aprobado ? 'aprobado' : 'completado',
      progreso_pct: 100,
      score,
      intentos,
      completado_at: ahora,
      aprobado_at: aprobado ? ahora : null,
      updated_at: ahora,
    }, { onConflict: 'enfermero_id,modulo_id', ignoreDuplicates: false })

  if (error) return { ok: false, score, aprobado, error: error.message }

  // Si aprobó y el módulo tiene competencia asociada, actualizar estado de competencia
  if (aprobado) {
    const { data: modulo } = await supabase
      .from('modulos_capacitacion')
      .select('competencia_id')
      .eq('id', moduloId)
      .single()

    if (modulo?.competencia_id) {
      await supabase
        .from('enfermero_competencias')
        .upsert({
          enfermero_id: enfermeroId,
          competencia_id: modulo.competencia_id,
          estado: 'evaluacion_aprobada',
          modulo_completado_at: ahora,
          evaluacion_score: score,
          updated_at: ahora,
        }, { onConflict: 'enfermero_id,competencia_id', ignoreDuplicates: false })
    }
  }

  revalidatePath('/enfermero/capacitaciones')
  revalidatePath('/enfermero/dashboard')
  revalidatePath('/enfermero/competencias')
  return { ok: true, score, aprobado }
}
