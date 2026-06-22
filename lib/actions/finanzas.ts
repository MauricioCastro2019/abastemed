'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type {
  FinancialIncome,
  FinancialExpense,
  BalancePaciente,
  DashboardFinanciero,
  Paciente,
} from '@/types'
import { requireAuth, requireRole, fd, fdNum, type ActionResult, zodActionError, DEFAULT_ORG_ID } from './utils'
import { IngresoSchema, SalidaSchema } from '@/lib/validations'

// ─── Folio generators ────────────────────────────────────────────────────────

async function generarFolioIngreso(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
): Promise<string> {
  const { count } = await supabase
    .from('financial_incomes')
    .select('*', { count: 'exact', head: true })
  const n = String((count ?? 0) + 1).padStart(4, '0')
  return `ING-${n}`
}

async function generarFolioSalida(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
): Promise<string> {
  const { count } = await supabase
    .from('financial_expenses')
    .select('*', { count: 'exact', head: true })
  const n = String((count ?? 0) + 1).padStart(4, '0')
  return `SAL-${n}`
}

function calcularEstatusIngreso(total: number, recibido: number): string {
  if (recibido <= 0) return 'pendiente'
  if (recibido >= total) return 'confirmado'
  return 'parcial'
}

// ─── Data for select dropdowns ────────────────────────────────────────────────

export async function getPacientesParaSelect() {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('pacientes')
    .select('id, nombre, apellido')
    .eq('status', 'activo')
    .order('nombre')
  return (data ?? []) as Array<{ id: string; nombre: string; apellido: string }>
}

export async function getCasosParaSelect() {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('casos')
    .select('id, titulo')
    .eq('status', 'activo')
    .order('titulo')
  return (data ?? []) as Array<{ id: string; titulo: string }>
}

export async function getEnfermerosParaSelect() {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('enfermeros')
    .select('id, nombre, apellido')
    .order('nombre')
  return (data ?? []) as Array<{ id: string; nombre: string; apellido: string }>
}

// ─── INGRESOS — CRUD ──────────────────────────────────────────────────────────

export type IngresosFilter = {
  paciente_id?: string
  caso_id?: string
  estatus?: string
  tipo_ingreso?: string
  fecha_inicio?: string
  fecha_fin?: string
  q?: string
}

