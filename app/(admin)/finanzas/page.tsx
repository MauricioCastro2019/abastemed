import Link from 'next/link'
import { getDashboardFinanciero } from '@/lib/actions/finanzas'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  Users, Clock, FileCheck, ArrowRight, Plus,
} from 'lucide-react'
import { formatMonto } from '@/lib/finanzas-labels'

function SummaryCard({
  label, value, sub, color, icon: Icon, href,
}: {
  label: string; value: string; sub?: string
  color: 'green' | 'red' | 'yellow' | 'blue' | 'teal'
  icon: React.ElementType; href?: string
}) {
  const colors = {
    green:  { bg: '#ECFDF5', icon: '#059669', val: '#059669' },
    red:    { bg: '#FEF2F2', icon: '#DC2626', val: '#DC2626' },
    yellow: { bg: '#FFFBEB', icon: '#D97706', val: '#D97706' },
    blue:   { bg: '#EFF6FF', icon: '#2563EB', val: '#2563EB' },
    teal:   { bg: '#E0F7FA', icon: '#0097A7', val: '#0097A7' },
  }
  const c = colors[color]

  const inner = (
    <div className="bg-white rounded-xl p-5 shadow-sm h-full">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: c.bg }}>
          <Icon size={16} style={{ color: c.icon }} />
        </div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold" style={{ color: c.val }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {href && <p className="text-xs mt-2 font-medium flex items-center gap-1" style={{ color: '#2AABBF' }}>
        Ver detalle <ArrowRight size={11} />
      </p>}
    </div>
  )

  if (href) return <Link href={href} className="block hover:scale-[1.01] transition-transform">{inner}</Link>
  return inner
}

function UtilCard({ label, ingresos, salidas }: { label: string; ingresos: number; salidas: number }) {
  const util = ingresos - salidas
  const pos  = util >= 0
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <p className="text-xs text-gray-500 font-medium mb-3">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Ingresos</span>
          <span className="font-semibold" style={{ color: '#059669' }}>${formatMonto(ingresos)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Salidas</span>
          <span className="font-semibold" style={{ color: '#DC2626' }}>${formatMonto(salidas)}</span>
        </div>
        <div className="border-t border-gray-100 pt-1.5 flex justify-between text-sm">
          <span className="font-semibold" style={{ color: '#1B2B4B' }}>Utilidad est.</span>
          <span className="font-bold" style={{ color: pos ? '#059669' : '#DC2626' }}>
            {pos ? '' : '-'}${formatMonto(Math.abs(util))}
          </span>
        </div>
      </div>
    </div>
  )
}

