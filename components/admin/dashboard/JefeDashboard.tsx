import { createClient } from '@/lib/supabase/server'
import {
  Users, Stethoscope, Calendar, Heart,
  Plus, ChevronRight, Clock, AlertCircle, CheckCircle,
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
      pendientesRes,
      turnosHoyRes,
      familiaresRes,
      casosDetalleRes,
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
        .limit(5),
    ])

    return {
      casosActivos:     casosRes.count ?? 0,
      enfermerosDisp:   enfermerosRes.count ?? 0,
      jefesPendientes:  pendientesRes.count ?? 0,
      turnosHoy:        turnosHoyRes.count ?? 0,
      familiaresUnlinked: familiaresRes.count ?? 0,
      casosRecientes:   casosDetalleRes.data ?? [],
    }
  } catch {
    return {
      casosActivos: 0, enfermerosDisp: 0, jefesPendientes: 0,
      turnosHoy: 0, familiaresUnlinked: 0, casosRecientes: [],
    }
  }
}

export async function JefeDashboard({ nombre }: Props) {
  const data = await getJefeData()
  const fecha = new Date().toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const stats = [
    { label: 'Casos activos',       value: data.casosActivos,       icon: Users,       color: '#2AABBF', bg: '#EBF8FB' },
    { label: 'Enfermeros disponibles', value: data.enfermerosDisp,  icon: Stethoscope, color: '#059669', bg: '#ECFDF5' },
    { label: 'Turnos hoy',          value: data.turnosHoy,          icon: Calendar,    color: '#1B2B4B', bg: '#EEF1F7' },
    { label: 'Familiares por vincular', value: data.familiaresUnlinked, icon: Heart,   color: '#D97706', bg: '#FFFBEB' },
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

      {/* Alertas rápidas */}
      {(data.jefesPendientes > 0 || data.familiaresUnlinked > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {data.jefesPendientes > 0 && (
            <Link href="/enfermeros"
              className="flex-1 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-all">
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  {data.jefesPendientes} enfermero{data.jefesPendientes !== 1 ? 's' : ''} por aprobar
                </p>
                <p className="text-xs text-amber-600">Revisar y aprobar cuentas nuevas</p>
              </div>
              <ChevronRight size={16} className="text-amber-400 flex-shrink-0 ml-auto" />
            </Link>
          )}
          {data.familiaresUnlinked > 0 && (
            <Link href="/familiares"
              className="flex-1 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 hover:bg-blue-100 transition-all">
              <AlertCircle size={18} className="text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-800">
                  {data.familiaresUnlinked} familiar{data.familiaresUnlinked !== 1 ? 'es' : ''} sin vincular
                </p>
                <p className="text-xs text-blue-600">Vincular a su paciente</p>
              </div>
              <ChevronRight size={16} className="text-blue-400 flex-shrink-0 ml-auto" />
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Flujo de trabajo */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Flujo de trabajo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Acciones del día a día</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              {
                paso: '1', label: 'Ingresar paciente',
                desc: 'Registra un nuevo paciente en el sistema',
                href: '/pacientes/nuevo', color: '#2AABBF', bg: '#EBF8FB',
              },
              {
                paso: '2', label: 'Crear caso clínico',
                desc: 'Abre un caso y asigna dirección y tarifa',
                href: '/casos/nuevo', color: '#1B2B4B', bg: '#EEF1F7',
              },
              {
                paso: '3', label: 'Asignar enfermero/a',
                desc: 'Programa un turno con el enfermero elegido',
                href: '/turnos/nuevo', color: '#059669', bg: '#ECFDF5',
              },
              {
                paso: '4', label: 'Entregar acceso familiar',
                desc: 'Invita al familiar para que vea el portal',
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

        {/* Casos activos recientes */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Casos activos</h2>
              <p className="text-xs text-gray-400 mt-0.5">Más recientes</p>
            </div>
            <Link href="/casos" className="text-xs font-medium hover:underline" style={{ color: '#2AABBF' }}>
              Ver todos →
            </Link>
          </div>

          {data.casosRecientes.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Sin casos activos</p>
              <Link href="/casos/nuevo"
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium hover:underline"
                style={{ color: '#2AABBF' }}>
                <Plus size={12} /> Crear primer caso
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.casosRecientes.map(caso => {
                const paciente = caso.paciente as unknown as { nombre: string; apellido: string } | null
                return (
                  <Link key={caso.id} href={`/casos/${caso.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-all group">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#2AABBF' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1B2B4B' }}>
                        {(caso as { titulo: string }).titulo}
                      </p>
                      {paciente && (
                        <p className="text-xs text-gray-400">
                          {paciente.nombre} {paciente.apellido}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                      <Clock size={11} />
                      {new Date((caso as { created_at: string }).created_at).toLocaleDateString('es-VE', {
                        day: 'numeric', month: 'short',
                      })}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0" />
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
            { label: 'Pacientes',   href: '/pacientes',  icon: Users,       color: '#2AABBF', bg: '#EBF8FB' },
            { label: 'Enfermeros',  href: '/enfermeros', icon: Stethoscope, color: '#1B2B4B', bg: '#EEF1F7' },
            { label: 'Turnos',      href: '/turnos',     icon: Calendar,    color: '#059669', bg: '#ECFDF5' },
            { label: 'Familiares',  href: '/familiares', icon: Heart,       color: '#D97706', bg: '#FFFBEB' },
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