export async function getIngresos(filters?: IngresosFilter): Promise<FinancialIncome[]> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  let query = supabase
    .from('financial_incomes')
    .select('*, paciente:pacientes(id,nombre,apellido), caso:casos(id,titulo)')
    .order('created_at', { ascending: false })

  if (filters?.paciente_id)  query = query.eq('paciente_id', filters.paciente_id)
  if (filters?.caso_id)      query = query.eq('caso_id', filters.caso_id)
  if (filters?.estatus)      query = query.eq('estatus', filters.estatus)
  if (filters?.tipo_ingreso) query = query.eq('tipo_ingreso', filters.tipo_ingreso)
  if (filters?.fecha_inicio) query = query.gte('fecha_pago', filters.fecha_inicio)
  if (filters?.fecha_fin)    query = query.lte('fecha_pago', filters.fecha_fin)
  if (filters?.q) {
    query = query.or(
      `folio.ilike.%${filters.q}%,concepto.ilike.%${filters.q}%,responsable_pago_nombre.ilike.%${filters.q}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as FinancialIncome[]
}

export async function getIngreso(id: string): Promise<FinancialIncome> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { data, error } = await supabase
    .from('financial_incomes')
    .select('*, paciente:pacientes(id,nombre,apellido), caso:casos(id,titulo)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as FinancialIncome
}

export async function crearIngreso(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const parsed = IngresoSchema.safeParse({
    fecha_pago:                fd(formData, 'fecha_pago'),
    paciente_id:               fd(formData, 'paciente_id'),
    caso_id:                   fd(formData, 'caso_id'),
    responsable_pago_nombre:   fd(formData, 'responsable_pago_nombre'),
    responsable_pago_contacto: fd(formData, 'responsable_pago_contacto'),
    concepto:                  fd(formData, 'concepto'),
    tipo_ingreso:              fd(formData, 'tipo_ingreso'),
    periodo_cubierto_inicio:   fd(formData, 'periodo_cubierto_inicio'),
    periodo_cubierto_fin:      fd(formData, 'periodo_cubierto_fin'),
    fecha_limite_pago:         fd(formData, 'fecha_limite_pago'),
    monto_total:               fdNum(formData, 'monto_total'),
    monto_recibido:            fdNum(formData, 'monto_recibido'),
    metodo_pago:               fd(formData, 'metodo_pago'),
    cuenta_receptora:          fd(formData, 'cuenta_receptora'),
    referencia_pago:           fd(formData, 'referencia_pago'),
    observaciones:             fd(formData, 'observaciones'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const folio = await generarFolioIngreso(supabase)
  const d = parsed.data

  const { error } = await supabase.from('financial_incomes').insert({
    folio,
    fecha_pago:                d.fecha_pago,
    paciente_id:               d.paciente_id || null,
    caso_id:                   d.caso_id || null,
    responsable_pago_nombre:   d.responsable_pago_nombre,
    responsable_pago_contacto: d.responsable_pago_contacto || null,
    concepto:                  d.concepto,
    tipo_ingreso:              d.tipo_ingreso,
    periodo_cubierto_inicio:   d.periodo_cubierto_inicio || null,
    periodo_cubierto_fin:      d.periodo_cubierto_fin || null,
    fecha_limite_pago:         d.fecha_limite_pago || null,
    monto_total:               d.monto_total,
    monto_recibido:            d.monto_recibido,
    metodo_pago:               d.metodo_pago,
    cuenta_receptora:          d.cuenta_receptora || null,
    referencia_pago:           d.referencia_pago || null,
    observaciones:             d.observaciones || null,
    estatus:                   calcularEstatusIngreso(d.monto_total, d.monto_recibido),
    registrado_por:            perfil.id,
    organization_id:           DEFAULT_ORG_ID,
  })

  if (error) return { error: error.message }

  revalidatePath('/finanzas')
  revalidatePath('/finanzas/ingresos')
  redirect('/finanzas/ingresos')
}

export async function actualizarIngreso(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { data: existing } = await supabase
    .from('financial_incomes').select('estatus').eq('id', id).single()
  if (existing?.estatus === 'cancelado') return { error: 'No se puede editar un ingreso cancelado' }

  const parsed = IngresoSchema.safeParse({
    fecha_pago:                fd(formData, 'fecha_pago'),
    paciente_id:               fd(formData, 'paciente_id'),
    caso_id:                   fd(formData, 'caso_id'),
    responsable_pago_nombre:   fd(formData, 'responsable_pago_nombre'),
    responsable_pago_contacto: fd(formData, 'responsable_pago_contacto'),
    concepto:                  fd(formData, 'concepto'),
    tipo_ingreso:              fd(formData, 'tipo_ingreso'),
    periodo_cubierto_inicio:   fd(formData, 'periodo_cubierto_inicio'),
    periodo_cubierto_fin:      fd(formData, 'periodo_cubierto_fin'),
    fecha_limite_pago:         fd(formData, 'fecha_limite_pago'),
    monto_total:               fdNum(formData, 'monto_total'),
    monto_recibido:            fdNum(formData, 'monto_recibido'),
    metodo_pago:               fd(formData, 'metodo_pago'),
    cuenta_receptora:          fd(formData, 'cuenta_receptora'),
    referencia_pago:           fd(formData, 'referencia_pago'),
    observaciones:             fd(formData, 'observaciones'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const d = parsed.data
  const { error } = await supabase
    .from('financial_incomes')
    .update({
      fecha_pago:                d.fecha_pago,
      paciente_id:               d.paciente_id || null,
      caso_id:                   d.caso_id || null,
      responsable_pago_nombre:   d.responsable_pago_nombre,
      responsable_pago_contacto: d.responsable_pago_contacto || null,
      concepto:                  d.concepto,
      tipo_ingreso:              d.tipo_ingreso,
      periodo_cubierto_inicio:   d.periodo_cubierto_inicio || null,
      periodo_cubierto_fin:      d.periodo_cubierto_fin || null,
      fecha_limite_pago:         d.fecha_limite_pago || null,
      monto_total:               d.monto_total,
      monto_recibido:            d.monto_recibido,
      metodo_pago:               d.metodo_pago,
      cuenta_receptora:          d.cuenta_receptora || null,
      referencia_pago:           d.referencia_pago || null,
      observaciones:             d.observaciones || null,
      estatus:                   calcularEstatusIngreso(d.monto_total, d.monto_recibido),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/finanzas')
  revalidatePath('/finanzas/ingresos')
  revalidatePath(`/finanzas/ingresos/${id}`)
  redirect(`/finanzas/ingresos/${id}`)
}

export async function cancelarIngreso(id: string, motivo: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  if (!motivo.trim()) return { error: 'El motivo de cancelación es requerido' }

  const { error } = await supabase
    .from('financial_incomes')
    .update({
      estatus:             'cancelado',
      cancelado_por:       perfil.id,
      motivo_cancelacion:  motivo.trim(),
      fecha_cancelacion:   new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/finanzas')
  revalidatePath('/finanzas/ingresos')
  revalidatePath(`/finanzas/ingresos/${id}`)
  revalidatePath('/finanzas/cuentas-por-cobrar')
  return {}
}

// ─── SALIDAS — CRUD ───────────────────────────────────────────────────────────

export type SalidasFilter = {
  paciente_id?: string
  caso_id?: string
  estatus?: string
  tipo_salida?: string
  fecha_inicio?: string
  fecha_fin?: string
  q?: string
}

export async function getSalidas(filters?: SalidasFilter): Promise<FinancialExpense[]> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  let query = supabase
    .from('financial_expenses')
    .select(
      '*, paciente:pacientes(id,nombre,apellido), caso:casos(id,titulo), enfermero:enfermeros(id,nombre,apellido)'
    )
    .order('created_at', { ascending: false })

  if (filters?.paciente_id) query = query.eq('paciente_id', filters.paciente_id)
  if (filters?.caso_id)     query = query.eq('caso_id', filters.caso_id)
  if (filters?.estatus)     query = query.eq('estatus', filters.estatus)
  if (filters?.tipo_salida) query = query.eq('tipo_salida', filters.tipo_salida)
  if (filters?.fecha_inicio) query = query.gte('fecha_salida', filters.fecha_inicio)
  if (filters?.fecha_fin)   query = query.lte('fecha_salida', filters.fecha_fin)
  if (filters?.q) {
    query = query.or(
      `folio.ilike.%${filters.q}%,concepto.ilike.%${filters.q}%,beneficiario_nombre.ilike.%${filters.q}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as FinancialExpense[]
}

export async function getSalida(id: string): Promise<FinancialExpense> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { data, error } = await supabase
    .from('financial_expenses')
    .select(
      '*, paciente:pacientes(id,nombre,apellido), caso:casos(id,titulo), enfermero:enfermeros(id,nombre,apellido)'
    )
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as FinancialExpense
}