export default async function FinanzasDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (perfil?.rol !== 'admin') redirect('/dashboard')
  }

  let data: Awaited<ReturnType<typeof getDashboardFinanciero>> | null = null
  try { data = await getDashboardFinanciero() } catch { /* sin datos aún */ }

  const d = data ?? {
    ingresos_hoy: 0, salidas_hoy: 0, utilidad_hoy: 0,
    ingresos_semana: 0, salidas_semana: 0, utilidad_semana: 0,
    ingresos_mes: 0, salidas_mes: 0, utilidad_mes: 0,
    cuentas_por_cobrar: 0, cuentas_por_pagar: 0,
    pacientes_con_adeudo: 0, pagos_pendientes_personal: 0,
    gastos_por_comprobar: 0, total_ingresos_activos: 0, total_salidas_activas: 0,
  }

  return (
    <div className="space-y-8">
      <Suspense><ToastSuccess /></Suspense>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Finanzas</h1>
          <p className="text-sm text-gray-500 mt-1">Control de ingresos, salidas y utilidad por paciente</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link href="/finanzas/ingresos/nuevo"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={15} /> Nuevo ingreso
          </Link>
          <Link href="/finanzas/salidas/nueva"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border text-gray-700 border-gray-200 hover:bg-gray-50 transition-colors">
            <Plus size={15} /> Nueva salida
          </Link>
        </div>
      </div>

      {/* Alertas rápidas */}
      {(d.cuentas_por_cobrar > 0 || d.cuentas_por_pagar > 0 || d.gastos_por_comprobar > 0) && (
        <div className="flex flex-wrap gap-3">
          {d.cuentas_por_cobrar > 0 && (
            <Link href="/finanzas/cuentas-por-cobrar"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors">
              <AlertCircle size={14} />
              ${formatMonto(d.cuentas_por_cobrar)} por cobrar
            </Link>
          )}
          {d.cuentas_por_pagar > 0 && (
            <Link href="/finanzas/cuentas-por-pagar"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              <TrendingDown size={14} />
              ${formatMonto(d.cuentas_por_pagar)} por pagar
            </Link>
          )}
          {d.gastos_por_comprobar > 0 && (
            <Link href="/finanzas/salidas"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
              <FileCheck size={14} />
              {d.gastos_por_comprobar} gasto{d.gastos_por_comprobar !== 1 ? 's' : ''} por comprobar
            </Link>
          )}
        </div>
      )}

      {/* Resumen hoy */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Hoy</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard label="Ingresos hoy" value={`$${formatMonto(d.ingresos_hoy)}`} color="green" icon={TrendingUp} />
          <SummaryCard label="Salidas hoy" value={`$${formatMonto(d.salidas_hoy)}`} color="red" icon={TrendingDown} />
          <div className="col-span-2 sm:col-span-1">
            <UtilCard label="Utilidad del día" ingresos={d.ingresos_hoy} salidas={d.salidas_hoy} />
          </div>
        </div>
      </section>

      {/* Semana / Mes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Últimos 7 días</h2>
          <div className="grid grid-cols-1 gap-3">
            <UtilCard label="Semana" ingresos={d.ingresos_semana} salidas={d.salidas_semana} />
          </div>
        </section>
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Este mes</h2>
          <div className="grid grid-cols-1 gap-3">
            <UtilCard label="Mes actual" ingresos={d.ingresos_mes} salidas={d.salidas_mes} />
          </div>
        </section>
      </div>

      {/* Indicadores clave */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Indicadores clave</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Cuentas por cobrar"
            value={`$${formatMonto(d.cuentas_por_cobrar)}`}
            sub={`${d.pacientes_con_adeudo} paciente${d.pacientes_con_adeudo !== 1 ? 's' : ''} con adeudo`}
            color="yellow" icon={AlertCircle} href="/finanzas/cuentas-por-cobrar" />
          <SummaryCard
            label="Cuentas por pagar"
            value={`$${formatMonto(d.cuentas_por_pagar)}`}
            color="red" icon={DollarSign} href="/finanzas/cuentas-por-pagar" />
          <SummaryCard
            label="Pagos pendientes personal"
            value={`$${formatMonto(d.pagos_pendientes_personal)}`}
            color="blue" icon={Users} href="/finanzas/cuentas-por-pagar" />
          <SummaryCard
            label="Gastos por comprobar"
            value={`${d.gastos_por_comprobar}`}
            sub="requieren comprobante"
            color="teal" icon={Clock} href="/finanzas/salidas" />
        </div>
      </section>

      {/* Accesos directos */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Módulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Ingresos', href: '/finanzas/ingresos', desc: 'Pagos recibidos', color: '#ECFDF5', tc: '#059669' },
            { label: 'Salidas', href: '/finanzas/salidas', desc: 'Gastos y pagos', color: '#FEF2F2', tc: '#DC2626' },
            { label: 'Por cobrar', href: '/finanzas/cuentas-por-cobrar', desc: 'Adeudos de familias', color: '#FFFBEB', tc: '#D97706' },
            { label: 'Por pagar', href: '/finanzas/cuentas-por-pagar', desc: 'Pagos pendientes', color: '#EFF6FF', tc: '#2563EB' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-xl p-4 shadow-sm hover:scale-[1.01] transition-transform block">
              <div className="w-7 h-7 rounded-lg mb-2" style={{ backgroundColor: item.color }} />
              <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
