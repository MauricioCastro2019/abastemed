import { createClient } from '@/lib/supabase/server'
import {
  Users, Stethoscope, Calendar, ClipboardCheck,
  Plus, ChevronRight, AlertCircle, CheckCircle,
  Clock, MapPin, ArrowRight, ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'

interface Props { nombre: string }

// ── Data fetch (RLS filtra automáticamente por coordinador_id) ──────────────

async function getCoordinadorData() {
  try {
    const supabase = await createClient()
    const hoy     = new Date().toISOString().split('T')[0]
    const ahora   = new Date().toISOString()
    const finDia  = hoy + 'T23:59:59'

    const [
      casosActivosRes,
      turnosActivosRes,
      turnosHoyRes,
      pendienteValRes,
      misAlertasRes,
      turnosVivoRes,
      turnosProximosRes,
      misCasosRes,
    ] = await Promise.all([
      // Mis casos activos
      supabase.from('casos').select('id', { count: 'exact' }).eq('status', 'activo'),

      // Turnos en curso AHORA (inicio <= ahora <= fin, status = activo)
      supabase.from('turnos').select('id', { count: 'exact' })
        .eq('status', 'activo'),

      // Turnos hoy (no completados)
      supabase.from('turnos').select('id', { count: 'exact' })
        .gte('fecha_inicio', hoy)
        .lte('fecha_inicio', finDia)
        .neq('status', 'completado'),

      // Turnos pendientes de validación
      supabase.from('turnos').select('id', { count: 'exact' })
        .eq('status', 'completado')
        .eq('validacion_status', 'pendiente'),

      // Alertas clínicas pendientes
      supabase.from('alertas').select('id', { count: 'exact' })
        .eq('resuelta', false)
        .in('tipo', [
          'turno_sin_reporte', 'turno_sin_entrega', 'incidencia_critica',
          'incidencia_grave', 'turno_en_aclaracion',
        ]),

      // Turnos activos AHORA con detalle
      supabase.from('turnos')
        .select(`
          id, fecha_inicio, fecha_fin, status,
          caso:casos(id, titulo, direccion,
            paciente:pacientes(nombre, apellido)
          ),
          enfermero:enfermeros(id, nombre, apellido, telefono)
        `)
        .eq('status', 'activo')
        .order('fecha_inicio', { ascending: true })
        .limit(5),

      // Próximos turnos hoy (programados)
      supabase.from('turnos')
        .select(`
          id, fecha_inicio, fecha_fin, status,
          caso:casos(id, titulo,
            paciente:pacientes(nombre, apellido)
          ),
          enfermero:enfermeros(nombre, apellido)
        `)
        .eq('status', 'programado')
        .gte('fecha_inicio', ahora)
        .lte('fecha_inicio', finDia)
        .order('fecha_inicio', { ascending: true })
        .limit(5),

      // Mis casos activos con detalle
      supabase.from('casos')
        .select(`
          id, titulo, direccion, status,
          paciente:pacientes(nombre, apellido),
          enfermero:enfermeros(nombre, apellido)
        `)
        .eq('status', 'activo')
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    return {
      casosActivos:       casosActivosRes.count ?? 0,
      turnosActivos:      turnosActivosRes.count ?? 0,
      turnosHoy:          turnosHoyRes.count ?? 0,
      pendienteVal:       pendienteValRes.count ?? 0,
      alertas:            misAlertasRes.count ?? 0,
      turnosVivo:         turnosVivoRes.data ?? [],
      turnosProximos:     turnosProximosRes.data ?? [],
      misCasos:           misCasosRes.data ?? [],
    }
  } catch {
    return {
      casosActivos: 0, turnosActivos: 0, turnosHoy: 0,
      pendienteVal: 0, alertas: 0,
      turnosVivo: [], turnosProximos: [], misCasos: [],
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function duracion(inicio: string, fin: string) {
  const h = (new Date(fin).getTime() - new Date(inicio).getTime()) / 3600000
  return `${h.toFixed(1)}h`
}

// ── Componente ────────────────────────────────────────────────────────────────

export async function JefeDashboard({ nombre }: Props) {
  const data = await getCoordinadorData()
  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const stats = [
    {
      label: 'Mis casos activos',  value: data.casosActivos,
      icon: Users,        color: '#2AABBF', bg: '#EBF8FB', href: '/casos',
    },
    {
      label: 'En curso ahora',     value: data.turnosActivos,
      icon: Clock,        color: '#059669', bg: '#ECFDF5', href: '/turnos',
    },
    {
      label: 'Turnos hoy',         value: data.turnosHoy,
      icon: Calendar,     color: '#1B2B4B', bg: '#EEF1F7', href: '/turnos',
    },
    {
      label: 'Pend. validación',   value: data.pendienteVal,
      icon: ShieldCheck,  color: '#D97706', bg: '#FFFBEB', href: '/turnos/validacion',
    },
  ]

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
            Hola, {nombre} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{fecha}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: '#EBF8FB', color: '#2AABBF', border: '1px solid #b2e8ef' }}>
          <ShieldCheck size={12} />
          Coordinador
        </span>
      </div>

      {/* Alertas */}
      {(data.alertas > 0 || data.pendienteVal > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {data.pendienteVal > 0 && (
            <Link href="/turnos/validacion"
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-sm"
              style={{ backgroundColor: '#FFFBEB', borderColor: '#fde68a' }}>
              <ShieldCheck size={18} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  {data.pendienteVal} turno{data.pendienteVal !== 1 ? 's' : ''} sin validar
                </p>
                <p className="text-xs text-amber-600">Requieren tu revisión</p>
              </div>
              <ChevronRight size={15} className="text-amber-400 flex-shrink-0" />
            </Link>
          )}
          {data.alertas > 0 && (
            <Link href="/bitacora"
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-sm"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#fecaca' }}>
              <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  {data.alertas} alerta{data.alertas !== 1 ? 's' : ''} clínica{data.alertas !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600">Incidencias o turnos sin reporte</p>
              </div>
              <ChevronRight size={15} className="text-red-400 flex-shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 group-hover:text-gray-600 transition-colors">{label}</p>
          </Link>
        ))}
      </div>

      {/* CTA: Asignar turno */}
      <Link href="/turnos/nuevo"
        className="flex items-center justify-between gap-4 p-5 rounded-2xl transition-all hover:shadow-md group"
        style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #163060 60%, #2AABBF 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Calendar size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base">Asignar turno</p>
            <p className="text-white/60 text-sm mt-0.5">
              Programa un enfermero en uno de tus casos activos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
          style={{ backgroundColor: '#2AABBF', color: '#fff' }}>
          <Plus size={15} />
          Nuevo
        </div>
      </Link>

      {/* Turnos en vivo + Próximos hoy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Turnos activos AHORA */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>En curso ahora</h2>
            </div>
            <Link href="/turnos" className="text-xs font-medium hover:underline" style={{ color: '#2AABBF' }}>
              Ver todos →
            </Link>
          </div>

          {data.turnosVivo.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Sin turnos activos en este momento</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.turnosVivo.map(t => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const turno = t as unknown as {
                  id: string; fecha_inicio: string; fecha_fin: string
                  caso: { id: string; titulo: string; direccion?: string; paciente?: { nombre: string; apellido: string } } | null
                  enfermero: { nombre: string; apellido: string; telefono?: string } | null
                }
                return (
                  <Link key={turno.id} href={`/turnos/${turno.id}`}
                    className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-all group">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1B2B4B' }}>
                        {turno.caso?.paciente?.nombre} {turno.caso?.paciente?.apellido}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{turno.caso?.titulo}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Stethoscope size={10} />
                          {turno.enfermero?.nombre} {turno.enfermero?.apellido}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {fmtHora(turno.fecha_inicio)} – {fmtHora(turno.fecha_fin)} ({duracion(turno.fecha_inicio, turno.fecha_fin)})
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0 mt-1" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Próximos turnos hoy */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Próximos hoy</h2>
            <Link href="/turnos/nuevo" className="text-xs font-medium hover:underline" style={{ color: '#2AABBF' }}>
              + Asignar
            </Link>
          </div>

          {data.turnosProximos.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Sin turnos programados para hoy</p>
              <Link href="/turnos/nuevo"
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium hover:underline"
                style={{ color: '#2AABBF' }}>
                <Plus size={12} /> Asignar turno
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.turnosProximos.map(t => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const turno = t as unknown as {
                  id: string; fecha_inicio: string; fecha_fin: string
                  caso: { id: string; titulo: string; paciente?: { nombre: string; apellido: string } } | null
                  enfermero: { nombre: string; apellido: string } | null
                }
                return (
                  <Link key={turno.id} href={`/turnos/${turno.id}`}
                    className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-all group">
                    <div className="text-center flex-shrink-0 w-10">
                      <p className="text-xs font-bold" style={{ color: '#2AABBF' }}>
                        {fmtHora(turno.fecha_inicio)}
                      </p>
                      <p className="text-xs text-gray-400">{duracion(turno.fecha_inicio, turno.fecha_fin)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>
                        {turno.caso?.paciente?.nombre} {turno.caso?.paciente?.apellido}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Stethoscope size={10} />
                        {turno.enfermero?.nombre} {turno.enfermero?.apellido}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0 mt-1" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mis casos activos */}
      {data.misCasos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Mis casos activos</h2>
            <Link href="/casos" className="text-xs font-medium hover:underline" style={{ color: '#2AABBF' }}>
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-50">
            {data.misCasos.map(c => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const caso = c as unknown as {
                id: string; titulo: string; direccion?: string
                paciente?: { nombre: string; apellido: string }
                enfermero?: { nombre: string; apellido: string }
              }
              return (
                <Link key={caso.id} href={`/casos/${caso.id}`}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-all group border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: '#1B2B4B' }}>
                    {caso.paciente?.nombre?.[0]}{caso.paciente?.apellido?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1B2B4B' }}>
                      {caso.paciente?.nombre} {caso.paciente?.apellido}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{caso.titulo}</p>
                    {caso.direccion && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={9} />
                        {caso.direccion}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0 mt-1" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Accesos directos */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2B4B' }}>Accesos directos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Mis casos',    href: '/casos',              icon: Users,          color: '#2AABBF', bg: '#EBF8FB' },
            { label: 'Turnos',       href: '/turnos',             icon: Calendar,       color: '#1B2B4B', bg: '#EEF1F7' },
            { label: 'Enfermeros',   href: '/enfermeros',         icon: Stethoscope,    color: '#059669', bg: '#ECFDF5' },
            { label: 'Validación',   href: '/turnos/validacion',  icon: ClipboardCheck, color: '#D97706', bg: '#FFFBEB' },
          ].map(({ label, href, icon: Icon, color, bg }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-[#2AABBF] hover:bg-[#EBF8FB] transition-all group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <span className="text-xs font-medium text-gray-600 group-hover:text-[#1B2B4B]">{label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
