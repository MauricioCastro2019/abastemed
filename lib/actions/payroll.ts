'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, DEFAULT_ORG_ID } from './utils'
import { registrarEvento } from './bitacora'
import type {
  PayrollPeriod,
  PayrollItem,
  ResumenPagoEnfermero,
} from '@/types'

// ── PERIODOS DE CORTE ─────────────────────────────────────────

export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('payroll_periods')
    .select(`
      *,
      creador:perfiles!created_by(id, nombre, apellido),
      aprobador:perfiles!approved_by(id, nombre, apellido)
    `)
    .order('fecha_inicio', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as PayrollPeriod[]
}

export async function getPayrollPeriod(id: string): Promise<PayrollPeriod | null> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('payroll_periods')
    .select(`
      *,
      creador:perfiles!created_by(id, nombre, apellido),
      aprobador:perfiles!approved_by(id, nombre, apellido),
      items:payroll_items(
        *,
        enfermero:enfermeros(id, nombre, apellido, telefono),
        turno:turnos(id, fecha_inicio, fecha_fin, status),
        caso:casos(id, titulo),
        paciente:pacientes(id, nombre, apellido)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as PayrollPeriod
}

export async function crearPayrollPeriod(formData: FormData): Promise<{ error?: string; id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const nombre           = formData.get('nombre') as string
  const fecha_inicio     = formData.get('fecha_inicio') as string
  const fecha_fin        = formData.get('fecha_fin') as string
  const fecha_programada = formData.get('fecha_programada_pago') as string | null
  const observaciones    = formData.get('observaciones') as string | null

  if (!nombre || !fecha_inicio || !fecha_fin) {
    return { error: 'Nombre, fecha inicio y fecha fin son requeridos' }
  }

  const { data, error } = await supabase
    .from('payroll_periods')
    .insert({
      nombre,
      fecha_inicio,
      fecha_fin,
      fecha_programada_pago: fecha_programada || null,
      observaciones:         observaciones || null,
      estado:                'borrador',
      created_by:            perfil.id,
      organization_id:       DEFAULT_ORG_ID,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await registrarEvento({
    accion:     'payroll_period_creado',
    entidad:    'payroll_periods',
    entidad_id: data.id,
    descripcion: `Periodo de corte "${nombre}" creado`,
  })

  revalidatePath('/cortes')
  return { id: data.id }
}

export async function generarPartidas(periodoId: string): Promise<{ error?: string; insertados?: number }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { data: periodo, error: pError } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('id', periodoId)
    .single()

  if (pError || !periodo) return { error: 'Periodo no encontrado' }
  if (periodo.estado !== 'borrador') return { error: 'Solo se pueden generar partidas en periodos en borrador' }

  const { data: turnos, error: tError } = await supabase
    .from('turnos')
    .select('id, caso_id, enfermero_id, fecha_inicio, fecha_fin, horas_trabajadas, horas_pagables, tarifa_costo_hora, caso:casos(id, tarifa_costo_hora, tarifa_hora, paciente_id)')
    .eq('validacion_status', 'validado')
    .gte('fecha_inicio', periodo.fecha_inicio)
    .lte('fecha_inicio', periodo.fecha_fin + 'T23:59:59')

  if (tError) return { error: tError.message }
  if (!turnos || turnos.length === 0) return { error: 'No hay turnos validados en este periodo' }

  const turnoIds = (turnos as Array<{ id: string }>).map(t => t.id)
  const { data: existentes } = await supabase
    .from('payroll_items')
    .select('turno_id')
    .in('turno_id', turnoIds)
    .neq('estado_pago', 'cancelado')

  const turnosYaEnCorte = new Set((existentes ?? []).map((e: { turno_id: string }) => e.turno_id))

  await supabase.from('payroll_items').delete().eq('periodo_id', periodoId)

  type TurnoRow = {
    id: string; caso_id: string; enfermero_id: string; fecha_inicio: string; fecha_fin: string;
    horas_trabajadas: number; horas_pagables: number | null; tarifa_costo_hora: number | null;
    caso: Array<{ id: string; tarifa_costo_hora?: number | null; tarifa_hora?: number; paciente_id?: string }>
  }

  const items = (turnos as TurnoRow[])
    .filter(t => !turnosYaEnCorte.has(t.id))
    .map(t => {
      const caso = t.caso?.[0] ?? null
      const horasReales = t.horas_trabajadas > 0
        ? t.horas_trabajadas
        : (new Date(t.fecha_fin).getTime() - new Date(t.fecha_inicio).getTime()) / 3600000
      const horasPagables = t.horas_pagables ?? horasReales
      const tarifaCosto = t.tarifa_costo_hora ?? caso?.tarifa_costo_hora ?? ((caso?.tarifa_hora ?? 0) * 0.6)

      return {
        periodo_id:        periodoId,
        enfermero_id:      t.enfermero_id,
        turno_id:          t.id,
        caso_id:           t.caso_id,
        paciente_id:       caso?.paciente_id ?? null,
        horas_programadas: Math.round(horasReales * 100) / 100,
        horas_reales:      Math.round(horasReales * 100) / 100,
        horas_pagables:    Math.round(horasPagables * 100) / 100,
        tarifa_hora:       tarifaCosto,
        estado_validacion: 'pendiente',
        estado_pago:       'pendiente',
      }
    })

  if (items.length === 0) return { error: 'Todos los turnos validados ya están en otro corte activo' }

  const { error: insertError } = await supabase.from('payroll_items').insert(items)
  if (insertError) return { error: insertError.message }

  await registrarEvento({
    accion:     'payroll_partidas_generadas',
    entidad:    'payroll_periods',
    entidad_id: periodoId,
    descripcion: `${items.length} partidas generadas para el periodo`,
  })

  revalidatePath(`/cortes/${periodoId}`)
  return { insertados: items.length }
}

export async function validarPayrollItem(
  itemId: string,
  params: {
    estado: 'validado' | 'rechazado' | 'en_aclaracion'
    horas_pagables?: number
    ajuste?: number
    motivo_ajuste?: string
    observaciones?: string
  }
): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const updates: Record<string, unknown> = {
    estado_validacion: params.estado,
    validado_por:      perfil.id,
    validado_at:       new Date().toISOString(),
  }
  if (params.horas_pagables !== undefined) updates.horas_pagables = params.horas_pagables
  if (params.ajuste !== undefined) updates.ajuste = params.ajuste
  if (params.motivo_ajuste) updates.motivo_ajuste = params.motivo_ajuste
  if (params.observaciones) updates.observaciones = params.observaciones

  const { error } = await supabase.from('payroll_items').update(updates).eq('id', itemId)
  if (error) return { error: error.message }

  revalidatePath('/cortes')
  return {}
}

export async function marcarPeriodoEnRevision(periodoId: string): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { error } = await supabase
    .from('payroll_periods')
    .update({ estado: 'en_revision', reviewed_by: perfil.id, reviewed_at: new Date().toISOString() })
    .eq('id', periodoId)
    .eq('estado', 'borrador')

  if (error) return { error: error.message }

  await registrarEvento({ accion: 'payroll_periodo_en_revision', entidad: 'payroll_periods', entidad_id: periodoId })
  revalidatePath('/cortes')
  return {}
}

export async function marcarPeriodoValidado(periodoId: string): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { data: problemas } = await supabase
    .from('payroll_items')
    .select('id')
    .eq('periodo_id', periodoId)
    .eq('estado_validacion', 'en_aclaracion')

  if (problemas && problemas.length > 0) {
    return { error: `Hay ${problemas.length} partidas en aclaración pendientes` }
  }

  const { error } = await supabase
    .from('payroll_periods')
    .update({ estado: 'validado' })
    .eq('id', periodoId)
    .in('estado', ['en_revision', 'borrador'])

  if (error) return { error: error.message }
  await registrarEvento({ accion: 'payroll_periodo_validado', entidad: 'payroll_periods', entidad_id: periodoId })
  revalidatePath('/cortes')
  return {}
}

export async function autorizarPayrollPeriod(periodoId: string): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { data: periodo } = await supabase
    .from('payroll_periods')
    .select('estado, total_pagar, nombre')
    .eq('id', periodoId)
    .single()

  if (!periodo) return { error: 'Periodo no encontrado' }
  if (!['validado', 'en_revision', 'borrador'].includes(periodo.estado)) {
    return { error: `No se puede autorizar un periodo en estado "${periodo.estado}"` }
  }

  const { error } = await supabase
    .from('payroll_periods')
    .update({ estado: 'autorizado', approved_by: perfil.id, approved_at: new Date().toISOString() })
    .eq('id', periodoId)

  if (error) return { error: error.message }

  await supabase
    .from('payroll_items')
    .update({ estado_pago: 'autorizado' })
    .eq('periodo_id', periodoId)
    .eq('estado_validacion', 'validado')
    .eq('estado_pago', 'pendiente')

  await generarCuentasPorPagar(periodoId, perfil.id)

  await registrarEvento({
    accion:     'payroll_periodo_autorizado',
    entidad:    'payroll_periods',
    entidad_id: periodoId,
    descripcion: `Periodo "${periodo.nombre}" autorizado. Total: $${periodo.total_pagar}`,
  })

  revalidatePath('/cortes')
  revalidatePath('/finanzas/cuentas-por-pagar')
  return {}
}

async function generarCuentasPorPagar(periodoId: string, aprobadorId: string): Promise<void> {
  const { supabase } = await requireAuth()

  const { data: items } = await supabase
    .from('payroll_items')
    .select('enfermero_id, total_pagar, enfermero:enfermeros(nombre, apellido, telefono)')
    .eq('periodo_id', periodoId)
    .eq('estado_validacion', 'validado')
    .eq('estado_pago', 'autorizado')
    .is('financial_expense_id', null)

  if (!items || items.length === 0) return

  const porEnfermero = new Map<string, { total: number; nombre: string; telefono: string | null }>()
  for (const item of items) {
    const enf = (Array.isArray(item.enfermero) ? item.enfermero[0] : item.enfermero) as { nombre: string; apellido: string; telefono: string } | null
    const key = item.enfermero_id
    const cur = porEnfermero.get(key) ?? { total: 0, nombre: enf ? `${enf.nombre} ${enf.apellido}` : 'Enfermero', telefono: enf?.telefono ?? null }
    porEnfermero.set(key, { ...cur, total: cur.total + (item.total_pagar ?? 0) })
  }

  for (const [enfId, { total, nombre, telefono }] of Array.from(porEnfermero.entries())) {
    if (total <= 0) continue
    const { data: expense } = await supabase
      .from('financial_expenses')
      .insert({
        fecha_salida:          new Date().toISOString().split('T')[0],
        tipo_salida:           'pago_enfermero',
        beneficiario_nombre:   nombre,
        beneficiario_contacto: telefono,
        enfermero_id:          enfId,
        concepto:              `Nómina periodo — ${periodoId.slice(0, 8)}`,
        monto:                 total,
        metodo_pago:           'transferencia',
        estatus:               'pendiente',
        registrado_por:        aprobadorId,
      })
      .select('id')
      .single()

    if (expense) {
      await supabase
        .from('payroll_items')
        .update({ financial_expense_id: expense.id })
        .eq('periodo_id', periodoId)
        .eq('enfermero_id', enfId)
        .eq('estado_pago', 'autorizado')
    }
  }
}

export async function registrarPagoPeriodo(periodoId: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const metodo_pago    = formData.get('metodo_pago') as string
  const referencia     = formData.get('referencia_pago') as string | null
  const comprobante    = formData.get('comprobante_url') as string | null

  const { error } = await supabase
    .from('payroll_periods')
    .update({ estado: 'pagado', paid_at: new Date().toISOString() })
    .eq('id', periodoId)
    .eq('estado', 'autorizado')

  if (error) return { error: error.message }

  await supabase
    .from('payroll_items')
    .update({ estado_pago: 'pagado', metodo_pago, referencia_pago: referencia, comprobante_url: comprobante, pagado_at: new Date().toISOString(), pagado_por: perfil.id })
    .eq('periodo_id', periodoId)
    .eq('estado_pago', 'autorizado')

  const { data: linkedItems } = await supabase
    .from('payroll_items')
    .select('financial_expense_id')
    .eq('periodo_id', periodoId)
    .not('financial_expense_id', 'is', null)

  const expenseIds = Array.from(new Set((linkedItems ?? []).map((i: { financial_expense_id: string | null }) => i.financial_expense_id).filter((x): x is string => x !== null)))
  if (expenseIds.length > 0) {
    await supabase
      .from('financial_expenses')
      .update({ estatus: 'pagado', metodo_pago, referencia_pago: referencia, comprobante_url: comprobante })
      .in('id', expenseIds)
  }

  await registrarEvento({ accion: 'payroll_periodo_pagado', entidad: 'payroll_periods', entidad_id: periodoId })
  revalidatePath('/cortes')
  revalidatePath('/finanzas')
  return {}
}

export async function getMisPagos(): Promise<PayrollItem[]> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'enfermero')

  const { data: enf } = await supabase
    .from('perfiles')
    .select('enfermero_id')
    .eq('id', perfil.id)
    .single()

  if (!enf?.enfermero_id) return []

  const { data, error } = await supabase
    .from('payroll_items')
    .select(`
      *,
      turno:turnos(id, fecha_inicio, fecha_fin, status),
      caso:casos(id, titulo),
      paciente:pacientes(id, nombre, apellido),
      periodo:payroll_periods(id, nombre, fecha_inicio, fecha_fin, estado, fecha_programada_pago)
    `)
    .eq('enfermero_id', enf.enfermero_id)
    .order('created_at', { ascending: false })

  if (error) return []
  return (data ?? []) as PayrollItem[]
}

export async function getResumenPorEnfermero(periodoId: string): Promise<ResumenPagoEnfermero[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('payroll_items')
    .select(`
      *,
      enfermero:enfermeros(id, nombre, apellido, telefono),
      turno:turnos(id, fecha_inicio, fecha_fin, status),
      caso:casos(id, titulo),
      paciente:pacientes(id, nombre, apellido)
    `)
    .eq('periodo_id', periodoId)
    .neq('estado_pago', 'cancelado')
    .order('enfermero_id')

  if (error) return []

  const items = (data ?? []) as PayrollItem[]
  const mapEnfermero = new Map<string, ResumenPagoEnfermero>()

  for (const item of items) {
    const enf = item.enfermero as { id: string; nombre: string; apellido: string } | null
    if (!enf) continue
    const key = item.enfermero_id
    const existing = mapEnfermero.get(key) ?? {
      enfermero_id:       key,
      enfermero_nombre:   enf.nombre,
      enfermero_apellido: enf.apellido,
      total_turnos: 0, total_horas: 0, total_pagar: 0, items: [],
    }
    existing.total_turnos++
    existing.total_horas  += item.horas_pagables
    existing.total_pagar  += item.total_pagar
    existing.items.push(item)
    mapEnfermero.set(key, existing)
  }

  return Array.from(mapEnfermero.values())
}

export async function cancelarPayrollPeriod(periodoId: string, motivo: string): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { error } = await supabase
    .from('payroll_periods')
    .update({ estado: 'cancelado', cancelled_by: perfil.id, motivo_cancelacion: motivo })
    .eq('id', periodoId)
    .in('estado', ['borrador', 'en_revision', 'validado'])

  if (error) return { error: error.message }
  await supabase.from('payroll_items').update({ estado_pago: 'cancelado' }).eq('periodo_id', periodoId)
  await registrarEvento({ accion: 'payroll_periodo_cancelado', entidad: 'payroll_periods', entidad_id: periodoId, motivo })
  revalidatePath('/cortes')
  return {}
}
