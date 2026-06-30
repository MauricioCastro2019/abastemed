'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, fdBool } from '@/lib/actions/utils'
import type {
  EquipoCuidado, EstadoAsignacion, RolEquipo, HorarioEquipo,
  EnfermeroSugerido
} from '@/types'

// ────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ────────────────────────────────────────────────────────────

const EC_SELECT = `
  id, paciente_id, enfermero_id, rol, estado, es_principal, horario,
  acceso_expediente, fecha_inicio, fecha_fin, motivo_asignacion,
  motivo_finalizacion, observaciones, asignado_por, aceptado_en,
  created_at, updated_at,
  enfermero:enfermeros(
    id, nombre, apellido, cedula, especialidades, telefono, email,
    foto_url, bio, disponible, rating, total_casos, created_at
  ),
  asignador:perfiles!asignado_por(id, nombre, apellido)
`

async function insertarNotificacion(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  enfermeroId: string,
  tipo: string,
  titulo: string,
  cuerpo: string,
  metadata: Record<string, unknown> = {}
) {
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id')
    .eq('enfermero_id', enfermeroId)
    .maybeSingle()

  if (perfil?.id) {
    await supabase.from('notificaciones').insert({
      perfil_id: perfil.id,
      tipo,
      titulo,
      cuerpo,
      metadata,
    })
  }
}

// ────────────────────────────────────────────────────────────
// CONSULTAS
// ────────────────────────────────────────────────────────────

export async function getEquipoCuidadoByPaciente(pacienteId: string): Promise<{
  activos: EquipoCuidado[]
  pendientes: EquipoCuidado[]
  historial: EquipoCuidado[]
}> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('equipo_cuidado')
    .select(EC_SELECT)
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as EquipoCuidado[]
  return {
    activos:   rows.filter(r => r.estado === 'activa' || r.estado === 'pausada'),
    pendientes: rows.filter(r => r.estado === 'pendiente'),
    historial: rows.filter(r => r.estado === 'finalizada' || r.estado === 'rechazada'),
  }
}

