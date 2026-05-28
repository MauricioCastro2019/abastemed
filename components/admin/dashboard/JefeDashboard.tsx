import { createClient } from '@/lib/supabase/server'
import {
  Users, Stethoscope, Calendar, Heart,
  Plus, ChevronRight, AlertCircle, CheckCircle,
  ClipboardCheck, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface Props { nombre: string }

async function getJefeData() {
  try {
    const supabase = await createClient()
    const hoy = new Date().toISOString().split('T')[0]

    const [
      casosRes,
      enfermerosRes,
      pendientesEnfRes,
      turnosHoyRes,
      familiaresRes,
      casosDetalleRes,
      levPendientesRes,
      levRecientesRes,
    ] = await Promise.all([
      supabase.from('casos').select('id', { count: 'exact' }).eq('status', 'activo'),
      supabase.from('enfermeros').select('id', { count: 'exact' }).eq('disponible', true),
      supabase.from('enfermeros').select('id', { count: 'exact' }).eq('disponible', false).eq('total_casos', 0),
      supabase.from('turnos').select('id', { count: 'exact' })
        .gte('fecha_inicio', hoy).lte('fecha_inicio', hoy + 'T23:59:59')
        .neq('status', 'completado'),
      supabase.from('perfiles').select('id', { count: 'exact' })
        .eq('rol', 'familiar').is('paciente_id', null),
      supabase.from('casos')
        .select('id, titulo, direccion, paciente:pacientes(nombre, apellido), created_at')
        .eq('status', 'activo')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase.from('levantamientos_paciente')
        .select('id', { count: 'exact' })
        .eq('estado', 'pendiente_revision'),
      supabase.from('levantamientos_paciente')
        .select('id, paciente_nombre, paciente_apellido, estado, riesgo_final, prioridad, created_at')
        .order('created_at', { ascending: false })
        .limit(4),
    ])

    return {
      casosActivos:        casosRes.count ?? 0,
      enfermerosDisp:      enfermerosRes.count ?? 0,
      pendientesEnf:       pendientesEnfRes.count ?? 0,
      turnosHoy:           turnosHoyRes.count ?? 0,
      familiaresUnlinked:  familiaresRes.count ?? 0,
      casosRecientes:      casosDetalleRes.data ?? [],
      levPendientes:       levPendientesRes.count ?? 0,
      levRecientes:        levRecientesRes.data ?? [],
    }
  } catch {
    return {
      casosActivos: 0, enfermerosDisp: 0, pendientesEnf: 0,
      turnosHoy: 0, familiaresUnlinked: 0, casosRecientes: [],
      levPendientes: 0, levRecientes: [],
    }
  }
}

const RIESGO_CFG: Record<string, { bg: string; text: string }> = {
  bajo:  { bg: '#DCFCE7', text: '#166534' },
  medio: { bg: '#FEF9C3', text: '#854D0E' },
  alto:  { bg: '#FEE2E2', text: '#991B1B' },
}
const ESTADO_LABEL: Record<string, string> = {
  borrador:           'Borrador',
  pendiente_revision: 'Pendiente revisión',
  revisado:           'Revisado',
  aprobado:           'Aprobado',
  convertido:         'Convertido',
  cancelado:          'Cancelado',
}

export async function JefeDashboard({ nombre }: Props) {
  const data = await getJefeData()
  const fecha = new Date().toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const stats = [
    { label: 'Levantamientos pendientes', value: data.levPendientes,    icon: ClipboardCheck, color: '#D97706', bg: '#FFFBEB', href: '/levantamientos?estado=pendiente_revision' },
    { label: 'Casos activos',             value: data.casosActivos,     icon: Users,          color: '#2AABBF', bg: '#EBF8FB', href: '/casos' },
    { label: 'Enfermeros disponibles',    value: data.enfermerosDisp,   icon: Stethoscope,    color: '#059669', bg: '#ECFDF5', href: '/enfermeros' },
    { label: 'Turnos hoy',               value: data.turnosHoy,        icon: Calendar,       color: '#1B2B4B', bg: '#EEF1F7', href: '/turnos' },
  ]

  return (
    <div className="space-y-8">

      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
          Hola, {nombre} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{fecha}</p>
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
              ¿Llegó una solicitud nueva? Empieza aquí — captura todos los datos del paciente en un solo flujo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
          style={{ backgroundColor: '#2AABBF', color: '#fff' }}>
          <Plus size={15} />
          Nuevo
        </div>
      </Link>

      {/* Alertas */}
      {(data.pendientesEnf > 0 || data.familiaresUnlinked > 0 || data.levPendientes > 0) && (
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {data.levPendientes > 0 && (
            <Link href="/levantamientos?estado=pendiente_revision"
              className="flex-1 min-w-0 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-all">
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  {data.levPendientes} levantamiento{data.levPendientes !== 1 ? 's' : ''} por revisar
                </p>
                <p className="text-xs text-amber-600">Requieren tu revisión para avanzar</p>
              </div>
              <ChevronRight size={16} className="text-amber-400 flex-shrink-0 ml-auto" />
            </Link>
          )}
          {data.pendientesEnf > 0 && (
            <Link href="/enfermeros"
              className="flex-1 min-w-0 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 hover:bg-blue-100 transition-all">
              <AlertCircle size={18} className="text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-800">
                  {data.pendientesEnf} enfermero{data.pendientesEnf !== 1 ? 's' : ''} por aprobar
                </p>
                <p className="text-xs text-blue-600">Revisar y aprobar cuentas nuevas</p>
              </div>
              <ChevronRight size={16} className="text-blue-400 flex-shrink-0 ml-auto" />
            </Link>
          )}
          {data.familiaresUnlinked > 0 && (
            <Link href="/familiares"
              className="flex-1 min-w-0 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 hover:bg-purple-100 transition-all">
              <Heart size={18} className="text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-purple-800">
                  {data.familiaresUnlinked} familiar{data.familiaresUnlinked !== 1 ? 'es' : ''} sin vincular
                </p>
                <p className="text-xs text-purple-600">Vincular a su paciente</p>
              </div>
              <ChevronRight size={16} className="text-purple-400 flex-shrink-0 ml-auto" />
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

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Flujo de trabajo — empieza en levantamiento */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Flujo de atención</h2>
            <p className="text-xs text-gray-400 mt-0.5">Proceso completo para un nuevo paciente</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              {
                paso: '1', label: 'Levantamiento de paciente',
                desc: 'Registra toda la información clínica, logística y plan de servicio',
                href: '/levantamientos/nuevo', color: '#2AABBF', bg: '#EBF8FB',
              },
              {
                paso: '2', label: 'Revisar y aprobar',
                desc: 'Valida el levantamiento y define riesgo, prioridad y costo',
                href: '/levantamientos', color: '#D97706', bg: '#FFFBEB',
              },
              {
                paso: '3', label: 'Crear caso clínico',
                desc: 'Abre el caso con los datos del levantamiento aprobado',
                href: '/casos/nuevo', color: '#1B2B4B', bg: '#EEF1F7',
              },
              {
                paso: '4', label: 'Asignar enfermero/a',
                desc: 'Programa el primer turno con el perfil adecuado al caso',
                href: '/turnos/nuevo', color: '#059669', bg: '#ECFDF5',
              },
              {
                paso: '5', label: 'Dar acceso al familiar',
                desc: 'Invita al responsable para que siga el avance del paciente',
                href: '/familiares/invitar', color: '#7c3aed', bg: '#f5f3ff',
              },
            ].map(({ paso, label, desc, href, color, bg }) => (
              <Link key={paso} href={href}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-all group">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: bg, color }}>
                  {paso}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <Plus size={16} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Levantamientos recientes */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Levantamientos recientes</h2>
              <p className="text-xs text-gray-400 mt-0.5">Últimos registros</p>
            </div>
            <Link href="/levantamientos" className="text-xs font-medium hover:underline" style={{ color: '#2AABBF' }}>
              Ver todos →
            </Link>
          </div>

          {data.levRecientes.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Sin levantamientos aún</p>
              <Link href="/levantamientos/nuevo"
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium hover:underline"
                style={{ color: '#2AABBF' }}>
                <Plus size={12} /> Iniciar el primero
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.levRecientes.map(lev => {
                const l = lev as {
                  id: string; paciente_nombre: string; paciente_apellido: string;
                  estado: string; riesgo_final: string; created_at: string;
                }
                const r = RIESGO_CFG[l.riesgo_final] ?? RIESGO_CFG.bajo
                return (
                  <Link key={l.id} href={`/levantamientos/${l.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-all group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: '#1B2B4B' }}>
                      {l.paciente_nombre?.[0]}{l.paciente_apellido?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>
                        {l.paciente_nombre} {l.paciente_apellido}
                      </p>
                      <p className="text-xs text-gray-400">{ESTADO_LABEL[l.estado] ?? l.estado}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ backgroundColor: r.bg, color: r.text }}>
                      {l.riesgo_final?.charAt(0).toUpperCase() + l.riesgo_final?.slice(1)}
                    </span>
                    <ArrowRight size={14} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Accesos directos */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2B4B' }}>Accesos directos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Levantamientos', href: '/levantamientos', icon: ClipboardCheck, color: '#2AABBF', bg: '#EBF8FB' },
            { label: 'Pacientes',      href: '/pacientes',      icon: Users,          color: '#1B2B4B', bg: '#EEF1F7' },
            { label: 'Enfermeros',     href: '/enfermeros',     icon: Stethoscope,    color: '#059669', bg: '#ECFDF5' },
            { label: 'Turnos',         href: '/turnos',         icon: Calendar,       color: '#D97706', bg: '#FFFBEB' },
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
