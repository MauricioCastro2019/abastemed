'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, fdNum, fdBool, type ActionResult } from './utils'
import type { ReporteTurno, MedAdministradoReporte, SignosVitalesReporte } from '@/types'

export async function getReportesByTurno(turnoId: string): Promise<ReporteTurno[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('reportes_turno')
    .select(`
      *,
      turno:turnos(id, fecha_inicio, fecha_fin),
      enfermero:enfermeros(id, nombre, apellido)
    `)
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ReporteTurno[]
}

export async function getReportesByCaso(
  casoId: string,
  limit = 20
): Promise<ReporteTurno[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('reportes_turno')
    .select(`
      *,
      turno:turnos(id, fecha_inicio, fecha_fin),
      enfermero:enfermeros(id, nombre, apellido)
    `)
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as ReporteTurno[]
}

export async function getReporte(id: string): Promise<ReporteTurno> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('reportes_turno')
    .select(`
      *,
      turno:turnos(id, fecha_inicio, fecha_fin),
      enfermero:enfermeros(id, nombre, apellido)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as ReporteTurno
}

export async function crearReporteTurno(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador', 'enfermero')

  const turnoId  = fd(formData, 'turno_id')
  const casoId   = fd(formData, 'caso_id')
  const enfId    = fd(formData, 'enfermero_id')

  if (!turnoId || !casoId || !enfId) {
    return { error: 'Datos de turno incompletos' }
  }

  const signos_vitales: SignosVitalesReporte = {
    presion_arterial:       fd(formData, 'sv_presion')        || undefined,
    frecuencia_cardiaca:    formData.get('sv_fc')     ? fdNum(formData, 'sv_fc')     : undefined,
    temperatura:            formData.get('sv_temp')   ? fdNum(formData, 'sv_temp')   : undefined,
    saturacion_sin_o2:      formData.get('sv_sato2')  ? fdNum(formData, 'sv_sato2')  : undefined,
    saturacion_con_o2:      formData.get('sv_sato2c') ? fdNum(formData, 'sv_sato2c') : undefined,
    litros_o2:              formData.get('sv_ltso2')  ? fdNum(formData, 'sv_ltso2')  : undefined,
    soporte_o2:             fd(formData, 'sv_soporte_o2')     || undefined,
    frecuencia_respiratoria: formData.get('sv_fr')    ? fdNum(formData, 'sv_fr')     : undefined,
    glucosa:                formData.get('sv_glucosa') ? fdNum(formData, 'sv_glucosa') : undefined,
    peso:                   formData.get('sv_peso')   ? fdNum(formData, 'sv_peso')   : undefined,
    dolor_eva:              formData.get('sv_dolor')  ? fdNum(formData, 'sv_dolor')  : undefined,
    observaciones:          fd(formData, 'sv_obs')            || undefined,
  }

  let medicamentos_administrados: MedAdministradoReporte[] = []
  try {
    const raw = fd(formData, 'medicamentos_json')
    if (raw) medicamentos_administrados = JSON.parse(raw)
  } catch { /* vacío */ }

  const cuidados_raw = fd(formData, 'cuidados_realizados')
  const cuidados_realizados = cuidados_raw
    ? cuidados_raw.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const { error } = await supabase.from('reportes_turno').insert({
    turno_id:       turnoId,
    caso_id:        casoId,
    enfermero_id:   enfId,
    registrado_por: perfil.id,
    signos_vitales,
    estado_general:       fd(formData, 'estado_general')     || null,
    estado_general_obs:   fd(formData, 'estado_general_obs') || null,
    tipo_dieta:           fd(formData, 'tipo_dieta')         || null,
    porcentaje_ingesta:   formData.get('porcentaje_ingesta') ? fdNum(formData, 'porcentaje_ingesta') : null,
    liquidos_ingeridos:   fd(formData, 'liquidos_ingeridos') || null,
    nausea:               fdBool(formData, 'nausea'),
    vomito:               fdBool(formData, 'vomito'),
    dificultad_deglucion: fdBool(formData, 'dificultad_deglucion'),
    obs_alimentacion:     fd(formData, 'obs_alimentacion')   || null,
    diuresis:             fd(formData, 'diuresis')           || null,
    caracteristicas_orina: fd(formData, 'caracteristicas_orina') || null,
    vol_drenado_sonda:    fd(formData, 'vol_drenado_sonda')  || null,
    evacuacion:           fdBool(formData, 'evacuacion'),
    evacuacion_cantidad:  fd(formData, 'evacuacion_cantidad')  || null,
    evacuacion_consistencia: fd(formData, 'evacuacion_consistencia') || null,
    evacuacion_color:     fd(formData, 'evacuacion_color')   || null,
    uso_panal:            fdBool(formData, 'uso_panal'),
    obs_eliminacion:      fd(formData, 'obs_eliminacion')    || null,
    cuidados_realizados,
    obs_cuidados:         fd(formData, 'obs_cuidados')       || null,
    estado_piel:          fd(formData, 'estado_piel')        || null,
    zonas_enrojecidas:    fd(formData, 'zonas_enrojecidas')  || null,
    curaciones_realizadas: fdBool(formData, 'curaciones_realizadas'),
    desc_curaciones:      fd(formData, 'desc_curaciones')    || null,
    cambios_posturales_num: formData.get('cambios_posturales_num') ? fdNum(formData, 'cambios_posturales_num') : null,
    obs_piel:             fd(formData, 'obs_piel')           || null,
    medicamentos_administrados,
    pendientes:           fd(formData, 'pendientes')         || null,
    observaciones:        fd(formData, 'observaciones')      || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/turnos/${turnoId}`)
  revalidatePath(`/casos/${casoId}`)
  revalidatePath('/turnos')
  return {}
}

export async function getUltimoReporteByCaso(casoId: string): Promise<ReporteTurno | null> {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('reportes_turno')
    .select(`
      *,
      enfermero:enfermeros(id, nombre, apellido)
    `)
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as ReporteTurno | null
}
