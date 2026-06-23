import { getMiPerfil, getMisTurnos } from '@/lib/actions/enfermero-portal'
import { Calendar, Star, Briefcase, Clock, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RealtimeRefresh } from '@/components/RealtimeRefresh'
import type { Turno } from '@/types'

const STATUS_TURNO: Record<string, { label: string; color: string; bg: string }> = {
  programado: { label: 'Programado', color: '#2AABBF', bg: '#EBF8FB' },
  activo:     { label: 'En curso',   color: '#059669', bg: '#ECFDF5' },
  completado: { label: 'Completado', color: '#6b7280', bg: '#f3f4f6' },
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

export default async function EnfermeroDashboardPage() {
  let enfermero = null
  let turnos: Turno[] = []

  try {
    const data = await getMiPerfil()
    enfermero = data.enfermero
    turnos = await getMisTurnos()
  } catch {
    // Sin datos aún
  }

  const proximos = turnos.filter(t => t.status !== 'completado').slice(0, 5)
  const completados = turnos.filter(t => t.status === 'completado').length

  return (
    <div className="space-y-8">
      <RealtimeRefresh tables={['turnos']} />
      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
          {enfermero ? `Hola, ${enfermero.nombre}` : 'Bienvenido'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Banner pendiente de aprobación */}
      {enfermero && !enfermero.disponible && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Cuenta pendiente de aprobación</p>
            <p className="text-xs text-amber-600 mt-0.5">
              El administrador revisará tu perfil pronto. Una vez aprobado, comenzarás a recibir turnos asignados.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: 'Turnos pendientes', value: proximos.length, color: '#2AABBF', bg: '#EBF8FB' },
          { icon: Star,     label: 'Rating',            value: enfermero?.rating?.toFixed(1) ?? '—', color: '#D97706', bg: '#FFFBEB' },
          { icon: Briefcase,label: 'Casos totales',     value: enfermero?.total_casos ?? 0, color: '#1B2B4B', bg: '#EEF1F7' },
          { icon: Clock,    label: 'Completados',       value: completados, color: '#059669', bg: '#ECFDF5' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Próximos turnos */}
      <div>
        <h2 className="text-base font-semibold mb-4" style={{ color: '#1B2B4B' }}>Próximos turnos</h2>

        {proximos.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <Calendar size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">No tienes turnos asignados aún</p>
            <p className="text-xs text-gray-300 mt-1">El administrador te asignará turnos próximamente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proximos.map((turno: Turno) => {
              const st = STATUS_TURNO[turno.status] ?? STATUS_TURNO.programado
              const caso = turno.caso
              return (
                <div key={turno.id} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-4">
                  <div className="w-1 h-full min-h-12 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate" style={{ color: '#1B2B4B' }}>
                        {caso?.titulo ?? 'Turno asignado'}
                      </p>
                      <Badge variant="outline" className="text-xs flex-shrink-0"
                        style={{ borderColor: st.color, color: st.color, backgroundColor: st.bg }}>
                        {st.label}
                      </Badge>
                    </div>
                    {caso?.paciente && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Paciente: {caso.paciente.nombre} {caso.paciente.apellido}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        {formatFecha(turno.fecha_inicio)}
                      </span>
                      {caso?.direccion && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={11} />
                          <span className="truncate max-w-48">{caso.direccion}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alerta si no hay perfil vinculado */}
      {!enfermero && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Tu cuenta aún no está vinculada a un perfil de enfermero. Contacta al administrador para completar tu registro.
        </div>
      )}
    </div>
  )
}
