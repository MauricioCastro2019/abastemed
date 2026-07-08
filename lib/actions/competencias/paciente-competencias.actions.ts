'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, zodActionError, type ActionResult } from '../utils'
import { PacienteCompetenciaRequeridaSchema } from '@/lib/validations'
import { crearAlerta } from '../alertas'
import type { PacienteCompetenciaRequerida } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getCompetenciasRequeridasPaciente(pacienteId: string): Promise<PacienteCompetenciaRequerida[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('paciente_competencias_requeridas')
    .select('*, competencia:competencias(*)')
    .eq('paciente_id', pacienteId)

  if (error) throw new Error(error.message)
  return (data ?? []) as PacienteCompetenciaRequerida[]
}

// Agrega un requisito de competencia al paciente. No revisa ni
// bloquea turnos ya creados (el gate solo actúa en crearTurno),
// pero avisa a coordinación con una alerta no bloqueante si hay
// turnos futuros con enfermeros que no tienen la competencia.
export async function agregarCompetenciaRequerida(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const parsed = PacienteCompetenciaRequeridaSchema.safeParse({
    paciente_id:    fd(formData, 'paciente_id'),
    competencia_id: fd(formData, 'competencia_id'),
    notas:          fd(formData, 'notas'),
  })

  if (!parsed.success) return zodActionError(parsed.error)
  const v = parsed.data

  const { error } = await supabase
    .from('paciente_competencias_requeridas')
    .insert({
      paciente_id:    v.paciente_id,
      competencia_id: v.competencia_id,
      agregado_por:   perfil.id,
      notas:          v.notas || null,
    })

  if (error) return { error: error.message }

  await avisarTurnosAfectados(supabase, v.paciente_id, v.competencia_id)

  revalidatePath(`/pacientes/${v.paciente_id}`)
  return {}
}

export async function quitarCompetenciaRequerida(id: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const { data: existente } = await supabase
    .from('paciente_competencias_requeridas')
    .select('paciente_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('paciente_competencias_requeridas')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  if (existente?.paciente_id) revalidatePath(`/pacientes/${existente.paciente_id}`)
  return {}
}

async function avisarTurnosAfectados(supabase: SupabaseClient, pacienteId: string, competenciaId: string): Promise<void> {
  try {
    const { data: casos } = await supabase
      .from('casos')
      .select('id')
      .eq('paciente_id', pacienteId)

    const casoIds = (casos ?? []).map((c: { id: string }) => c.id)
    if (casoIds.length === 0) return

    const { data: turnos } = await supabase
      .from('turnos')
      .select('id, enfermero_id, caso:casos(titulo)')
      .in('caso_id', casoIds)
      .in('status', ['programado', 'activo'])

    if (!turnos || turnos.length === 0) return

    const enfermeroIds = Array.from(new Set(turnos.map((t: { enfermero_id: string }) => t.enfermero_id)))

    const { data: otorgadas } = await supabase
      .from('enfermero_competencias')
      .select('enfermero_id, fecha_otorgada, fecha_caducidad, estado_vigencia')
      .eq('competencia_id', competenciaId)
      .in('enfermero_id', enfermeroIds)

    const ahora = new Date()
    const vigentesIds = new Set(
      (otorgadas ?? [])
        .filter((o: { fecha_otorgada: string | null; fecha_caducidad: string | null; estado_vigencia: string }) =>
          o.fecha_otorgada !== null &&
          o.estado_vigencia !== 'revocada' &&
          (o.fecha_caducidad === null || new Date(o.fecha_caducidad) > ahora)
        )
        .map((o: { enfermero_id: string }) => o.enfermero_id)
    )

    for (const turno of turnos) {
      if (vigentesIds.has(turno.enfermero_id)) continue
      const titulo = (turno.caso as { titulo?: string } | null)?.titulo ?? 'un caso'
      await crearAlerta({
        tipo: 'otro',
        gravedad: 'media',
        titulo: 'Paciente requiere una competencia que el enfermero asignado no tiene',
        descripcion: `Se agregó un requisito de competencia al paciente de "${titulo}", pero ya existe un turno asignado a un enfermero sin esa competencia vigente.`,
        entidad: 'turnos',
        entidad_id: turno.id,
        accion_sugerida: 'Revisar si el enfermero asignado debe cambiar o si necesita la competencia',
        url_accion: `/turnos/${turno.id}`,
        dedup_key: `competencia_faltante_${turno.id}_${competenciaId}`,
      })
    }
  } catch {
    // No bloqueante: si falla el aviso, el requisito ya quedó guardado.
  }
}
