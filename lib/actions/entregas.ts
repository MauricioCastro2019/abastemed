'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd } from './utils'
import type { EntregaTurno, SignosVitales, MedicamentoAdministrado } from '@/types'
import type { ActionResult } from './utils'

export async function getEntregasByCaso(casoId: string): Promise<EntregaTurno[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('entregas_turno')
    .select(`
      *,
      enfermero_saliente:enfermeros!enfermero_saliente_id(id, nombre, apellido),
      enfermero_entrante:enfermeros!enfermero_entrante_id(id, nombre, apellido),
      turno_saliente:turnos!turno_saliente_id(id, fecha_inicio, fecha_fin)
    `)
    .eq('turno_saliente_id', casoId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as EntregaTurno[]
}

export async function getEntregasByTurno(turnoId: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('entregas_turno')
    .select(`
      *,
      enfermero_saliente:enfermeros!enfermero_saliente_id(nombre, apellido),
      enfermero_entrante:enfermeros!enfermero_entrante_id(nombre, apellido)
    `)
    .eq('turno_saliente_id', turnoId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return data ?? null
}

export async function getEntregasDeCaso(casoId: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('entregas_turno')
    .select(`
      *,
      enfermero_saliente:enfermeros!enfermero_saliente_id(id, nombre, apellido),
      enfermero_entrante:enfermeros!enfermero_entrante_id(id, nombre, apellido),
      turno_saliente:turnos!turno_saliente_id(id, fecha_inicio, fecha_fin, caso_id)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Filtrar las que pertenecen a este caso
  return (data ?? []).filter((e: { turno_saliente: { caso_id?: string } | null }) =>
    (e.turno_saliente as { caso_id?: string } | null)?.caso_id === casoId
  )
}

export async function getUltimaEntregaByCaso(casoId: string) {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('entregas_turno')
    .select(`
      *,
      enfermero_saliente:enfermeros!enfermero_saliente_id(nombre, apellido),
      turno_saliente:turnos!turno_saliente_id(id, fecha_inicio, caso_id)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  // Filtrar por caso
  const filtradas = (data ?? []).filter((e: { turno_saliente: { caso_id?: string } | null }) =>
    (e.turno_saliente as { caso_id?: string } | null)?.caso_id === casoId
  )
  return filtradas[0] ?? null
}

export async function crearEntrega(formData: FormData): Promise<ActionResult> {
  const { supabase, user, perfil } = await requireAuth()

  const turnoSalienteId = fd(formData, 'turno_saliente_id')
  if (!turnoSalienteId) return { error: 'Turno requerido' }

  // Obtener enfermero_id del perfil actual
  let enfermeroSalienteId = fd(formData, 'enfermero_saliente_id')
  if (!enfermeroSalienteId && perfil.rol === 'enfermero') {
    const { data: p } = await supabase
      .from('perfiles').select('enfermero_id').eq('id', user.id).single()
    enfermeroSalienteId = p?.enfermero_id ?? ''
  }
  if (!enfermeroSalienteId) return { error: 'Enfermero no identificado' }

  // Signos vitales
  const signos_vitales: SignosVitales = {
    presion_arterial:      fd(formData, 'sv_presion') || undefined,
    frecuencia_cardiaca:   formData.get('sv_fc') ? Number(fd(formData, 'sv_fc')) : undefined,
    temperatura:           formData.get('sv_temp') ? Number(fd(formData, 'sv_temp')) : undefined,
    saturacion_oxigeno:    formData.get('sv_sato2') ? Number(fd(formData, 'sv_sato2')) : undefined,
    frecuencia_respiratoria: formData.get('sv_fr') ? Number(fd(formData, 'sv_fr')) : undefined,
    glucosa:               formData.get('sv_glucosa') ? Number(fd(formData, 'sv_glucosa')) : undefined,
    peso:                  formData.get('sv_peso') ? Number(fd(formData, 'sv_peso')) : undefined,
    observaciones:         fd(formData, 'sv_obs') || undefined,
  }

  // Medicamentos administrados (vienen como JSON)
  let medicamentos_administrados: MedicamentoAdministrado[] = []
  try {
    const raw = fd(formData, 'medicamentos_json')
    if (raw) medicamentos_administrados = JSON.parse(raw)
  } catch { /* sin medicamentos */ }

  const turnoEntranteId = fd(formData, 'turno_entrante_id') || null
  const enfermeroEntranteId = fd(formData, 'enfermero_entrante_id') || null

  // Crear entrega
  const { error } = await supabase.from('entregas_turno').insert({
    turno_saliente_id:          turnoSalienteId,
    turno_entrante_id:          turnoEntranteId,
    enfermero_saliente_id:      enfermeroSalienteId,
    enfermero_entrante_id:      enfermeroEntranteId,
    signos_vitales,
    medicamentos_administrados,
    observaciones:              fd(formData, 'observaciones'),
    incidentes:                 fd(formData, 'incidentes') || null,
  })

  if (error) return { error: error.message }

  // Marcar turno como completado (y auto-generar cobranza)
  const { cambiarStatusTurno } = await import('./turnos')
  await cambiarStatusTurno(turnoSalienteId, 'completado')

  revalidatePath('/enfermero/turnos')
  revalidatePath('/turnos')
  revalidatePath('/dashboard')
  return {}
}
