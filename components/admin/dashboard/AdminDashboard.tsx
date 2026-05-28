import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FolderOpen, Stethoscope, Calendar, Receipt, TrendingUp,
  Clock, CheckCircle, AlertCircle, Plus, ClipboardCheck, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import type { MetricasDashboard } from '@/types'

async function getMetricas(): Promise<MetricasDashboard & { levantamientos_pendientes: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    return { casos_activos: 1, enfermeros_disponibles: 3, turnos_hoy: 2, cobranza_pendiente: 0, levantamientos_pendientes: 0 }
  }
  try {
    const supabase = await createClient()
    const hoy = new Date().toISOString().split('T')[0]
    const [casosRes, enfermerosRes, turnosRes, cobranzaRes, levRes] = await Promise.all([
      supabase.from('casos').select('id', { count: 'exact' }).eq('status', 'activo'),
      supabase.from('enfermeros').select('id', { count: 'exact' }).eq('disponible', true),
      supabase.from('turnos').select('id', { count: 'exact' })
        .gte('fecha_inicio', hoy).lte('fecha_inicio', hoy + 'T23:59:59'),
      supabase.from('cobranza_items').select('subtotal').eq('status', 'pendiente'),
      supabase.from('levantamientos_paciente').select('id', { count: 'exact' })
        .eq('estado', 'pendiente_revision'),
    ])
    const cobranza_pendiente = (cobranzaRes.data ?? []).reduce((acc, i) => acc + (i.subtotal ?? 0), 0)
    return {
      casos_activos:            casosRes.count ?? 0,
      enfermeros_disponibles:   enfermerosRes.count ?? 0,
      turnos_hoy:               turnosRes.count ?? 0,
      cobranza_pendiente,
      levantamientos_pendientes: levRes.count ?? 0,
    }
  } catch {
    return { casos_activos: 0, enfermeros_disponibles: 0, turnos_hoy: 0, cobranza_pendiente: 0, levantamientos_pendientes: 0 }
  }
}

async function getUltimosTurnos() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('turnos')
      .select('id, status, fecha_inicio, caso:casos(titulo), enfermero:enfermeros(nombre, apellido)')
      .order('fecha_inicio', { ascending: false })
      .limit(5)
    return data ?? []
  } catch { return [] }
}

async function getUltimosLevantamientos() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('levantamientos_paciente')
      .select('id, paciente_nombre, paciente_apellido, estado, riesgo_final, prioridad, created_at')
      .order('created_at', { ascending: false })
      .limit(4)
    return data ?? []
  } catch { return [] }
}

