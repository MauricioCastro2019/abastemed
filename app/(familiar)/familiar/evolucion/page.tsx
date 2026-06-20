import { getMiCaso, getMisReportesTurno, getMisIncidencias } from '@/lib/actions/familiar-portal'
import { Activity, AlertTriangle, Heart, Thermometer, Wind, Droplets, Utensils, User } from 'lucide-react'

function formatFechaCompleta(d: string) {
  return new Date(d).toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatFechaCorta(d: string) {
  return new Date(d).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const GRAVEDAD_MAP: Record<string, { bg: string; text: string; label: string }> = {
  leve:     { bg: '#EFF6FF', text: '#1E40AF', label: 'Leve' },
  moderada: { bg: '#FFFBEB', text: '#92400E', label: 'Moderada' },
  grave:    { bg: '#FEF2F2', text: '#991B1B', label: 'Grave' },
  critica:  { bg: '#1B2B4B', text: 'white',   label: 'Crítica' },
}

export default async function EvolucionPage() {
  const [casoData, reportes, incidencias] = await Promise.all([
    getMiCaso().catch(() => ({ perfil: null, paciente: null, caso: null, turnos: [] })),
    (async () => {
      const d = await getMiCaso().catch(() => ({ caso: null }))
      if (!d.caso) return []
      return getMisReportesTurno(d.caso.id, 30).catch(() => [])
    })(),
    (async () => {
      const d = await getMiCaso().catch(() => ({ caso: null }))
      if (!d.caso) return []
      return getMisIncidencias(d.caso.id).catch(() => [])
    })(),
  ])

  const { paciente, caso } = casoData

  type Reporte = {
    id: string
    created_at: string
    estado_general?: string
    estado_general_obs?: string
    signos_vitales?: Record<string, string | number | null | undefined>
    tipo_dieta?: string
    porcentaje_ingesta?: number
    obs_alimentacion?: string
    nausea?: boolean
    vomito?: boolean
    cuidados_realizados?: string[]
    obs_cuidados?: string
    curaciones_realizadas?: boolean
    desc_curaciones?: string
    estado_piel?: string
    pendientes?: string
    observaciones?: string
    resumen_para_familia?: string
    enfermero?: { nombre: string; apellido: string }
  }

  type Incidencia = {
    id: string
    tipo: string
    descripcion: string
    gravedad: string
    intervencion?: string
    a_quien_se_aviso?: string
    estado_posterior?: string
    fecha_hora: string
  }

  // Normalizar enfermero (Supabase join puede devolver array)
  const reportesNorm = (reportes as unknown[]).map(rep => {
    const r = rep as Record<string, unknown>
    if (Array.isArray(r.enfermero)) r.enfermero = r.enfermero[0] ?? null
    return r as unknown as Reporte
  })
  const r = reportesNorm
  const inc = incidencias as Incidencia[]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Evolución</h1>
        {paciente && (
          <p className="text-sm text-gray-500 mt-0.5">
            {paciente.nombre} {paciente.apellido}
          </p>
        )}
      </div>

      {/* Sin caso */}
      {!caso && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Activity size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No hay un caso activo para mostrar evolución.</p>
        </div>
      )}

      {/* Incidencias visibles */}
      {inc.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
            <AlertTriangle size={14} className="text-amber-500" />
            Incidencias comunicadas
          </h2>
          <div className="space-y-2">
            {inc.map(i => {
              const g = GRAVEDAD_MAP[i.gravedad] ?? GRAVEDAD_MAP.leve
              return (
                <div key={i.id}
                  className="rounded-2xl p-4 border"
                  style={{ backgroundColor: g.bg, borderColor: `${g.text}30` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-semibold capitalize" style={{ color: g.text }}>
                        {i.tipo?.replace(/_/g, ' ')}
                      </span>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${g.text}20`, color: g.text }}>
                        {g.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">{formatFechaCorta(i.fecha_hora)}</p>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: g.text }}>{i.descripcion}</p>
                  {i.intervencion && (
                    <p className="text-[10px] mt-2 text-gray-600">
                      <span className="font-medium">Intervención:</span> {i.intervencion}
                    </p>
                  )}
                  {i.estado_posterior && (
                    <p className="text-[10px] mt-1 text-gray-600">
                      <span className="font-medium">Estado posterior:</span> {i.estado_posterior}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Línea de tiempo de reportes */}
      {caso && (
        <section>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
            <Activity size={14} style={{ color: '#2AABBF' }} />
            Reportes de turno
          </h2>

          {r.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <Activity size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Aún no hay reportes publicados para la familia.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Línea de tiempo */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />

              <div className="space-y-4">
                {r.map((rep, idx) => (
                  <div key={rep.id} className="relative pl-10">
                    {/* Punto en la línea */}
                    <div
                      className="absolute left-3 top-4 w-3 h-3 rounded-full border-2 border-white -translate-x-1/2"
                      style={{
                        backgroundColor: idx === 0 ? '#2AABBF' : '#CBD5E1',
                      }}
                    />

                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      {/* Cabecera del reporte */}
                      <div className="px-4 pt-4 pb-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User size={12} className="text-gray-400" />
                            <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>
                              {rep.enfermero
                                ? `${rep.enfermero.nombre} ${rep.enfermero.apellido}`
                                : 'Equipo de enfermería'}
                            </p>
                          </div>
                          {idx === 0 && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
                              Más reciente
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 capitalize ml-5">
                          {formatFechaCompleta(rep.created_at)}
                        </p>
                      </div>

                      {/* Estado general */}
                      {rep.estado_general && (
                        <div className="px-4 pb-3">
                          <div className="flex items-center gap-2">
                            <Heart size={12} className="text-rose-400" />
                            <span className="text-xs font-medium" style={{ color: '#1B2B4B' }}>
                              Estado general:
                            </span>
                            <span className="text-xs text-gray-600 capitalize">{rep.estado_general}</span>
                          </div>
                          {rep.estado_general_obs && (
                            <p className="text-[10px] text-gray-500 mt-1 ml-5 leading-relaxed">{rep.estado_general_obs}</p>
                          )}
                        </div>
                      )}

                      {/* Signos vitales */}
                      {rep.signos_vitales && Object.values(rep.signos_vitales).some(v => v) && (
                        <div className="px-4 pb-3">
                          <p className="text-[10px] text-gray-400 font-medium mb-2">Signos vitales</p>
                          <div className="flex flex-wrap gap-1.5">
                            {rep.signos_vitales.presion_arterial && (
                              <span className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                                <Heart size={9} />
                                PA: {rep.signos_vitales.presion_arterial}
                              </span>
                            )}
                            {rep.signos_vitales.frecuencia_cardiaca && (
                              <span className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: '#FFF1F2', color: '#BE123C' }}>
                                <Activity size={9} />
                                {rep.signos_vitales.frecuencia_cardiaca} bpm
                              </span>
                            )}
                            {rep.signos_vitales.temperatura && (
                              <span className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
                                <Thermometer size={9} />
                                {rep.signos_vitales.temperatura}°C
                              </span>
                            )}
                            {rep.signos_vitales.saturacion_oxigeno && (
                              <span className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
                                <Wind size={9} />
                                SpO₂ {rep.signos_vitales.saturacion_oxigeno}%
                              </span>
                            )}
                            {rep.signos_vitales.glucosa && (
                              <span className="text-[10px] px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: '#FAF5FF', color: '#6B21A8' }}>
                                <Droplets size={9} />
                                {rep.signos_vitales.glucosa} mg/dL
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Alimentación */}
                      {rep.tipo_dieta && (
                        <div className="px-4 pb-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Utensils size={11} className="text-gray-400" />
                            <span>{rep.tipo_dieta}
                              {rep.porcentaje_ingesta !== undefined ? ` · Ingesta ${rep.porcentaje_ingesta}%` : ''}
                              {rep.nausea ? ' · Náusea' : ''}
                              {rep.vomito ? ' · Vómito' : ''}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Nota para familia */}
                      {rep.resumen_para_familia && (
                        <div className="mx-4 mb-3 bg-teal-50 rounded-xl px-3 py-2.5">
                          <p className="text-[9px] text-teal-600 font-semibold mb-1">NOTA DEL EQUIPO</p>
                          <p className="text-xs text-teal-800 leading-relaxed">{rep.resumen_para_familia}</p>
                        </div>
                      )}

                      {/* Observaciones */}
                      {rep.observaciones && !rep.resumen_para_familia && (
                        <div className="px-4 pb-4">
                          <p className="text-xs text-gray-600 leading-relaxed">{rep.observaciones}</p>
                        </div>
                      )}

                      {/* Pendientes */}
                      {rep.pendientes && (
                        <div className="mx-4 mb-4 bg-amber-50 rounded-xl px-3 py-2">
                          <p className="text-[9px] text-amber-600 font-semibold mb-1">PENDIENTES</p>
                          <p className="text-xs text-amber-800">{rep.pendientes}</p>
                        </div>
                      )}

                      {!rep.observaciones && !rep.resumen_para_familia && !rep.pendientes && (
                        <div className="pb-4" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
