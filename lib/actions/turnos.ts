'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getTurnos() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('turnos')
    .select(`
      *,
      caso:casos(id, titulo, direccion, tarifa_hora),
      enfermero:enfermeros(id, nombre, apellido)
    `)
    .order('fecha_inicio', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTurnosByCaso(casoId: string) {
  const supabase = await createClient()
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

export async function crearTurno(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('turnos').insert({
    caso_id:        formData.get('caso_id') as string,
    enfermero_id:   formData.get('enfermero_id') as string,
    fecha_inicio:   formData.get('fecha_inicio') as string,
    fecha_fin:      formData.get('fecha_fin') as string,
    notas_entrega:  (formData.get('notas_entrega') as string) || null,
    status:         'programado',
  })

  if (error) throw new Error(error.message)

  revalidatePath('/turnos')
  revalidatePath('/dashboard')
  redirect('/turnos')
}

export async function cambiarStatusTurno(id: string, status: 'programado' | 'activo' | 'completado') {
  const supabase = await createClient()

  // Leer turno antes de cambiar para generar cobranza si aplica
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
