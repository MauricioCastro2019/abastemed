'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/actions/utils'
import { calcularOtorgamiento } from '@/lib/actions/competencias/otorgamiento'
import type {
  NivelProfesional,
  EstadisticasProfesionales,
  CentroProfesionalData,
  ModuloCapacitacion,
  ProgresoCapacitacion,
  EnfermeroCompetencia,
  Competencia,
} from '@/types'

const MENSAJES_CULTURALES = [
  'Hoy no solo cubres una guardia. Hoy das tranquilidad a una familia y continuidad al cuidado de una persona.',
  'Cuidar también es dar tranquilidad.',
  'Cada registro correcto protege al paciente, a la familia y al enfermero.',
  'La continuidad del cuidado depende de la claridad con la que entregas tu turno.',
  'No solo estás presente: estás sosteniendo una parte importante de la vida de alguien.',
  'La excelencia se nota en los detalles pequeños.',
  'Un buen enfermero no improvisa; observa, registra y comunica.',
  'Lo que no se registra, no puede evaluarse, mejorarse ni respaldarse.',
  'Cada familia que recibes confía en que lo darás todo.',
  'La preparación de hoy es la seguridad del paciente mañana.',
]

function getMensajeCultural(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return MENSAJES_CULTURALES[dayOfYear % MENSAJES_CULTURALES.length]
}

function computeNivelActual(
  niveles: NivelProfesional[],
  stats: EstadisticasProfesionales
): {
  nivel: NivelProfesional
  siguiente: NivelProfesional | null
  progreso_pct: number
} {
  const sorted = [...niveles].sort((a, b) => b.orden - a.orden)

  let nivelActual = niveles.find(n => n.orden === 1) ?? niveles[0]

  for (const nivel of sorted) {
    const cumpleHoras      = stats.horas_acumuladas >= nivel.horas_minimas
    const cumpleGuardias   = stats.guardias_completadas >= nivel.guardias_minimas
    const cumpleRating     = nivel.evaluacion_minima === 0 || stats.promedio_rating >= nivel.evaluacion_minima
    const cumpleCompetencias = stats.competencias_verificadas >= nivel.competencias_minimas

    if (cumpleHoras && cumpleGuardias && cumpleRating && cumpleCompetencias) {
      nivelActual = nivel
      break
    }
  }

  const siguienteNivel = niveles.find(n => n.orden === nivelActual.orden + 1) ?? null

  let progreso_pct = 100
  if (siguienteNivel) {
    const ratios: number[] = []

    if (siguienteNivel.horas_minimas > 0) {
      ratios.push(Math.min(stats.horas_acumuladas / siguienteNivel.horas_minimas, 1))
    }
    if (siguienteNivel.guardias_minimas > 0) {
      ratios.push(Math.min(stats.guardias_completadas / siguienteNivel.guardias_minimas, 1))
    }
    if (siguienteNivel.evaluacion_minima > 0 && stats.promedio_rating > 0) {
      ratios.push(Math.min(stats.promedio_rating / siguienteNivel.evaluacion_minima, 1))
    }
    if (siguienteNivel.competencias_minimas > 0) {
      ratios.push(Math.min(stats.competencias_verificadas / siguienteNivel.competencias_minimas, 1))
    }

    progreso_pct = ratios.length > 0
      ? Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length * 100)
      : 0
  }

  return { nivel: nivelActual, siguiente: siguienteNivel, progreso_pct }
}

