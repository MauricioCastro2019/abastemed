import { requireAuth } from '../utils'
import type { EstadoVigenciaCompetencia } from '@/types'

export interface CompetenciaRequerida {
  id: string
  nombre: string
  modulo_id: string | null
}

export interface CompetenciaOtorgada {
  competencia_id: string
  fecha_otorgada: string | null
  fecha_caducidad: string | null
  estado_vigencia: EstadoVigenciaCompetencia
}

export interface GateResult {
  permitido: boolean
  faltantes: CompetenciaRequerida[]
}

// Pura — sin I/O, testeable sin mocks. No confía ciegamente en
// estado_vigencia porque no hay cron corriendo que la mantenga al
// día: recalcula la caducidad en tiempo real comparando fechas.
// Solo confía en estado_vigencia para el caso 'revocada', que se
// escribe de forma síncrona en revocarCompetencia().
export function evaluarGateCompetencias(
  requeridas: CompetenciaRequerida[],
  otorgadas: CompetenciaOtorgada[],
  ahora: Date = new Date()
): GateResult {
  const vigentesIds = new Set(
    otorgadas
      .filter(o =>
        o.fecha_otorgada !== null &&
        o.estado_vigencia !== 'revocada' &&
        (o.fecha_caducidad === null || new Date(o.fecha_caducidad) > ahora)
      )
      .map(o => o.competencia_id)
  )

  const faltantes = requeridas.filter(r => !vigentesIds.has(r.id))
  return { permitido: faltantes.length === 0, faltantes }
}

// Wrapper: trae los requisitos del paciente y las competencias
// otorgadas del enfermero, delega a la función pura.
export async function verificarCompetenciasParaAsignacion(
  enfermeroId: string,
  pacienteId: string
): Promise<GateResult> {
  const { supabase } = await requireAuth()

  const [{ data: requeridasRaw }, { data: otorgadasRaw }] = await Promise.all([
    supabase
      .from('paciente_competencias_requeridas')
      .select('competencia:competencias(id, nombre, activa, modulos_capacitacion(id))')
      .eq('paciente_id', pacienteId),
    supabase
      .from('enfermero_competencias')
      .select('competencia_id, fecha_otorgada, fecha_caducidad, estado_vigencia')
      .eq('enfermero_id', enfermeroId),
  ])

  type RequeridaRow = {
    competencia: {
      id: string
      nombre: string
      activa: boolean
      modulos_capacitacion?: { id: string }[]
    } | null
  }

  const requeridas: CompetenciaRequerida[] = ((requeridasRaw ?? []) as unknown as RequeridaRow[])
    .map(r => r.competencia)
    .filter((c): c is NonNullable<RequeridaRow['competencia']> => !!c && c.activa)
    .map(c => ({ id: c.id, nombre: c.nombre, modulo_id: c.modulos_capacitacion?.[0]?.id ?? null }))

  const otorgadas = (otorgadasRaw ?? []) as CompetenciaOtorgada[]

  return evaluarGateCompetencias(requeridas, otorgadas)
}