export async function getEquipoCuidadoByEnfermero(enfermeroIdParam?: string): Promise<{
  activos: EquipoCuidado[]
  pendientes: EquipoCuidado[]
  historial: EquipoCuidado[]
}> {
  const { supabase, perfil } = await requireAuth()

  let enfermeroId: string | undefined = enfermeroIdParam

  if (!enfermeroId) {
    if (perfil.rol === 'enfermero') {
      if (perfil.enfermero_id) {
        enfermeroId = perfil.enfermero_id
      } else {
        // Fallback: buscar enfermero por email del usuario (cuando aún no está vinculado)
        const { data: enfPorEmail } = await supabase
          .from('enfermeros')
          .select('id')
          .eq('email', perfil.email)
          .maybeSingle()
        if (!enfPorEmail) return { activos: [], pendientes: [], historial: [] }
        enfermeroId = enfPorEmail.id
      }
    } else {
      requireRole(perfil, 'admin', 'superadmin', 'coordinador')
      return { activos: [], pendientes: [], historial: [] }
    }
  } else {
    requireRole(perfil, 'admin', 'superadmin', 'coordinador')
  }

  const { data, error } = await supabase
    .from('equipo_cuidado')
    .select(`
      ${EC_SELECT},
      paciente:pacientes(id, nombre, apellido, diagnostico, status, contexto, created_at,
        fecha_nacimiento, medicamentos, alergias, contacto_familiar)
    `)
    .eq('enfermero_id', enfermeroId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as EquipoCuidado[]
  return {
    activos:    rows.filter(r => r.estado === 'activa' || r.estado === 'pausada'),
    pendientes: rows.filter(r => r.estado === 'pendiente'),
    historial:  rows.filter(r => r.estado === 'finalizada' || r.estado === 'rechazada'),
  }
}

// Obtener equipo activo del paciente de un caso (para TurnoForm)
export async function getEquipoCuidadoByCaso(casoId: string): Promise<EquipoCuidado[]> {
  const { supabase } = await requireAuth()

  const { data: caso } = await supabase
    .from('casos')
    .select('paciente_id')
    .eq('id', casoId)
    .single()

  if (!caso) return []

  const { data } = await supabase
    .from('equipo_cuidado')
    .select(EC_SELECT)
    .eq('paciente_id', caso.paciente_id)
    .in('estado', ['activa', 'pendiente'])
    .order('es_principal', { ascending: false })
    .order('rol')

  return (data ?? []) as unknown as EquipoCuidado[]
}

export async function getEnfermerosSugeridos(pacienteId: string): Promise<EnfermeroSugerido[]> {
  const { supabase } = await requireAuth()

  const [{ data: enfermeros }, { data: equipoActual }] = await Promise.all([
    supabase
      .from('enfermeros')
      .select(`
        id, nombre, apellido, cedula, especialidades, telefono, email,
        foto_url, bio, disponible, rating, total_casos, created_at
      `)
      .eq('disponible', true)
      .order('apellido'),
    supabase
      .from('equipo_cuidado')
      .select('enfermero_id, rol, estado, id')
      .eq('paciente_id', pacienteId)
      .in('estado', ['activa', 'pendiente', 'pausada']),
  ])

  const equipoMap = new Map<string, { rol: RolEquipo; estado: EstadoAsignacion; id: string }>()
  for (const item of equipoActual ?? []) {
    equipoMap.set(item.enfermero_id, {
      rol: item.rol as RolEquipo,
      estado: item.estado as EstadoAsignacion,
      id: item.id,
    })
  }

  const result: EnfermeroSugerido[] = []
  for (const e of enfermeros ?? []) {
    const enEquipo = equipoMap.get(e.id)
    result.push({
      enfermero: e,
      ya_en_equipo: !!enEquipo,
      rol_actual: enEquipo?.rol ?? null,
      estado_asignacion: enEquipo?.estado ?? null,
      asignacion_id: enEquipo?.id ?? null,
      competencias_validadas: 0,  // se puede extender con join a enfermero_competencias
      guardias_semana: 0,         // se puede extender con count de turnos en la semana
    })
  }

  // Equipo actual primero, luego disponibles
  result.sort((a, b) => {
    if (a.ya_en_equipo && !b.ya_en_equipo) return -1
    if (!a.ya_en_equipo && b.ya_en_equipo) return 1
    return a.enfermero.apellido.localeCompare(b.enfermero.apellido)
  })

  return result
}

// ────────────────────────────────────────────────────────────
// MUTACIONES
// ────────────────────────────────────────────────────────────

export async function crearAsignacion(formData: FormData): Promise<{ error?: string; id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const pacienteId  = fd(formData, 'paciente_id')
  const enfermeroId = fd(formData, 'enfermero_id')
  const rol         = fd(formData, 'rol') as RolEquipo
  const horario     = fd(formData, 'horario') as HorarioEquipo
  const esPrincipal = fdBool(formData, 'es_principal')
  const acceso      = formData.get('acceso_expediente') !== 'false'
  const requiereAceptacion = fdBool(formData, 'requiere_aceptacion')
  const fechaInicio = fd(formData, 'fecha_inicio') || new Date().toISOString().slice(0, 10)
  const fechaFin    = fd(formData, 'fecha_fin') || null
  const motivo      = fd(formData, 'motivo_asignacion') || null
  const observaciones = fd(formData, 'observaciones') || null

  if (!pacienteId)  return { error: 'Paciente requerido.' }
  if (!enfermeroId) return { error: 'Enfermero requerido.' }
  if (!rol)         return { error: 'Rol requerido.' }

  if (fechaFin && fechaFin < fechaInicio) {
    return { error: 'La fecha de fin no puede ser anterior a la fecha de inicio.' }
  }

  // Verificar duplicado activo
  const { data: duplicado } = await supabase
    .from('equipo_cuidado')
    .select('id, estado')
    .eq('paciente_id', pacienteId)
    .eq('enfermero_id', enfermeroId)
    .in('estado', ['activa', 'pendiente', 'pausada'])
    .maybeSingle()

  if (duplicado) {
    const estadoLabel: Record<string, string> = {
      activa:   'activa',
      pendiente: 'pendiente de aceptación',
      pausada:  'pausada',
    }
    return {
      error: `Este enfermero ya tiene una asignación ${estadoLabel[duplicado.estado] ?? ''} con este paciente. Edita la asignación existente.`,
    }
  }

  const estado: EstadoAsignacion = requiereAceptacion ? 'pendiente' : 'activa'

  const { data: nueva, error: insertError } = await supabase
    .from('equipo_cuidado')
    .insert({
      paciente_id: pacienteId,
      enfermero_id: enfermeroId,
      rol,
      estado,
      es_principal: esPrincipal,
      horario,
      acceso_expediente: acceso,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      motivo_asignacion: motivo,
      observaciones,
      asignado_por: perfil.id,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  // Notificación al enfermero
  const titulo = requiereAceptacion
    ? 'Nueva invitación de asignación'
    : 'Nueva asignación de paciente'
  const cuerpo = requiereAceptacion
    ? 'Has sido invitado a formar parte de un equipo de cuidado. Revisa tu sección "Mis Pacientes" para aceptar o rechazar.'
    : 'Has sido agregado al equipo de cuidado de un paciente. Revisa tu sección "Mis Pacientes".'

  await insertarNotificacion(supabase, enfermeroId, 'nueva_asignacion', titulo, cuerpo, {
    asignacion_id: nueva.id,
    paciente_id: pacienteId,
  })

  revalidatePath(`/pacientes/${pacienteId}`)
  revalidatePath(`/pacientes/${pacienteId}/equipo`)
  revalidatePath('/dashboard')

  return { id: nueva.id }
}

export async function actualizarAsignacion(
  id: string,
  datos: {
    rol?: RolEquipo
    horario?: HorarioEquipo
    es_principal?: boolean
    acceso_expediente?: boolean
    fecha_inicio?: string
    fecha_fin?: string | null
    motivo_asignacion?: string | null
    observaciones?: string | null
  }
): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  if (datos.fecha_inicio && datos.fecha_fin && datos.fecha_fin < datos.fecha_inicio) {
    return { error: 'La fecha de fin no puede ser anterior a la fecha de inicio.' }
  }

  const { error } = await supabase
    .from('equipo_cuidado')
    .update(datos)
    .eq('id', id)

  if (error) return { error: error.message }

  const { data: ec } = await supabase
    .from('equipo_cuidado')
    .select('paciente_id')
    .eq('id', id)
    .single()

  if (ec) {
    revalidatePath(`/pacientes/${ec.paciente_id}/equipo`)
    revalidatePath(`/pacientes/${ec.paciente_id}`)
  }
  return {}
}

export async function cambiarEstadoAsignacion(
  id: string,
  estado: 'activa' | 'pausada' | 'finalizada',
  motivo?: string
): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const updates: Record<string, unknown> = { estado }
  if (estado === 'finalizada' && motivo) {
    updates.motivo_finalizacion = motivo
    updates.fecha_fin = new Date().toISOString().slice(0, 10)
  }

  const { error } = await supabase
    .from('equipo_cuidado')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  const { data: ec } = await supabase
    .from('equipo_cuidado')
    .select('paciente_id, enfermero_id')
    .eq('id', id)
    .single()

  if (ec) {
    if (estado === 'finalizada') {
      await insertarNotificacion(
        supabase,
        ec.enfermero_id,
        'asignacion_finalizada',
        'Asignación finalizada',
        'Tu participación en un equipo de cuidado ha finalizado. Gracias por tu colaboración.',
        { asignacion_id: id, paciente_id: ec.paciente_id }
      )
    }
    revalidatePath(`/pacientes/${ec.paciente_id}/equipo`)
    revalidatePath(`/pacientes/${ec.paciente_id}`)
    revalidatePath('/dashboard')
  }
  return {}
}

export async function aceptarAsignacion(id: string): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'enfermero')

  if (!perfil.enfermero_id) return { error: 'Perfil no vinculado a un enfermero.' }

  const { data: ec } = await supabase
    .from('equipo_cuidado')
    .select('id, estado, enfermero_id, paciente_id')
    .eq('id', id)
    .eq('enfermero_id', perfil.enfermero_id)
    .single()

  if (!ec) return { error: 'Asignación no encontrada.' }
  if (ec.estado !== 'pendiente') return { error: 'Solo se pueden aceptar asignaciones pendientes.' }

  const { error } = await supabase
    .from('equipo_cuidado')
    .update({ estado: 'activa', aceptado_en: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/enfermero/mis-pacientes')
  revalidatePath('/enfermero/dashboard')
  revalidatePath(`/pacientes/${ec.paciente_id}/equipo`)
  return {}
}

export async function rechazarAsignacion(id: string, motivo?: string): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'enfermero')

  if (!perfil.enfermero_id) return { error: 'Perfil no vinculado a un enfermero.' }

  const { data: ec } = await supabase
    .from('equipo_cuidado')
    .select('id, estado, enfermero_id, paciente_id')
    .eq('id', id)
    .eq('enfermero_id', perfil.enfermero_id)
    .single()

  if (!ec) return { error: 'Asignación no encontrada.' }
  if (ec.estado !== 'pendiente') return { error: 'Solo se pueden rechazar asignaciones pendientes.' }

  const updates: Record<string, unknown> = { estado: 'rechazada' }
  if (motivo) updates.motivo_finalizacion = motivo

  const { error } = await supabase
    .from('equipo_cuidado')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/enfermero/mis-pacientes')
  revalidatePath('/enfermero/dashboard')
  revalidatePath(`/pacientes/${ec.paciente_id}/equipo`)
  return {}
}