export async function getCentroProfesionalData(): Promise<CentroProfesionalData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Perfil + enfermero
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*, enfermero:enfermeros(*)')
    .eq('id', user.id)
    .single()

  if (!perfil) return null

  let enfermero = perfil.enfermero ?? null

  // Auto-link por email si no está vinculado
  if (!enfermero && perfil.email) {
    const { data: enf } = await supabase
      .from('enfermeros')
      .select('*')
      .eq('email', perfil.email)
      .maybeSingle()
    if (enf) {
      enfermero = enf
      await supabase.from('perfiles').update({ enfermero_id: enf.id }).eq('id', user.id)
    }
  }

  if (!enfermero) return null

  // Paralelizar queries
  const [
    turnosResult,
    nivelesResult,
    competenciasResult,
    modulosResult,
    progresoResult,
    incidenciasResult,
    reportesResult,
  ] = await Promise.allSettled([
    // Stats de turnos: horas y guardias completadas
    supabase
      .from('turnos')
      .select('id, horas_trabajadas, caso:casos(titulo, direccion, paciente:pacientes(nombre, apellido)), fecha_inicio, fecha_fin, status')
      .eq('enfermero_id', enfermero.id)
      .order('fecha_inicio', { ascending: true }),

    // Niveles profesionales
    supabase
      .from('niveles_profesionales')
      .select('*')
      .order('orden', { ascending: true }),

    // Competencias verificadas del enfermero
    supabase
      .from('enfermero_competencias')
      .select('*, competencia:competencias(*)')
      .eq('enfermero_id', enfermero.id),

    // Módulos de capacitación con competencia
    supabase
      .from('modulos_capacitacion')
      .select('*, competencia:competencias(id, nombre, categoria)')
      .eq('activo', true)
      .order('orden', { ascending: true }),

    // Progreso de capacitación del enfermero
    supabase
      .from('progreso_capacitacion')
      .select('*')
      .eq('enfermero_id', enfermero.id),

    // Incidencias críticas del enfermero
    supabase
      .from('incidencias')
      .select('id, gravedad')
      .eq('reportado_por', user.id)
      .eq('gravedad', 'critica'),

    // Reportes de turno completados
    supabase
      .from('reportes_turno')
      .select('id')
      .eq('enfermero_id', enfermero.id),
  ])

  const turnos     = turnosResult.status === 'fulfilled' ? (turnosResult.value.data ?? []) : []
  const niveles    = nivelesResult.status === 'fulfilled' ? (nivelesResult.value.data ?? []) as NivelProfesional[] : []
  const competenciasEnf = competenciasResult.status === 'fulfilled' ? (competenciasResult.value.data ?? []) as EnfermeroCompetencia[] : []
  const modulos    = modulosResult.status === 'fulfilled' ? (modulosResult.value.data ?? []) as ModuloCapacitacion[] : []
  const progresos  = progresoResult.status === 'fulfilled' ? (progresoResult.value.data ?? []) as ProgresoCapacitacion[] : []
  const incCriticas = incidenciasResult.status === 'fulfilled' ? (incidenciasResult.value.data ?? []) : []
  const reportes   = reportesResult.status === 'fulfilled' ? (reportesResult.value.data ?? []) : []

  // Calcular estadísticas
  const completados = turnos.filter((t: { status: string }) => t.status === 'completado')
  const guardias_completadas = completados.length
  const horas_acumuladas = completados.reduce((sum: number, t: { horas_trabajadas: number }) => sum + (t.horas_trabajadas || 0), 0)
  const competencias_verificadas = competenciasEnf.filter(c => c.estado === 'validado').length
  const capacitaciones_aprobadas = progresos.filter(p => p.estado === 'aprobado').length

  const estadisticas: EstadisticasProfesionales = {
    guardias_completadas,
    horas_acumuladas: Math.round(horas_acumuladas * 10) / 10,
    promedio_rating: enfermero.rating ?? 0,
    reportes_completados: reportes.length,
    incidencias_criticas: incCriticas.length,
    competencias_verificadas,
    capacitaciones_aprobadas,
  }

  // Nivel actual
  const nivelData = niveles.length > 0
    ? computeNivelActual(niveles, estadisticas)
    : { nivel: { id: 1, nombre: 'Aspirante Abastemed', orden: 1, descripcion: '', horas_minimas: 0, guardias_minimas: 0, evaluacion_minima: 0, competencias_minimas: 0, incidencias_criticas_max: 999, requiere_validacion: false, color: '#94A3B8', created_at: '' }, siguiente: null, progreso_pct: 0 }

  // Guardia activa y próxima
  const now = new Date()
  const turnosActivos   = turnos.filter((t: { status: string; fecha_inicio: string; fecha_fin: string }) => t.status === 'activo')
  const turnosProgramados = turnos.filter((t: { status: string; fecha_inicio: string }) =>
    t.status === 'programado' && new Date(t.fecha_inicio) >= now
  ).sort((a: { fecha_inicio: string }, b: { fecha_inicio: string }) =>
    new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guardia_activa   = turnosActivos[0]   as any ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proxima_guardia  = turnosProgramados[0] as any ?? null

  // Módulos obligatorios pendientes
  const modulos_obligatorios_pendientes = modulos.filter(m => {
    if (!m.obligatorio) return false
    const progreso = progresos.find(p => p.modulo_id === m.id)
    return !progreso || progreso.estado === 'no_iniciado' || progreso.estado === 'en_progreso'
  })

  // Módulos sugeridos (no completados, ordenados por relevancia)
  const modulos_sugeridos = modulos
    .filter(m => {
      const progreso = progresos.find(p => p.modulo_id === m.id)
      return !progreso || (progreso.estado !== 'aprobado' && progreso.estado !== 'completado')
    })
    .slice(0, 3)
    .map(m => ({
      ...m,
      progreso: progresos.find(p => p.modulo_id === m.id) ?? null,
    }))

  return {
    enfermero,
    nivel_actual: nivelData.nivel,
    siguiente_nivel: nivelData.siguiente,
    progreso_nivel_pct: nivelData.progreso_pct,
    estadisticas,
    proxima_guardia,
    guardia_activa,
    modulos_obligatorios_pendientes,
    modulos_sugeridos,
    mensaje_cultural: getMensajeCultural(),
  }
}

export async function getNivelesProfesionales(): Promise<NivelProfesional[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('niveles_profesionales')
    .select('*')
    .order('orden', { ascending: true })
  return (data ?? []) as NivelProfesional[]
}