export async function crearSalida(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const parsed = SalidaSchema.safeParse({
    fecha_salida:          fd(formData, 'fecha_salida'),
    tipo_salida:           fd(formData, 'tipo_salida'),
    beneficiario_nombre:   fd(formData, 'beneficiario_nombre'),
    beneficiario_contacto: fd(formData, 'beneficiario_contacto'),
    enfermero_id:          fd(formData, 'enfermero_id'),
    paciente_id:           fd(formData, 'paciente_id'),
    caso_id:               fd(formData, 'caso_id'),
    concepto:              fd(formData, 'concepto'),
    monto:                 fdNum(formData, 'monto'),
    metodo_pago:           fd(formData, 'metodo_pago'),
    cuenta_origen:         fd(formData, 'cuenta_origen'),
    referencia_pago:       fd(formData, 'referencia_pago'),
    estatus:               fd(formData, 'estatus') || 'pendiente',
    observaciones:         fd(formData, 'observaciones'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const folio = await generarFolioSalida(supabase)
  const d = parsed.data

  const { error } = await supabase.from('financial_expenses').insert({
    folio,
    fecha_salida:          d.fecha_salida,
    tipo_salida:           d.tipo_salida,
    beneficiario_nombre:   d.beneficiario_nombre,
    beneficiario_contacto: d.beneficiario_contacto || null,
    enfermero_id:          d.enfermero_id || null,
    paciente_id:           d.paciente_id || null,
    caso_id:               d.caso_id || null,
    concepto:              d.concepto,
    monto:                 d.monto,
    metodo_pago:           d.metodo_pago,
    cuenta_origen:         d.cuenta_origen || null,
    referencia_pago:       d.referencia_pago || null,
    observaciones:         d.observaciones || null,
    estatus:               d.estatus ?? 'pendiente',
    registrado_por:        perfil.id,
    organization_id:       DEFAULT_ORG_ID,
  })

  if (error) return { error: error.message }

  revalidatePath('/finanzas')
  revalidatePath('/finanzas/salidas')
  redirect('/finanzas/salidas')
}

export async function actualizarSalida(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { data: existing } = await supabase
    .from('financial_expenses').select('estatus').eq('id', id).single()
  if (existing?.estatus === 'cancelado') return { error: 'No se puede editar una salida cancelada' }

  const parsed = SalidaSchema.safeParse({
    fecha_salida:          fd(formData, 'fecha_salida'),
    tipo_salida:           fd(formData, 'tipo_salida'),
    beneficiario_nombre:   fd(formData, 'beneficiario_nombre'),
    beneficiario_contacto: fd(formData, 'beneficiario_contacto'),
    enfermero_id:          fd(formData, 'enfermero_id'),
    paciente_id:           fd(formData, 'paciente_id'),
    caso_id:               fd(formData, 'caso_id'),
    concepto:              fd(formData, 'concepto'),
    monto:                 fdNum(formData, 'monto'),
    metodo_pago:           fd(formData, 'metodo_pago'),
    cuenta_origen:         fd(formData, 'cuenta_origen'),
    referencia_pago:       fd(formData, 'referencia_pago'),
    estatus:               fd(formData, 'estatus') || 'pendiente',
    observaciones:         fd(formData, 'observaciones'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const d = parsed.data
  const { error } = await supabase
    .from('financial_expenses')
    .update({
      fecha_salida:          d.fecha_salida,
      tipo_salida:           d.tipo_salida,
      beneficiario_nombre:   d.beneficiario_nombre,
      beneficiario_contacto: d.beneficiario_contacto || null,
      enfermero_id:          d.enfermero_id || null,
      paciente_id:           d.paciente_id || null,
      caso_id:               d.caso_id || null,
      concepto:              d.concepto,
      monto:                 d.monto,
      metodo_pago:           d.metodo_pago,
      cuenta_origen:         d.cuenta_origen || null,
      referencia_pago:       d.referencia_pago || null,
      observaciones:         d.observaciones || null,
      estatus:               d.estatus ?? 'pendiente',
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/finanzas')
  revalidatePath('/finanzas/salidas')
  revalidatePath(`/finanzas/salidas/${id}`)
  redirect(`/finanzas/salidas/${id}`)
}

export async function cancelarSalida(id: string, motivo: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  if (!motivo.trim()) return { error: 'El motivo de cancelación es requerido' }

  const { error } = await supabase
    .from('financial_expenses')
    .update({
      estatus:            'cancelado',
      cancelado_por:      perfil.id,
      motivo_cancelacion: motivo.trim(),
      fecha_cancelacion:  new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/finanzas')
  revalidatePath('/finanzas/salidas')
  revalidatePath(`/finanzas/salidas/${id}`)
  revalidatePath('/finanzas/cuentas-por-pagar')
  return {}
}

export async function marcarSalidaPagada(id: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { error } = await supabase
    .from('financial_expenses')
    .update({ estatus: 'pagado' })
    .eq('id', id)
    .neq('estatus', 'cancelado')

  if (error) return { error: error.message }

  revalidatePath('/finanzas')
  revalidatePath('/finanzas/salidas')
  revalidatePath(`/finanzas/salidas/${id}`)
  revalidatePath('/finanzas/cuentas-por-pagar')
  return {}
}

export async function marcarSalidaPorComprobar(id: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { error } = await supabase
    .from('financial_expenses')
    .update({ estatus: 'por_comprobar' })
    .eq('id', id)
    .neq('estatus', 'cancelado')

  if (error) return { error: error.message }

  revalidatePath('/finanzas')
  revalidatePath('/finanzas/salidas')
  revalidatePath(`/finanzas/salidas/${id}`)
  return {}
}

// ─── DASHBOARD FINANCIERO ─────────────────────────────────────────────────────

export async function getDashboardFinanciero(): Promise<DashboardFinanciero> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const hoy         = new Date().toISOString().split('T')[0]
  const inicioSemana = new Date(Date.now() - 6 * 86_400_000).toISOString().split('T')[0]
  const inicioMes   = hoy.slice(0, 8) + '01'

  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase.from('financial_incomes').select('*').neq('estatus', 'cancelado'),
    supabase.from('financial_expenses').select('*').neq('estatus', 'cancelado'),
  ])

  const allI = (incomes  ?? []) as FinancialIncome[]
  const allE = (expenses ?? []) as FinancialExpense[]

  const sumaI = (list: FinancialIncome[]) =>
    list
      .filter(i => i.estatus === 'confirmado' || i.estatus === 'parcial')
      .reduce((s, i) => s + i.monto_recibido, 0)

  const sumaE = (list: FinancialExpense[]) =>
    list
      .filter(e => e.estatus === 'pagado' || e.estatus === 'por_comprobar')
      .reduce((s, e) => s + e.monto, 0)

  const iHoy    = allI.filter(i => i.fecha_pago === hoy)
  const eHoy    = allE.filter(e => e.fecha_salida === hoy)
  const iSemana = allI.filter(i => i.fecha_pago >= inicioSemana)
  const eSemana = allE.filter(e => e.fecha_salida >= inicioSemana)
  const iMes    = allI.filter(i => i.fecha_pago >= inicioMes)
  const eMes    = allE.filter(e => e.fecha_salida >= inicioMes)

  const cxc = allI
    .filter(i => i.estatus === 'pendiente' || i.estatus === 'parcial')
    .reduce((s, i) => s + Math.max(0, i.monto_total - i.monto_recibido), 0)

  const cxp = allE
    .filter(e => e.estatus === 'pendiente')
    .reduce((s, e) => s + e.monto, 0)

  const pacientesConAdeudo = new Set(
    allI
      .filter(i => (i.estatus === 'pendiente' || i.estatus === 'parcial') && i.paciente_id)
      .map(i => i.paciente_id)
  ).size

  const pagosPendientesPersonal = allE
    .filter(
      e =>
        e.estatus === 'pendiente' &&
        ['pago_enfermero', 'pago_jefe_enfermeria', 'pago_coordinador'].includes(e.tipo_salida)
    )
    .reduce((s, e) => s + e.monto, 0)

  const gastosPorComprobar = allE.filter(e => e.estatus === 'por_comprobar').length

  return {
    ingresos_hoy:               sumaI(iHoy),
    salidas_hoy:                sumaE(eHoy),
    utilidad_hoy:               sumaI(iHoy) - sumaE(eHoy),
    ingresos_semana:            sumaI(iSemana),
    salidas_semana:             sumaE(eSemana),
    utilidad_semana:            sumaI(iSemana) - sumaE(eSemana),
    ingresos_mes:               sumaI(iMes),
    salidas_mes:                sumaE(eMes),
    utilidad_mes:               sumaI(iMes) - sumaE(eMes),
    cuentas_por_cobrar:         cxc,
    cuentas_por_pagar:          cxp,
    pacientes_con_adeudo:       pacientesConAdeudo,
    pagos_pendientes_personal:  pagosPendientesPersonal,
    gastos_por_comprobar:       gastosPorComprobar,
    total_ingresos_activos:     sumaI(allI),
    total_salidas_activas:      sumaE(allE),
  }
}

// ─── CUENTAS POR COBRAR ───────────────────────────────────────────────────────

export async function getCuentasPorCobrar(): Promise<FinancialIncome[]> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { data, error } = await supabase
    .from('financial_incomes')
    .select('*, paciente:pacientes(id,nombre,apellido), caso:casos(id,titulo)')
    .in('estatus', ['pendiente', 'parcial', 'en_revision'])
    .order('fecha_limite_pago', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as FinancialIncome[]
}

// ─── CUENTAS POR PAGAR ────────────────────────────────────────────────────────

export async function getCuentasPorPagar(): Promise<FinancialExpense[]> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')
  const { data, error } = await supabase
    .from('financial_expenses')
    .select(
      '*, paciente:pacientes(id,nombre,apellido), caso:casos(id,titulo), enfermero:enfermeros(id,nombre,apellido)'
    )
    .in('estatus', ['pendiente', 'por_comprobar', 'en_revision'])
    .order('fecha_salida', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as FinancialExpense[]
}

// ─── BALANCE POR PACIENTE ──────────────────────────────────────────────────────

export async function getBalancePaciente(pacienteId: string): Promise<BalancePaciente> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const [{ data: paciente }, { data: incomes }, { data: expenses }] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', pacienteId).single(),
    supabase
      .from('financial_incomes')
      .select('*, caso:casos(id,titulo)')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false }),
    supabase
      .from('financial_expenses')
      .select('*, caso:casos(id,titulo)')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false }),
  ])

  if (!paciente) throw new Error('Paciente no encontrado')

  const allI = (incomes  ?? []) as FinancialIncome[]
  const allE = (expenses ?? []) as FinancialExpense[]
  const actI = allI.filter(i => i.estatus !== 'cancelado')
  const actE = allE.filter(e => e.estatus !== 'cancelado')

  const ingresosConfirmados = actI
    .filter(i => i.estatus === 'confirmado' || i.estatus === 'parcial')
    .reduce((s, i) => s + i.monto_recibido, 0)

  const ingresosParciales = actI
    .filter(i => i.estatus === 'parcial')
    .reduce((s, i) => s + Math.max(0, i.monto_total - i.monto_recibido), 0)

  const ingresosPendientes = actI
    .filter(i => i.estatus === 'pendiente')
    .reduce((s, i) => s + i.monto_total, 0)

  const salidasPagadas = actE
    .filter(e => e.estatus === 'pagado' || e.estatus === 'por_comprobar')
    .reduce((s, e) => s + e.monto, 0)

  const salidasPendientes = actE
    .filter(e => e.estatus === 'pendiente' || e.estatus === 'en_revision')
    .reduce((s, e) => s + e.monto, 0)

  const utilidad = ingresosConfirmados - salidasPagadas
  const margen   = ingresosConfirmados > 0 ? (utilidad / ingresosConfirmados) * 100 : 0

  return {
    paciente:            paciente as Paciente,
    ingresos_confirmados: ingresosConfirmados,
    ingresos_parciales:   ingresosParciales,
    ingresos_pendientes:  ingresosPendientes,
    total_por_cobrar:    ingresosParciales + ingresosPendientes,
    salidas_pagadas:     salidasPagadas,
    salidas_pendientes:  salidasPendientes,
    utilidad_estimada:   utilidad,
    margen_estimado:     margen,
    incomes:             allI,
    expenses:            allE,
  }
}

