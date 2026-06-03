import type { TipoIngreso, TipoSalida, MetodoPago, StatusIngreso, StatusSalida, FinancialIncome, FinancialExpense } from '@/types'

export const TIPO_INGRESO_LABELS: Record<TipoIngreso, string> = {
  anticipo:               'Anticipo',
  pago_servicio:          'Pago de servicio',
  pago_semanal:           'Pago semanal',
  pago_mensual:           'Pago mensual',
  pago_parcial:           'Pago parcial',
  regularizacion_adeudo:  'Regularización de adeudo',
  reembolso:              'Reembolso',
  otro_ingreso:           'Otro ingreso',
}

export const TIPO_SALIDA_LABELS: Record<TipoSalida, string> = {
  pago_enfermero:        'Pago a enfermero/a',
  pago_jefe_enfermeria:  'Pago a jefe de enfermería',
  pago_coordinador:      'Pago a coordinador',
  insumos_medicos:       'Insumos médicos',
  medicamentos:          'Medicamentos',
  traslado:              'Traslado',
  viaticos:              'Viáticos',
  comida:                'Comida',
  comision:              'Comisión',
  publicidad:            'Publicidad',
  papeleria:             'Papelería',
  equipo_medico:         'Equipo médico',
  uniformes:             'Uniformes',
  plataforma_software:   'Plataforma / Software',
  reembolso:             'Reembolso',
  otro_gasto:            'Otro gasto',
}

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo:       'Efectivo',
  transferencia:  'Transferencia',
  tarjeta:        'Tarjeta',
  deposito:       'Depósito',
  otro:           'Otro',
}

export const ESTATUS_INGRESO_LABELS: Record<StatusIngreso, string> = {
  pendiente:   'Pendiente',
  parcial:     'Parcial',
  confirmado:  'Confirmado',
  cancelado:   'Cancelado',
  en_revision: 'En revisión',
}

export const ESTATUS_SALIDA_LABELS: Record<StatusSalida, string> = {
  pendiente:     'Pendiente',
  pagado:        'Pagado',
  por_comprobar: 'Por comprobar',
  cancelado:     'Cancelado',
  en_revision:   'En revisión',
}

export const ESTATUS_INGRESO_COLORS: Record<StatusIngreso, { bg: string; text: string; border: string }> = {
  pendiente:   { bg: '#FFFBEB', text: '#D97706', border: '#D97706' },
  parcial:     { bg: '#EFF6FF', text: '#2563EB', border: '#2563EB' },
  confirmado:  { bg: '#ECFDF5', text: '#059669', border: '#059669' },
  cancelado:   { bg: '#FEF2F2', text: '#DC2626', border: '#DC2626' },
  en_revision: { bg: '#F5F3FF', text: '#7C3AED', border: '#7C3AED' },
}

export const ESTATUS_SALIDA_COLORS: Record<StatusSalida, { bg: string; text: string; border: string }> = {
  pendiente:     { bg: '#FFFBEB', text: '#D97706', border: '#D97706' },
  pagado:        { bg: '#ECFDF5', text: '#059669', border: '#059669' },
  por_comprobar: { bg: '#FFF7ED', text: '#EA580C', border: '#EA580C' },
  cancelado:     { bg: '#FEF2F2', text: '#DC2626', border: '#DC2626' },
  en_revision:   { bg: '#F5F3FF', text: '#7C3AED', border: '#7C3AED' },
}

export const TIPOS_INGRESO_OPTIONS = Object.entries(TIPO_INGRESO_LABELS).map(
  ([value, label]) => ({ value, label })
)

export const TIPOS_SALIDA_OPTIONS = Object.entries(TIPO_SALIDA_LABELS).map(
  ([value, label]) => ({ value, label })
)

export const METODOS_PAGO_OPTIONS = Object.entries(METODO_PAGO_LABELS).map(
  ([value, label]) => ({ value, label })
)

export function formatMonto(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatFecha(f: string): string {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Cálculos financieros (funciones puras) ───────────────────────────────────

export function totalIngresosConfirmados(incomes: FinancialIncome[]): number {
  return incomes
    .filter(i => i.estatus === 'confirmado' || i.estatus === 'parcial')
    .reduce((s, i) => s + i.monto_recibido, 0)
}

export function totalIngresosPendientes(incomes: FinancialIncome[]): number {
  return incomes
    .filter(i => i.estatus !== 'cancelado')
    .reduce((s, i) => s + Math.max(0, i.monto_total - i.monto_recibido), 0)
}

export function totalSalidasPagadas(expenses: FinancialExpense[]): number {
  return expenses
    .filter(e => e.estatus === 'pagado' || e.estatus === 'por_comprobar')
    .reduce((s, e) => s + e.monto, 0)
}

export function totalSalidasPendientes(expenses: FinancialExpense[]): number {
  return expenses
    .filter(e => e.estatus === 'pendiente' || e.estatus === 'en_revision')
    .reduce((s, e) => s + e.monto, 0)
}

export function utilidadEstimada(ingresos: number, salidas: number): number {
  return ingresos - salidas
}

export function margenEstimado(ingresos: number, salidas: number): number {
  if (ingresos === 0) return 0
  return ((ingresos - salidas) / ingresos) * 100
}

export function gastosPorComprobarCount(expenses: FinancialExpense[]): number {
  return expenses.filter(e => e.estatus === 'por_comprobar').length
}

export function pagosPendientesPersonalMonto(expenses: FinancialExpense[]): number {
  return expenses
    .filter(
      e =>
        e.estatus === 'pendiente' &&
        ['pago_enfermero', 'pago_jefe_enfermeria', 'pago_coordinador'].includes(e.tipo_salida)
    )
    .reduce((s, e) => s + e.monto, 0)
}