export type CompetenciaConModulo = Competencia & {
  modulo?: { id: string; titulo: string; duracion_minutos: number } | null
}

export async function getMisCompetenciasCompleto(): Promise<{
  competencias: CompetenciaConModulo[]
  mis_competencias: EnfermeroCompetencia[]
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { competencias: [], mis_competencias: [] }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', user.id)
    .single()

  let enfermeroId = perfil?.enfermero_id ?? null
  if (!enfermeroId && user.email) {
    const { data: enf } = await supabase
      .from('enfermeros').select('id').eq('email', user.email).maybeSingle()
    if (enf?.id) {
      enfermeroId = enf.id
      await supabase.from('perfiles').update({ enfermero_id: enf.id }).eq('id', user.id)
    }
  }

  const [compResult, misCompResult] = await Promise.all([
    // Incluye el primer módulo activo asociado a cada competencia
    supabase
      .from('competencias')
      .select('*, modulos_capacitacion(id, titulo, duracion_minutos)')
      .eq('activa', true)
      .order('orden'),
    enfermeroId
      ? supabase.from('enfermero_competencias')
          .select('*, competencia:competencias(*)')
          .eq('enfermero_id', enfermeroId)
      : Promise.resolve({ data: [] }),
  ])

  // Aplanar: tomar el primer módulo del array
  const competencias: CompetenciaConModulo[] = (compResult.data ?? []).map((c: Competencia & { modulos_capacitacion?: { id: string; titulo: string; duracion_minutos: number }[] }) => {
    const modulos = c.modulos_capacitacion ?? []
    const { modulos_capacitacion: _, ...rest } = c as typeof c & { modulos_capacitacion?: unknown }
    return { ...rest, modulo: modulos[0] ?? null } as CompetenciaConModulo
  })

  return {
    competencias,
    mis_competencias: (misCompResult.data ?? []) as EnfermeroCompetencia[],
  }
}

// ────────────────────────────────────────────────────────────
// PARA COORDINADORES / ADMIN: competencias de un enfermero específico
// ────────────────────────────────────────────────────────────

export async function getCompetenciasDeEnfermero(enfermeroId: string): Promise<{
  competencias: CompetenciaConModulo[]
  mis_competencias: EnfermeroCompetencia[]
}> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const [compResult, misCompResult] = await Promise.all([
    supabase
      .from('competencias')
      .select('*, modulos_capacitacion(id, titulo, duracion_minutos)')
      .eq('activa', true)
      .order('orden'),
    supabase
      .from('enfermero_competencias')
      .select('*, competencia:competencias(*)')
      .eq('enfermero_id', enfermeroId),
  ])

  const competencias: CompetenciaConModulo[] = (compResult.data ?? []).map((c: Competencia & { modulos_capacitacion?: { id: string; titulo: string; duracion_minutos: number }[] }) => {
    const modulos = c.modulos_capacitacion ?? []
    const { modulos_capacitacion: _, ...rest } = c as typeof c & { modulos_capacitacion?: unknown }
    return { ...rest, modulo: modulos[0] ?? null } as CompetenciaConModulo
  })

  return {
    competencias,
    mis_competencias: (misCompResult.data ?? []) as EnfermeroCompetencia[],
  }
}

export async function validarCompetenciaEnfermero(
  enfermeroId: string,
  competenciaId: string,
  nuevoEstado: 'practica_observada' | 'validado',
  notas?: string
): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const ahora = new Date().toISOString()

  const updates: Record<string, unknown> = {
    estado: nuevoEstado,
    notas: notas ?? null,
    updated_at: ahora,
  }

  if (nuevoEstado === 'practica_observada') {
    updates.practica_observada_at = ahora
  } else if (nuevoEstado === 'validado') {
    updates.practica_observada_at = ahora
    updates.validado_por = perfil.id
    updates.validado_at = ahora

    const { data: competencia } = await supabase
      .from('competencias')
      .select('requiere_validacion_practica, vigencia_meses, version')
      .eq('id', competenciaId)
      .single()

    if (competencia) {
      const otorgamiento = calcularOtorgamiento(
        {
          requiereValidacionPractica: competencia.requiere_validacion_practica,
          vigenciaMeses: competencia.vigencia_meses,
          version: competencia.version,
        },
        'validado'
      )
      updates.fecha_otorgada = otorgamiento.fechaOtorgada
      updates.fecha_caducidad = otorgamiento.fechaCaducidad
      updates.version_otorgada = otorgamiento.versionOtorgada
      updates.estado_vigencia = 'vigente'
    }
  }

  const { error } = await supabase
    .from('enfermero_competencias')
    .upsert({
      enfermero_id: enfermeroId,
      competencia_id: competenciaId,
      ...updates,
    }, { onConflict: 'enfermero_id,competencia_id', ignoreDuplicates: false })

  if (error) return { error: error.message }

  revalidatePath(`/enfermeros/${enfermeroId}`)
  return {}
}