// ─── BALANCE POR CASO/SERVICIO ────────────────────────────────────────────────

export async function getBalanceCaso(casoId: string) {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const [{ data: caso }, { data: incomes }, { data: expenses }] = await Promise.all([
    supabase
      .from('casos')
      .select('*, paciente:pacientes(id,nombre,apellido)')
      .eq('id', casoId)
      .single(),
    supabase
      .from('financial_incomes')
      .select('*')
      .eq('caso_id', casoId)
      .order('created_at', { ascending: false }),
    supabase
      .from('financial_expenses')
      .select('*')
      .eq('caso_id', casoId)
      .order('created_at', { ascending: false }),
  ])

  if (!caso) throw new Error('Caso no encontrado')

  const allI = (incomes  ?? []) as FinancialIncome[]
  const allE = (expenses ?? []) as FinancialExpense[]
  const actI = allI.filter(i => i.estatus !== 'cancelado')
  const actE = allE.filter(e => e.estatus !== 'cancelado')

  const ingresosConfirmados = actI
    .filter(i => i.estatus === 'confirmado' || i.estatus === 'parcial')
    .reduce((s, i) => s + i.monto_recibido, 0)

  const salidasPagadas = actE
    .filter(e => e.estatus === 'pagado' || e.estatus === 'por_comprobar')
    .reduce((s, e) => s + e.monto, 0)

  const totalPorCobrar = actI
    .filter(i => i.estatus === 'pendiente' || i.estatus === 'parcial')
    .reduce((s, i) => s + Math.max(0, i.monto_total - i.monto_recibido), 0)

  const utilidad = ingresosConfirmados - salidasPagadas
  const margen   = ingresosConfirmados > 0 ? (utilidad / ingresosConfirmados) * 100 : 0

  return {
    caso,
    ingresosConfirmados,
    salidasPagadas,
    totalPorCobrar,
    utilidad,
    margen,
    incomes: allI,
    expenses: allE,
  }
}

