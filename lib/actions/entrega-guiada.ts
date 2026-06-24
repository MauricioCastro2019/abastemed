'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, type ActionResult } from './utils'
import type { EntregaTurnoGuiada, EstadoPacienteEntrega } from '@/types'

// ─── Generadores de resúmenes (sin IA, template-based) ──────

function generarResumenTurno({
  estado_paciente,
  cambios_relevantes,
  pendientes_siguiente,
  vigilancia_especial,
}: {
  estado_paciente: EstadoPacienteEntrega
  cambios_relevantes?: string
  pendientes_siguiente?: string
  vigilancia_especial?: string
}): string {
  const estadoMap: Record<EstadoPacienteEntrega, string> = {
    mejor: 'Paciente con mejoría respecto al turno anterior',
    igual: 'Paciente estable sin cambios significativos',
    peor:  'Paciente con deterioro respecto al turno anterior — requiere atención',
  }

  const partes = [estadoMap[estado_paciente] + '.']

  if (cambios_relevantes?.trim()) {
    partes.push(`Cambios durante el turno: ${cambios_relevantes.trim()}.`)
  }

  if (pendientes_siguiente?.trim()) {
    partes.push(`Para siguiente turno: ${pendientes_siguiente.trim()}.`)
  }

  if (vigilancia_especial?.trim()) {
    partes.push(`Vigilar especialmente: ${vigilancia_especial.trim()}.`)
  }

  return partes.join(' ')
}

function generarResumenFamiliar({
  estado_paciente,
  cambios_relevantes,
}: {
  estado_paciente: EstadoPacienteEntrega
  cambios_relevantes?: string
}): string {
  const estadoMap: Record<EstadoPacienteEntrega, string> = {
    mejor: 'con mejoría en su condición durante este turno',
    igual: 'estable y con sus cuidados al día',
    peor:  'con algunos cambios en su condición que nuestro equipo está atendiendo',
  }

  let resumen = `Su familiar se encuentra ${estadoMap[estado_paciente]}.`
  resumen += ' Se realizaron todos los cuidados programados del turno.'

  if (cambios_relevantes?.trim() && estado_paciente !== 'igual') {
    resumen += ` Nota relevante: ${cambios_relevantes.trim()}.`
  }

  resumen += ' Nuestro equipo continuará con la atención en el próximo turno.'

  return resumen
}

// ─── Parsear pendientes desde texto libre ────────────────────
// Cada línea no vacía se convierte en un pendiente_caso independiente.

async function crearPendientesDesdeTexto(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  casoId: string,
  turnoId: string,
  perfilId: string,
  entregaId: string,
  texto: string,
): Promise<void> {
  const lineas = texto
    .split('\n')
    .map(l => l.replace(/^[-•·*]\s*/, '').trim())
    .filter(l => l.length > 3)

  if (lineas.length === 0) return

  const inserts = lineas.map(titulo => ({
    caso_id:              casoId,
    turno_origen_id:      turnoId,
    enfermero_creador_id: perfilId,
    titulo,
    prioridad:            'normal',
    estado:               'pendiente',
    origen:               'entrega_turno',
    origen_id:            entregaId,
  }))

  await supabase.from('pendientes_caso').insert(inserts)
}

// ─── Actions públicas ────────────────────────────────────────

export async function getEntregaGuiadaByTurno(
  turnoId: string,
): Promise<EntregaTurnoGuiada | null> {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('entregas_turno_guiadas')
    .select('*, enfermero_saliente:perfiles!enfermero_saliente_id(id, nombre, apellido)')
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (data as EntregaTurnoGuiada | null) ?? null
}

export async function crearEntregaGuiada(formData: FormData): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const turnoId = fd(formData, 'turno_id')
  const casoId  = fd(formData, 'caso_id')
  const estadoPaciente = fd(formData, 'estado_paciente') as EstadoPacienteEntrega

  if (!turnoId || !casoId || !estadoPaciente) {
    return { error: 'Turno, caso y estado del paciente son requeridos' }
  }

  const cambiosRelevantes   = fd(formData, 'cambios_relevantes')   || undefined
  const pendientesSiguiente = fd(formData, 'pendientes_siguiente') || undefined
  const vigilanciaEspecial  = fd(formData, 'vigilancia_especial')  || undefined
  const notificarCoordinacion = formData.get('notificar_coordinacion') === 'true'
  const notasCoordinacion   = fd(formData, 'notas_coordinacion')   || undefined

  // Generar resúmenes automáticos
  const resumenTurno = generarResumenTurno({
    estado_paciente:     estadoPaciente,
    cambios_relevantes:  cambiosRelevantes,
    pendientes_siguiente: pendientesSiguiente,
    vigilancia_especial: vigilanciaEspecial,
  })

  const resumenFamiliar = generarResumenFamiliar({
    estado_paciente:    estadoPaciente,
    cambios_relevantes: cambiosRelevantes,
  })

  const { data, error } = await supabase
    .from('entregas_turno_guiadas')
    .insert({
      turno_id:               turnoId,
      caso_id:                casoId,
      enfermero_saliente_id:  perfil.id,
      estado_paciente:        estadoPaciente,
      cambios_relevantes:     cambiosRelevantes ?? null,
      pendientes_siguiente:   pendientesSiguiente ?? null,
      vigilancia_especial:    vigilanciaEspecial ?? null,
      notificar_coordinacion: notificarCoordinacion,
      notas_coordinacion:     notasCoordinacion ?? null,
      resumen_turno:          resumenTurno,
      resumen_familiar:       resumenFamiliar,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Auto-crear pendientes desde el texto si hay líneas identificables
  if (pendientesSiguiente && data?.id) {
    await crearPendientesDesdeTexto(
      supabase, casoId, turnoId, perfil.id, data.id, pendientesSiguiente,
    )
  }

  revalidatePath(`/turnos/${turnoId}`)
  revalidatePath(`/pacientes`)
  return { id: data?.id }
}