export async function marcarPrincipal(id: string): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const { error } = await supabase
    .from('equipo_cuidado')
    .update({ es_principal: true })
    .eq('id', id)

  if (error) return { error: error.message }

  const { data: ec } = await supabase
    .from('equipo_cuidado')
    .select('paciente_id')
    .eq('id', id)
    .single()

  if (ec) {
    revalidatePath(`/pacientes/${ec.paciente_id}/equipo`)
    revalidatePath(`/pacientes/${ec.paciente_id}`)
  }
  return {}
}

// Para la vista global de cobertura
export async function getResumenCobertura(): Promise<{
  paciente_id: string
  paciente_nombre: string
  paciente_apellido: string
  tiene_titular: boolean
  total_activos: number
  proxima_guardia: string | null
  estado_cobertura: 'cubierta' | 'incompleta' | 'sin_titular'
}[]> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'superadmin', 'coordinador')

  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('id, nombre, apellido, status')
    .eq('status', 'activo')
    .order('apellido')

  if (!pacientes?.length) return []

  const { data: equipo } = await supabase
    .from('equipo_cuidado')
    .select('paciente_id, rol, estado')
    .in('estado', ['activa'])

  const { data: turnos } = await supabase
    .from('turnos')
    .select('caso_id, fecha_inicio, casos(paciente_id)')
    .gte('fecha_inicio', new Date().toISOString())
    .eq('status', 'programado')
    .order('fecha_inicio')

  const equipoPorPaciente = new Map<string, typeof equipo>()
  for (const e of equipo ?? []) {
    const lista = equipoPorPaciente.get(e.paciente_id) ?? []
    lista.push(e)
    equipoPorPaciente.set(e.paciente_id, lista)
  }

  const proximaGuardiaPorPaciente = new Map<string, string>()
  for (const t of turnos ?? []) {
    const pid = (t.casos as unknown as { paciente_id: string }).paciente_id
    if (!proximaGuardiaPorPaciente.has(pid)) {
      proximaGuardiaPorPaciente.set(pid, t.fecha_inicio)
    }
  }

  return pacientes.map(p => {
    const equipoP = equipoPorPaciente.get(p.id) ?? []
    const tieneTitular = equipoP.some(e => e.rol === 'titular')
    const totalActivos = equipoP.length
    const proximaGuardia = proximaGuardiaPorPaciente.get(p.id) ?? null

    let estado_cobertura: 'cubierta' | 'incompleta' | 'sin_titular'
    if (!tieneTitular) estado_cobertura = 'sin_titular'
    else if (totalActivos < 2) estado_cobertura = 'incompleta'
    else estado_cobertura = 'cubierta'

    return {
      paciente_id: p.id,
      paciente_nombre: p.nombre,
      paciente_apellido: p.apellido,
      tiene_titular: tieneTitular,
      total_activos: totalActivos,
      proxima_guardia: proximaGuardia,
      estado_cobertura,
    }
  })
}