// ─── SEEDERS DE PRUEBA ────────────────────────────────────────────────────────

export async function cargarDatosPrueba(): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { data: pacientes } = await supabase
    .from('pacientes').select('id,nombre').limit(2)
  const { data: casos } = await supabase
    .from('casos').select('id').limit(2)

  const pac1 = pacientes?.[0]?.id ?? null
  const pac2 = pacientes?.[1]?.id ?? null
  const caso1 = casos?.[0]?.id ?? null

  const foliosI = ['ING-DEMO1', 'ING-DEMO2', 'ING-DEMO3']
  const foliosE = ['SAL-DEMO1', 'SAL-DEMO2', 'SAL-DEMO3', 'SAL-DEMO4']

  const hoy = new Date().toISOString().split('T')[0]

  await supabase.from('financial_incomes').upsert([
    {
      folio: foliosI[0], fecha_pago: hoy, paciente_id: pac1, caso_id: caso1,
      responsable_pago_nombre: 'María García', concepto: 'Pago semanal enfermería',
      tipo_ingreso: 'pago_semanal', monto_total: 6000, monto_recibido: 4500,
      metodo_pago: 'transferencia', estatus: 'parcial', registrado_por: perfil.id,
    },
    {
      folio: foliosI[1], fecha_pago: hoy, paciente_id: pac2,
      responsable_pago_nombre: 'Roberto Torres', concepto: 'Anticipo de servicio mensual',
      tipo_ingreso: 'anticipo', monto_total: 10000, monto_recibido: 10000,
      metodo_pago: 'deposito', estatus: 'confirmado', registrado_por: perfil.id,
    },
    {
      folio: foliosI[2], fecha_pago: hoy, paciente_id: pac1,
      responsable_pago_nombre: 'María García', concepto: 'Segunda semana de servicio',
      tipo_ingreso: 'pago_servicio', monto_total: 6000, monto_recibido: 0,
      metodo_pago: 'efectivo', estatus: 'pendiente', registrado_por: perfil.id,
    },
  ], { onConflict: 'folio', ignoreDuplicates: true })

  const { data: enfermeros } = await supabase
    .from('enfermeros').select('id').limit(2)
  const enf1 = enfermeros?.[0]?.id ?? null
  const enf2 = enfermeros?.[1]?.id ?? null

  await supabase.from('financial_expenses').upsert([
    {
      folio: foliosE[0], fecha_salida: hoy, tipo_salida: 'pago_enfermero',
      beneficiario_nombre: 'Enfermera Ana López', enfermero_id: enf1,
      paciente_id: pac1, caso_id: caso1,
      concepto: 'Guardia diurna 12h', monto: 950, metodo_pago: 'transferencia',
      estatus: 'pagado', registrado_por: perfil.id,
    },
    {
      folio: foliosE[1], fecha_salida: hoy, tipo_salida: 'pago_enfermero',
      beneficiario_nombre: 'Enfermero Carlos Ruiz', enfermero_id: enf2,
      paciente_id: pac1,
      concepto: 'Guardia nocturna 12h', monto: 900, metodo_pago: 'efectivo',
      estatus: 'pendiente', registrado_por: perfil.id,
    },
    {
      folio: foliosE[2], fecha_salida: hoy, tipo_salida: 'insumos_medicos',
      beneficiario_nombre: 'Farmacia del Centro', paciente_id: pac1,
      concepto: 'Insumos para curación: gasas, micropore, isodine',
      monto: 350, metodo_pago: 'efectivo',
      estatus: 'por_comprobar', registrado_por: perfil.id,
    },
    {
      folio: foliosE[3], fecha_salida: hoy, tipo_salida: 'traslado',
      beneficiario_nombre: 'Uber / Traslado', paciente_id: pac2,
      concepto: 'Traslado enfermera a domicilio del paciente',
      monto: 180, metodo_pago: 'efectivo',
      estatus: 'pagado', registrado_por: perfil.id,
    },
  ], { onConflict: 'folio', ignoreDuplicates: true })

  revalidatePath('/finanzas')
  return {}
}
