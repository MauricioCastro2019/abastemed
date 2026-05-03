import { getMiCaso, getMisEntregas } from '@/lib/actions/familiar-portal'
import { Calendar, Clock, MapPin, Phone, Star, Heart, AlertTriangle, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const STATUS_TURNO: Record<string, { label: string; color: string; bg: string }> = {
  programado: { label: 'Programado', color: '#2AABBF', bg: '#EBF8FB' },
  activo:     { label: 'En curso',   color: '#059669', bg: '#ECFDF5' },
}

function formatFecha(f: string) {
  return new Date(f).toLocaleString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatFechaCorta(f: string) {
  return new Date(f).toLocaleString('es-VE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function FamiliarDashboardPage() {
  const [data, entregas] = await Promise.all([
    getMiCaso().catch(() => ({ perfil: null, paciente: null, caso: null, turnos: [] })),
    getMisEntregas().catch(() => []),
  ])

  const { perfil, paciente, caso, turnos } = data

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
          {perfil ? `Hola, ${perfil.nombre}` : 'Bienvenido/a'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Sin caso vinculado */}
      {!paciente && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-700">
          Tu cuenta aún no está vinculada a un paciente. Contacta al equipo de Abastemed para completar tu registro.
        </div>
      )}

      {/* Info del paciente */}
      {paciente && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2B4B' }}>Paciente</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#1B2B4B' }}>
              {(paciente as { nombre: string }).nombre[0]}
              {(paciente as { apellido: string }).apellido[0]}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
                {(paciente as { nombre: string }).nombre} {(paciente as { apellido: string }).apellido}
              </p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">
                {(paciente as { contexto: string }).contexto?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Caso activo */}
      {caso ? (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Caso activo</h2>
            <Badge variant="outline" className="text-xs"
              style={{ borderColor: '#2AABBF', color: '#2AABBF', backgroundColor: '#EBF8FB' }}>
              Activo
            </Badge>
          </div>
          <p className="font-medium text-sm mb-3" style={{ color: '#1B2B4B' }}>
            {(caso as { titulo: string }).titulo}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin size={12} />
            <span>{(caso as { direccion: string }).direccion}</span>
          </div>
        </div>
      ) : paciente ? (
        <div className="bg-white rounded-xl p-5 shadow-sm text-center py-8">
          <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No hay caso activo en este momento</p>
        </div>
      ) : null}

      {/* Próximos turnos */}
      {caso && (
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2B4B' }}>
            Próximos turnos
          </h2>
          {(turnos as unknown[]).length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <Clock size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Sin turnos programados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(turnos as Array<{
                id: string
                status: string
                fecha_inicio: string
                fecha_fin: string
                enfermero?: { nombre: string; apellido: string; telefono: string; especialidades?: string[]; rating?: number }
              }>).map(turno => {
                const st = STATUS_TURNO[turno.status] ?? STATUS_TURNO.programado
                const h = ((new Date(turno.fecha_fin).getTime() - new Date(turno.fecha_inicio).getTime()) / 3600000).toFixed(1)

                return (
                  <div key={turno.id} className="bg-white rounded-xl p-5 shadow-sm border-l-4"
                    style={{ borderColor: st.color }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: st.color }}>
                          {st.label}
                        </span>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} />
                          {formatFecha(turno.fecha_inicio)} · {h}h
                        </p>
                      </div>
                    </div>

                    {turno.enfermero && (
                      <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#2AABBF' }}>
                          {turno.enfermero.nombre[0]}{turno.enfermero.apellido[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
                            {turno.enfermero.nombre} {turno.enfermero.apellido}
                          </p>
                          <div className="flex items-center gap-3">
                            {turno.enfermero.rating && (
                              <span className="text-xs text-amber-500 flex items-center gap-0.5">
                                <Star size={10} className="fill-amber-400" />
                                {turno.enfermero.rating.toFixed(1)}
                              </span>
                            )}
                            <a href={`tel:${turno.enfermero.telefono}`}
                              className="text-xs text-[#2AABBF] flex items-center gap-1 hover:underline">
                              <Phone size={11} />
                              {turno.enfermero.telefono}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Historial de reportes de turno */}
      {entregas.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#1B2B4B' }}>
            <Activity size={15} style={{ color: '#2AABBF' }} />
            Reportes recientes
          </h2>
          <div className="space-y-3">
            {(entregas as Array<{
              id: string
              observaciones: string
              incidentes?: string | null
              signos_vitales: Record<string, string | number | undefined>
              created_at: string
              enfermero_saliente: { nombre: string; apellido: string } | null
              turno_saliente: { fecha_inicio: string; fecha_fin: string } | null
            }>).map(e => {
              const sv = e.signos_vitales as Record<string, string | number | undefined>
              const enf = Array.isArray(e.enfermero_saliente) ? e.enfermero_saliente[0] : e.enfermero_saliente

              return (
                <div key={e.id} className="bg-white rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                        {enf ? `${enf.nombre} ${enf.apellido}` : 'Enfermero/a'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {e.turno_saliente
                          ? `${formatFechaCorta(e.turno_saliente.fecha_inicio)} → ${formatFechaCorta(e.turno_saliente.fecha_fin)}`
                          : formatFechaCorta(e.created_at)
                        }
                      </p>
                    </div>
                    <Heart size={14} className="text-gray-200 flex-shrink-0 mt-0.5" />
                  </div>

                  {/* Signos vitales resumidos */}
                  {sv && Object.values(sv).some(v => v !== undefined && v !== null && v !== '') && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {sv.presion_arterial && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF8FB] text-[#1A7A8C]">
                          PA: {sv.presion_arterial}
                        </span>
                      )}
                      {sv.frecuencia_cardiaca && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#FCE4EC] text-[#C62828]">
                          FC: {sv.frecuencia_cardiaca} bpm
                        </span>
                      )}
                      {sv.temperatura && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFF3E0] text-[#E65100]">
                          T°: {sv.temperatura}°C
                        </span>
                      )}
                      {sv.saturacion_oxigeno && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#1B5E20]">
                          SpO₂: {sv.saturacion_oxigeno}%
                        </span>
                      )}
                      {sv.glucosa && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#F3E5F5] text-[#4A148C]">
                          Glucosa: {sv.glucosa} mg/dL
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-600 leading-relaxed">{e.observaciones}</p>

                  {e.incidentes && (
                    <div className="mt-3 bg-amber-50 rounded-lg px-3 py-2 flex items-start gap-2">
                      <AlertTriangle size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">{e.incidentes}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
