'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, zodActionError, type ActionResult } from './utils'
import { TurnoSchema } from '@/lib/validations'

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

export async function crearTurno(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = TurnoSchema.safeParse({
    caso_id:      fd(formData, 'caso_id'),
    enfermero_id: fd(formData, 'enfermero_id'),
    fecha_inicio: fd(formData, 'fecha_inicio'),
    fecha_fin:    fd(formData, 'fecha_fin'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data
  const { error } = await supabase.from('turnos').insert({
    caso_id:       v.caso_id,
    enfermero_id:  v.enfermero_id,
    fecha_inicio:  v.fecha_inicio,
    fecha_fin:     v.fecha_fin,
    notas_entrega: fd(formData, 'notas_entrega') || null,
    status:        'programado',
  })

  if (error) return { error: error.message }

  revalidatePath('/turnos')
  revalidatePath('/dashboard')
  return {}
}

export async function cambiarStatusTurno(id: string, status: 'programado' | 'activo' | 'completado') {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros', 'enfermero')

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

  // Auto-generar cobranza al completar
  if (status === 'completado' && turno) {
    const horas = turno.horas_trabajadas > 0
      ? turno.horas_trabajadas
      : (new Date(turno.fecha_fin).getTime() - new Date(turno.fecha_inicio).getTime()) / 3600000
    const tarifa = (turno.caso as { tarifa_hora: number } | null)?.tarifa_hora ?? 0

    await supabase.from('cobranza_items').insert({
      caso_id:  turno.caso_id,
      turno_id: id,
      concepto: `Turno ${new Date(turno.fecha_inicio).toLocaleDateString('es-VE')}`,
      horas:    Math.round(horas * 10) / 10,
      tarifa,
      subtotal: Math.round(horas * tarifa * 100) / 100,
      status:   'pendiente',
    })
  }

  revalidatePath('/turnos')
  revalidatePath('/cobranza')
  revalidatePath('/dashboard')
}