async function UltimosTurnos() {
  const turnos = await getUltimosTurnos()

  const STATUS_COLOR: Record<string, { color: string; label: string }> = {
    programado: { color: '#2AABBF', label: 'Programado' },
    activo:     { color: '#059669', label: 'En curso' },
    completado: { color: '#6b7280', label: 'Completado' },
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: '#1B2B4B' }}>
            <Clock size={16} style={{ color: '#2AABBF' }} />
            Últimos turnos
          </CardTitle>
          <Link href="/turnos" className="text-xs font-medium hover:underline" style={{ color: '#2AABBF' }}>
            Ver todos →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {turnos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Sin turnos registrados aún</p>
        ) : (
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {turnos.map((t: any) => {
              const st = STATUS_COLOR[t.status as string] ?? STATUS_COLOR.programado
              const Icon = t.status === 'completado' ? CheckCircle : t.status === 'activo' ? AlertCircle : Clock
              const casoTitulo  = Array.isArray(t.caso) ? t.caso[0]?.titulo : t.caso?.titulo
              const enfNombre   = Array.isArray(t.enfermero) ? t.enfermero[0]?.nombre : t.enfermero?.nombre
              const enfApellido = Array.isArray(t.enfermero) ? t.enfermero[0]?.apellido : t.enfermero?.apellido
              return (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <Icon size={14} style={{ color: st.color }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>
                      {casoTitulo ?? 'Turno'}
                    </p>
                    <p className="text-xs text-gray-400">{enfNombre} {enfApellido}</p>
                  </div>
                  <span className="text-xs flex-shrink-0 font-medium" style={{ color: st.color }}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

async function UltimosLevantamientos() {
  const levs = await getUltimosLevantamientos()

  const RIESGO: Record<string, { bg: string; text: string }> = {
    bajo:  { bg: '#DCFCE7', text: '#166534' },
    medio: { bg: '#FEF9C3', text: '#854D0E' },
    alto:  { bg: '#FEE2E2', text: '#991B1B' },
  }
  const ESTADO: Record<string, string> = {
    borrador:           'Borrador',
    pendiente_revision: 'Pendiente',
    revisado:           'Revisado',
    aprobado:           'Aprobado',
    convertido:         'Convertido',
    cancelado:          'Cancelado',
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: '#1B2B4B' }}>
            <ClipboardCheck size={16} style={{ color: '#2AABBF' }} />
            Últimos levantamientos
          </CardTitle>
          <Link href="/levantamientos" className="text-xs font-medium hover:underline" style={{ color: '#2AABBF' }}>
            Ver todos →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {levs.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 mb-2">Sin levantamientos aún</p>
            <Link href="/levantamientos/nuevo"
              className="text-xs font-medium hover:underline"
              style={{ color: '#2AABBF' }}>
              + Iniciar el primero
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {levs.map((l: any) => {
              const r = RIESGO[l.riesgo_final as string] ?? RIESGO.bajo
              return (
                <Link key={l.id} href={`/levantamientos/${l.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-all group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: '#1B2B4B' }}>
                    {(l.paciente_nombre as string)?.[0]}{(l.paciente_apellido as string)?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>
                      {l.paciente_nombre} {l.paciente_apellido}
                    </p>
                    <p className="text-xs text-gray-400">{ESTADO[l.estado as string] ?? l.estado}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: r.bg, color: r.text }}>
                    {(l.riesgo_final as string)?.charAt(0).toUpperCase() + (l.riesgo_final as string)?.slice(1)}
                  </span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatValue(value: number, format?: string) {
  return format === 'currency'
    ? value.toLocaleString('es-VE', { minimumFractionDigits: 2 })
    : value.toString()
}

const METRICAS_CONFIG = [
  { key: 'casos_activos' as const,          label: 'Casos Activos',          icon: FolderOpen,  color: '#2AABBF', bg: '#EBF8FB', descripcion: 'pacientes en tratamiento' },
  { key: 'enfermeros_disponibles' as const, label: 'Enfermeros Disponibles', icon: Stethoscope, color: '#1B2B4B', bg: '#EEF1F7', descripcion: 'listos para asignar' },
  { key: 'turnos_hoy' as const,             label: 'Turnos Hoy',             icon: Calendar,    color: '#059669', bg: '#ECFDF5', descripcion: 'programados para hoy' },
  { key: 'cobranza_pendiente' as const,     label: 'Cobranza Pendiente',     icon: Receipt,     color: '#D97706', bg: '#FFFBEB', descripcion: 'por cobrar', prefix: '$', format: 'currency' },
]

export async function AdminDashboard() {
  const metricas = await getMetricas()
  const fechaFormateada = new Date().toLocaleDateString('es-VE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{fechaFormateada}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {metricas.levantamientos_pendientes > 0 && (
            <Link href="/levantamientos?estado=pendiente_revision"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-all">
              <AlertCircle size={13} className="text-amber-500" />
              {metricas.levantamientos_pendientes} levantamiento{metricas.levantamientos_pendientes !== 1 ? 's' : ''} por revisar
            </Link>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border"
            style={{ borderColor: '#2AABBF', color: '#2AABBF' }}>
            <TrendingUp size={12} />
            Operativo
          </span>
        </div>
      </div>

      {/* ── CTA HERO: Iniciar levantamiento ── */}
      <Link href="/levantamientos/nuevo"
        className="flex items-center justify-between gap-4 p-5 rounded-2xl transition-all hover:shadow-md group"
        style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #162B4C 60%, #2AABBF 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <ClipboardCheck size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base">Iniciar levantamiento de paciente</p>
            <p className="text-white/60 text-sm mt-0.5">
              Registra un paciente nuevo — captura clínica, logística y plan de servicio en un solo flujo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all group-hover:opacity-100"
          style={{ backgroundColor: '#2AABBF', color: '#fff' }}>
          <Plus size={15} />
          Nuevo
        </div>
      </Link>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICAS_CONFIG.map(({ key, label, icon: Icon, color, bg, descripcion, prefix, format }) => (
          <Card key={key} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                  <Icon size={18} style={{ color }} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: '#1B2B4B' }}>
                {prefix ?? ''}{formatValue(metricas[key], format)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{descripcion}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Turnos + Levantamientos recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UltimosTurnos />
        <UltimosLevantamientos />
      </div>

      {/* Acciones rápidas */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold" style={{ color: '#1B2B4B' }}>
            Acciones rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Nuevo levantamiento', href: '/levantamientos/nuevo', icon: ClipboardCheck, primary: true },
              { label: 'Nuevo caso',           href: '/casos/nuevo',          icon: FolderOpen },
              { label: 'Asignar turno',        href: '/turnos/nuevo',         icon: Calendar },
              { label: 'Ver enfermeros',       href: '/enfermeros',           icon: Stethoscope },
              { label: 'Ver cobranza',         href: '/cobranza',             icon: Receipt },
              { label: 'Levantamientos',       href: '/levantamientos',       icon: ClipboardCheck },
            ].map(({ label, href, icon: Icon, primary }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all group ${
                  primary
                    ? 'border-[#2AABBF] bg-[#EBF8FB] hover:bg-[#d4f1f8]'
                    : 'border-gray-100 hover:border-[#2AABBF] hover:bg-[#EBF8FB]'
                }`}>
                <Icon size={16} className={`transition-colors ${primary ? 'text-[#2AABBF]' : 'text-gray-400 group-hover:text-[#2AABBF]'}`} />
                <span className={`text-sm font-medium transition-colors ${primary ? 'text-[#1B2B4B]' : 'text-gray-600 group-hover:text-[#1B2B4B]'}`}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
