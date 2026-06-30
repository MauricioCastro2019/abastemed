'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, fdBool, zodActionError, type ActionResult } from './utils'
import { TurnoSchema } from '@/lib/validations'
import { registrarEvento } from './bitacora'
import { crearAlerta } from './alertas'
import type { TurnoConValidacion } from '@/types'

export async function getTurnos(search?: string) {
  const { supabase } = await requireAuth()
  let query = supabase
    .from('turnos')
    .select(`
      *,
      caso:casos(id, titulo, direccion, tarifa_hora),
      enfermero:enfermeros(id, nombre, apellido)
    `)
    .order('fecha_inicio', { ascending: false })

  if (search?.trim()) {
    // Filtrar por título de caso (join) — usamos rpc o filtramos en app
    // Supabase no permite filtrar en relaciones directamente con .ilike, filtramos después
    query = query.ilike('casos.titulo', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTurno(id: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      caso:casos(id, titulo, direccion, contexto, tarifa_hora, notas,
        paciente:pacientes(id, nombre, apellido, diagnostico, medicamentos, alergias, contacto_familiar)
      ),
      enfermero:enfermeros(id, nombre, apellido, cedula, telefono, especialidades, bio, rating, total_casos)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getTurnosByCaso(casoId: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      enfermero:enfermeros(id, nombre, apellido, telefono)
    `)
    .eq('caso_id', casoId)
    .order('fecha_inicio', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function crearTurno(formData: FormData): Promise<ActionResult & { warning?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const parsed = TurnoSchema.safeParse({
    caso_id:      fd(formData, 'caso_id'),
    enfermero_id: fd(formData, 'enfermero_id'),
    fecha_inicio: fd(formData, 'fecha_inicio'),
    fecha_fin:    fd(formData, 'fecha_fin'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data

  // ── Detección de conflictos de horario ─────────────────────
  // Busca turnos programados/activos del mismo enfermero que se solapan.
  const { data: conflictos } = await supabase
    .from('turnos')
    .select('id, fecha_inicio, fecha_fin, caso:casos(titulo)')
    .eq('enfermero_id', v.enfermero_id)
    .in('status', ['programado', 'activo'])
    .lt('fecha_inicio', v.fecha_fin)
    .gt('fecha_fin', v.fecha_inicio)

  // Si hay conflicto y el formulario NO marcó "confirmar_conflicto", devolver warning
  const confirmoConflicto = fdBool(formData, 'confirmar_conflicto')
  if (conflictos && conflictos.length > 0 && !confirmoConflicto) {
    const primerConflicto = conflictos[0]
    const titulo = (primerConflicto.caso as { titulo?: string } | null)?.titulo ?? 'otro caso'
    const inicio = new Date(primerConflicto.fecha_inicio).toLocaleString('es-MX', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
    return {
      warning: `Este enfermero ya tiene un turno en "${titulo}" que inicia el ${inicio}. El horario se solapa.`,
    }
  }

  const { data: nuevoTurno, error } = await supabase.from('turnos').insert({
    caso_id:       v.caso_id,
    enfermero_id:  v.enfermero_id,
    fecha_inicio:  v.fecha_inicio,
    fecha_fin:     v.fecha_fin,
    notas_entrega: fd(formData, 'notas_entrega') || null,
    status:        'programado',
  }).select('id').single()

  if (error) return { error: error.message }

  // ── Agregar como suplente si lo solicitaron ─────────────────
  const agregarSuplente = fdBool(formData, 'agregar_suplente')
  if (agregarSuplente && nuevoTurno) {
    const { data: caso } = await supabase
      .from('casos')
      .select('paciente_id')
      .eq('id', v.caso_id)
      .single()

    if (caso?.paciente_id) {
      // Solo insertar si no existe ya una asignación activa/pendiente
      const { data: existente } = await supabase
        .from('equipo_cuidado')
        .select('id')
        .eq('paciente_id', caso.paciente_id)
        .eq('enfermero_id', v.enfermero_id)
        .in('estado', ['activa', 'pendiente', 'pausada'])
        .maybeSingle()

      if (!existente) {
        await supabase.from('equipo_cuidado').insert({
          paciente_id:  caso.paciente_id,
          enfermero_id: v.enfermero_id,
          rol:          'suplente',
          estado:       'activa',
          asignado_por: perfil.id,
          motivo_asignacion: 'Agregado como suplente al cubrir una guardia',
        })
        revalidatePath(`/pacientes/${caso.paciente_id}/equipo`)
      }
    }
  }

  revalidatePath('/turnos')
  revalidatePath('/dashboard')
  return {}
}

export async function cambiarStatusTurno(id: string, status: 'programado' | 'activo' | 'completado') {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  // Si es enfermero, verificar que el turno le pertenece
  if (perfil.rol === 'enfermero') {
    const { data: turnoCheck } = await supabase
      .from('turnos')
      .select('enfermero_id')
      .eq('id', id)
      .single()

    if (turnoCheck?.enfermero_id !== perfil.enfermero_id) {
      throw new Error('No tienes permiso para modificar este turno')
    }
  }

  const { data: turno } = await supabase
    .from('turnos')
    .select('*, caso:casos(tarifa_hora)')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('turnos')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Al completar: calcular horas reales y marcar para revisión
  if (status === 'completado' && turno) {
    const horas = turno.horas_trabajadas > 0
      ? turno.horas_trabajadas
      : (new Date(turno.fecha_fin).getTime() - new Date(turno.fecha_inicio).getTime()) / 3600000

    const horasRedondeadas = Math.round(horas * 10) / 10
    const tarifa = (turno.caso as { tarifa_hora: number } | null)?.tarifa_hora ?? 0

    // Actualizar horas_trabajadas si estaban en 0
    if (turno.horas_trabajadas === 0) {
      await supabase
        .from('turnos')
        .update({ horas_trabajadas: horasRedondeadas, horas_pagables: horasRedondeadas })
        .eq('id', id)
    }

    // Auto-generar cobranza al completar
    await supabase.from('cobranza_items').insert({
      caso_id:  turno.caso_id,
      turno_id: id,
      concepto: `Turno ${new Date(turno.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      horas:    horasRedondeadas,
      tarifa,
      subtotal: Math.round(horasRedondeadas * tarifa * 100) / 100,
      status:   'pendiente',
    })

    // Registrar en bitácora
    await registrarEvento({
      accion:     'turno_completado',
      entidad:    'turnos',
      entidad_id: id,
      descripcion: `Turno completado. Horas: ${horasRedondeadas}`,
      metadata:   { horas: horasRedondeadas, tarifa, caso_id: turno.caso_id },
    })

    // Crear alerta de revisión para jefatura
    await crearAlerta({
      tipo:           'turno_sin_reporte',
      gravedad:       'media',
      titulo:         'Turno completado — pendiente de validación',
      descripcion:    `Turno del ${new Date(turno.fecha_inicio).toLocaleDateString('es-MX')} completado`,
      entidad:        'turnos',
      entidad_id:     id,
      accion_sugerida: 'Revisar y validar el turno',
      url_accion:     `/turnos/${id}/validar`,
      dedup_key:      `turno_validacion_${id}`,
    })
  }

  revalidatePath('/turnos')
  revalidatePath('/cobranza')
  revalidatePath('/dashboard')
}

// ── VALIDACIÓN DE TURNOS (JEFATURA) ──────────────────────────

export async function getTurnosPendientesValidacion(): Promise<TurnoConValidacion[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      caso:casos(id, titulo, direccion, tarifa_hora,
        paciente:pacientes(id, nombre, apellido, diagnostico)
      ),
      enfermero:enfermeros(id, nombre, apellido, cedula, telefono),
      validador:perfiles!validado_por(id, nombre, apellido),
      reporte:reportes_turno(id, created_at),
      entrega:entregas_turno!turno_saliente_id(id, created_at)
    `)
    .eq('status', 'completado')
    .in('validacion_status', ['pendiente', 'en_revision', 'en_aclaracion'])
    .order('fecha_fin', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as TurnoConValidacion[]
}

export async function getTurnoConValidacion(id: string): Promise<TurnoConValidacion | null> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      caso:casos(id, titulo, direccion, tarifa_hora, tarifa_costo_hora, notas,
        paciente:pacientes(id, nombre, apellido, diagnostico, medicamentos, alergias, contacto_familiar)
      ),
      enfermero:enfermeros(id, nombre, apellido, cedula, telefono, especialidades),
      validador:perfiles!validado_por(id, nombre, apellido),
      reporte:reportes_turno(id, created_at, signos_vitales, estado_general, medicamentos_administrados, observaciones, pendientes),
      entrega:entregas_turno!turno_saliente_id(id, created_at, observaciones, incidentes)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as TurnoConValidacion
}

export async function validarTurno(
  id: string,
  params: {
    validacion_status: 'validado' | 'rechazado' | 'en_aclaracion'
    horas_pagables?: number
    motivo?: string
  }
): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  // Jefatura NO puede marcar pagos — solo puede validar o rechazar
  if (perfil.rol === 'coordinador' && params.validacion_status === 'validado') {
    // Verificar que hay reporte
    const { data: reporte } = await supabase
      .from('reportes_turno')
      .select('id')
      .eq('turno_id', id)
      .maybeSingle()

    if (!reporte) {
      return { error: 'No se puede validar un turno sin reporte clínico registrado' }
    }
  }

  const updates: Record<string, unknown> = {
    validacion_status: params.validacion_status,
    validado_por:      perfil.id,
    validado_at:       new Date().toISOString(),
  }
  if (params.horas_pagables !== undefined) updates.horas_pagables = params.horas_pagables
  if (params.motivo) updates.motivo_validacion = params.motivo

  const { error } = await supabase
    .from('turnos')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  const accionLabel = {
    validado:       'Turno validado por jefatura',
    rechazado:      'Turno rechazado por jefatura',
    en_aclaracion:  'Turno enviado a aclaración',
  }[params.validacion_status]

  await registrarEvento({
    accion:     `turno_${params.validacion_status}`,
    entidad:    'turnos',
    entidad_id: id,
    descripcion: accionLabel,
    motivo:     params.motivo,
    metadata:   { horas_pagables: params.horas_pagables },
  })

  // Si se envía a aclaración, crear alerta
  if (params.validacion_status === 'en_aclaracion') {
    await crearAlerta({
      tipo:           'turno_en_aclaracion',
      gravedad:       'alta',
      titulo:         'Turno requiere aclaración',
      descripcion:    params.motivo ?? 'El turno fue enviado a aclaración por jefatura',
      entidad:        'turnos',
      entidad_id:     id,
      url_accion:     `/turnos/${id}`,
      dedup_key:      `turno_aclaracion_${id}`,
    })
  }

  revalidatePath('/turnos')
  revalidatePath('/turnos/validacion')
  revalidatePath(`/turnos/${id}`)
  revalidatePath('/dashboard')
  return {}
}

export async function editarFechasTurno(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const fecha_inicio = fd(formData, 'fecha_inicio')
  const fecha_fin    = fd(formData, 'fecha_fin')

  if (!fecha_inicio || !fecha_fin) return { error: 'Ambas fechas son requeridas' }
  if (new Date(fecha_fin) <= new Date(fecha_inicio)) return { error: 'La fecha de fin debe ser posterior al inicio' }

  const { error } = await supabase
    .from('turnos')
    .update({ fecha_inicio, fecha_fin })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/turnos/${id}`)
  revalidatePath('/turnos')
  revalidatePath('/casos')
  return {}
}

export async function reasignarEnfermero(id: string, enfermeroId: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { data: turno } = await supabase
    .from('turnos')
    .select('status, enfermero_id')
    .eq('id', id)
    .single()

  if (!turno) return { error: 'Turno no encontrado' }
  if (turno.status !== 'programado') return { error: 'Solo se puede reasignar un turno programado' }

  const { error } = await supabase
    .from('turnos')
    .update({ enfermero_id: enfermeroId })
    .eq('id', id)

  if (error) return { error: error.message }

  await registrarEvento({
    accion:     'turno_reasignado',
    entidad:    'turnos',
    entidad_id: id,
    descripcion: 'Enfermero/a reasignado/a',
    metadata:   { enfermero_anterior: turno.enfermero_id, enfermero_nuevo: enfermeroId },
  })

  revalidatePath(`/turnos/${id}`)
  revalidatePath('/turnos')
  revalidatePath('/turnos/semana')
  return {}
}

export async function eliminarTurno(id: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { data: turno } = await supabase
    .from('turnos')
    .select('status')
    .eq('id', id)
    .single()

  if (!turno) return { error: 'Turno no encontrado' }
  if (turno.status !== 'programado') return { error: 'Solo se pueden eliminar turnos aún no iniciados' }

  const { count: reporteCount } = await supabase
    .from('reportes_turno')
    .select('id', { count: 'exact', head: true })
    .eq('turno_id', id)

  if ((reporteCount ?? 0) > 0) return { error: 'No se puede eliminar un turno con reportes registrados' }

  const { error } = await supabase
    .from('turnos')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/turnos')
  revalidatePath('/turnos/semana')
  revalidatePath('/dashboard')
  return {}
}
