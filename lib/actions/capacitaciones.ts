'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ModuloCapacitacion, ProgresoCapacitacion } from '@/types'

export async function getMisCapacitaciones(): Promise<{
  modulos: ModuloCapacitacion[]
  progresos: ProgresoCapacitacion[]
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { modulos: [], progresos: [] }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', user.id)
    .single()

  const [modulosResult, progresosResult] = await Promise.all([
    supabase
      .from('modulos_capacitacion')
      .select('*, competencia:competencias(id, nombre, categoria)')
      .eq('activo', true)
      .order('obligatorio', { ascending: false })
      .order('orden', { ascending: true }),

    perfil?.enfermero_id
      ? supabase
          .from('progreso_capacitacion')
          .select('*')
          .eq('enfermero_id', perfil.enfermero_id)
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

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', user.id)
    .single()

  const [moduloResult, progresoResult] = await Promise.all([
    supabase
      .from('modulos_capacitacion')
      .select('*, competencia:competencias(*)')
      .eq('id', moduloId)
      .single(),

    perfil?.enfermero_id
      ? supabase
          .from('progreso_capacitacion')
          .select('*')
          .eq('modulo_id', moduloId)
          .eq('enfermero_id', perfil.enfermero_id)
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

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.enfermero_id) return { ok: false, error: 'Perfil de enfermero no encontrado' }

  const { error } = await supabase
    .from('progreso_capacitacion')
    .upsert({
      enfermero_id: perfil.enfermero_id,
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

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.enfermero_id) return { ok: false, score: 0, aprobado: false, error: 'Perfil no encontrado' }

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
    .eq('enfermero_id', perfil.enfermero_id)
    .maybeSingle()

  const intentos = (progresoActual?.intentos ?? 0) + 1

  const { error } = await supabase
    .from('progreso_capacitacion')
    .upsert({
      enfermero_id: perfil.enfermero_id,
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
          enfermero_id: perfil.enfermero_id,
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
