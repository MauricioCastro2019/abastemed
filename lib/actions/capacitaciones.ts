'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcularAprobacion, calcularOtorgamiento } from './competencias/otorgamiento'
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
  perfilNombre: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { modulo: null, progreso: null, perfilNombre: null }

  const enfermeroId = await resolveEnfermeroId(supabase, user.id, user.email ?? '')

  const [moduloResult, progresoResult, perfilResult] = await Promise.all([
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

    supabase
      .from('perfiles')
      .select('nombre, apellido')
      .eq('id', user.id)
      .single(),
  ])

  const perfil = perfilResult.data as { nombre: string | null; apellido: string | null } | null
  const perfilNombre = perfil ? [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') || null : null

  return {
    modulo: moduloResult.data as ModuloCapacitacion | null,
    progreso: progresoResult.data as ProgresoCapacitacion | null,
    perfilNombre,
  }
}

export async function actualizarLeccionActual(
  moduloId: string,
  leccionIdx: number,
  totalLecciones: number
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const enfermeroId = await resolveEnfermeroId(supabase, user.id, user.email ?? '')
  if (!enfermeroId) return { ok: false, error: 'Perfil de enfermero no encontrado. Contacta al administrador.' }

  // Progreso de contenido acotado a 10–90%: el resto (checklist + evaluación)
  // se completa en completarModulo(). Evita que avanzar lecciones marque el
  // módulo como terminado antes de aprobar la evaluación.
  const progresoPct = totalLecciones > 0
    ? Math.min(90, 10 + Math.round((80 * (leccionIdx + 1)) / totalLecciones))
    : 10

  const { error } = await supabase
    .from('progreso_capacitacion')
    .upsert({
      enfermero_id: enfermeroId,
      modulo_id: moduloId,
      estado: 'en_progreso',
      leccion_actual: leccionIdx,
      progreso_pct: progresoPct,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'enfermero_id,modulo_id', ignoreDuplicates: false })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
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
): Promise<{ ok: boolean; score: number; aprobado: boolean; progresoId?: string; aprobadoAt?: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, score: 0, aprobado: false, error: 'No autenticado' }

  const enfermeroId = await resolveEnfermeroId(supabase, user.id, user.email ?? '')
  if (!enfermeroId) return { ok: false, score: 0, aprobado: false, error: 'Perfil de enfermero no encontrado. Contacta al administrador.' }

  // Traer el módulo (con umbral de aprobación y competencia asociada) antes
  // de calcular si aprobó — el umbral es configurable por módulo.
  const { data: modulo } = await supabase
    .from('modulos_capacitacion')
    .select('competencia_id, evaluacion_minima, competencia:competencias(requiere_validacion_practica, vigencia_meses, version)')
    .eq('id', moduloId)
    .single()

  type CompetenciaJoin = { requiere_validacion_practica: boolean; vigencia_meses: number | null; version: number }
  const competenciaJoin = (modulo?.competencia ?? null) as unknown as CompetenciaJoin | CompetenciaJoin[] | null
  const competencia = Array.isArray(competenciaJoin) ? competenciaJoin[0] ?? null : competenciaJoin

  // Calcular score
  let correctas = 0
  for (let i = 0; i < evaluacion.length; i++) {
    if (respuestas[i] === evaluacion[i].respuesta_correcta) correctas++
  }
  const score = evaluacion.length > 0
    ? Math.round((correctas / evaluacion.length) * 100)
    : 100
  const aprobado = calcularAprobacion(score, modulo?.evaluacion_minima ?? 70)

  const ahora = new Date().toISOString()

  // Verificar progreso anterior para conteo de intentos
  const { data: progresoActual } = await supabase
    .from('progreso_capacitacion')
    .select('intentos')
    .eq('modulo_id', moduloId)
    .eq('enfermero_id', enfermeroId)
    .maybeSingle()

  const intentos = (progresoActual?.intentos ?? 0) + 1

  const { data: progresoActualizado, error } = await supabase
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
    .select('id')
    .single()

  if (error) return { ok: false, score, aprobado, error: error.message }

  // Si aprobó y el módulo tiene competencia asociada, actualizar estado de
  // competencia + estampar otorgamiento (fecha_otorgada/fecha_caducidad) si
  // esta aprobación ya es el estado terminal (competencias que no requieren
  // validación práctica).
  if (aprobado && modulo?.competencia_id && competencia) {
    const otorgamiento = calcularOtorgamiento(
      {
        requiereValidacionPractica: competencia.requiere_validacion_practica,
        vigenciaMeses: competencia.vigencia_meses,
        version: competencia.version,
      },
      'evaluacion_aprobada'
    )

    await supabase
      .from('enfermero_competencias')
      .upsert({
        enfermero_id: enfermeroId,
        competencia_id: modulo.competencia_id,
        estado: 'evaluacion_aprobada',
        modulo_completado_at: ahora,
        evaluacion_score: score,
        origen: 'curso',
        modulo_id_origen: moduloId,
        fecha_otorgada: otorgamiento.fechaOtorgada,
        fecha_caducidad: otorgamiento.fechaCaducidad,
        version_otorgada: otorgamiento.versionOtorgada,
        estado_vigencia: 'vigente',
        updated_at: ahora,
      }, { onConflict: 'enfermero_id,competencia_id', ignoreDuplicates: false })
  }

  revalidatePath('/enfermero/capacitaciones')
  revalidatePath('/enfermero/dashboard')
  revalidatePath('/enfermero/competencias')
  return { ok: true, score, aprobado, progresoId: progresoActualizado?.id, aprobadoAt: aprobado ? ahora : null }
}
