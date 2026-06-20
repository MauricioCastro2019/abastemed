import { getMiCaso, getMiAgenda, getMisCitasMedicas } from '@/lib/actions/familiar-portal'
import { CalendarDays, Stethoscope, Pill, User, MapPin, AlertCircle } from 'lucide-react'

function formatHoraMinuto(d: string) {
  return new Date(d).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatFechaCorta(d: string) {
  return new Date(d).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const ESTADO_TURNO_COLOR: Record<string, string> = {
  programado: '#2AABBF',
  activo:     '#059669',
  completado: '#94A3B8',
}

const ESTADO_CITA_COLOR: Record<string, string> = {
  programada:  '#2AABBF',
  confirmada:  '#059669',
  realizada:   '#94A3B8',
  cancelada:   '#EF4444',
}

const TIPO_EVENTO_COLOR: Record<string, { bg: string; text: string }> = {
  medicamento_oral:       { bg: '#FAF5FF', text: '#7C3AED' },
  aplicacion_medicamento: { bg: '#FFF1F2', text: '#BE123C' },
  curacion:               { bg: '#FFF7ED', text: '#C2410C' },
  signos_vitales:         { bg: '#EFF6FF', text: '#1D4ED8' },
  terapia:                { bg: '#F0FDF4', text: '#166534' },
  otra:                   { bg: '#F8FAFC', text: '#475569' },
}

const ESTADO_EVENTO: Record<string, { label: string; color: string }> = {
  pendiente:    { label: 'Pendiente',     color: '#94A3B8' },
  confirmado:   { label: 'Realizado',     color: '#059669' },
  omitido:      { label: 'Omitido',       color: '#EF4444' },
  reprogramado: { label: 'Reprogramado',  color: '#F59E0B' },
  cancelado:    { label: 'Cancelado',     color: '#DC2626' },
}

export default async function AgendaPage() {
  const casoData = await getMiCaso().catch(() => ({ caso: null, paciente: null }))
  const { paciente, caso } = casoData

  const hoy = startOfDay(new Date())
  const en7dias = addDays(hoy, 7)
  const desde = hoy.toISOString()
  const hasta = addDays(en7dias, 1).toISOString()

  let agenda: { turnos: unknown[]; eventos: unknown[]; citas: unknown[] } = { turnos: [], eventos: [], citas: [] }
  let citasHistorial: unknown[] = []

  if (caso && paciente) {
    ;[agenda, citasHistorial] = await Promise.all([
      getMiAgenda(caso.id, paciente.id, desde, hasta).catch(() => ({ turnos: [], eventos: [], citas: [] })),
      getMisCitasMedicas(paciente.id).catch(() => []),
    ])
  }

  type EventoUnificado = {
    key: string
    tipo: 'turno' | 'evento' | 'cita'
    fecha: Date
    hora: string
    titulo: string
    subtitulo?: string
    estado?: string
    color?: string
    extra?: string
  }

  const eventos: EventoUnificado[] = []

  // Turnos
  ;(agenda.turnos as Array<{
    id: string; status: string; fecha_inicio: string; fecha_fin: string
    enfermero?: { nombre: string; apellido: string }
  }>).forEach(t => {
    eventos.push({
      key: `turno-${t.id}`,
      tipo: 'turno',
      fecha: new Date(t.fecha_inicio),
      hora: formatHoraMinuto(t.fecha_inicio),
      titulo: t.enfermero
        ? `Turno: ${t.enfermero.nombre} ${t.enfermero.apellido}`
        : 'Turno de enfermería',
      subtitulo: `Hasta ${formatHoraMinuto(t.fecha_fin)}`,
      estado: t.status,
      color: ESTADO_TURNO_COLOR[t.status],
    })
  })

  // Eventos de indicaciones
  ;(agenda.eventos as Array<{
    id: string; fecha_hora_programada: string; status: string; notas?: string
    indicacion?: { nombre: string; tipo: string; dosis?: string; via?: string }
  }>).forEach(e => {
    const tc = TIPO_EVENTO_COLOR[e.indicacion?.tipo ?? 'otra']
    const es = ESTADO_EVENTO[e.status]
    eventos.push({
      key: `evento-${e.id}`,
      tipo: 'evento',
      fecha: new Date(e.fecha_hora_programada),
      hora: formatHoraMinuto(e.fecha_hora_programada),
      titulo: e.indicacion?.nombre ?? 'Actividad',
      subtitulo: [e.indicacion?.dosis, e.indicacion?.via].filter(Boolean).join(' · ') || undefined,
      estado: e.status,
      color: tc.text,
      extra: es?.label,
    })
  })

  // Citas (próximas)
  ;(agenda.citas as Array<{
    id: string; medico_nombre?: string; especialidad?: string
    fecha: string; hora?: string; estado: string; ubicacion?: string
  }>).forEach(c => {
    const fechaDt = new Date(`${c.fecha}T${c.hora ?? '00:00'}`)
    eventos.push({
      key: `cita-${c.id}`,
      tipo: 'cita',
      fecha: fechaDt,
      hora: c.hora ?? '—',
      titulo: c.medico_nombre ?? 'Cita médica',
      subtitulo: c.especialidad ?? undefined,
      estado: c.estado,
      color: ESTADO_CITA_COLOR[c.estado],
      extra: c.ubicacion,
    })
  })

  // Ordenar por fecha
  eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  // Agrupar por día
  const diasConEventos: Map<string, EventoUnificado[]> = new Map()
  eventos.forEach(ev => {
    const key = ev.fecha.toLocaleDateString('es-MX')
    if (!diasConEventos.has(key)) diasConEventos.set(key, [])
    diasConEventos.get(key)!.push(ev)
  })

  // Generar 7 días aunque no tengan eventos
  const diasSemana: Date[] = []
  for (let i = 0; i < 8; i++) diasSemana.push(addDays(hoy, i))

  const TIPO_ICON: Record<string, React.ElementType> = {
    turno: User, evento: Pill, cita: Stethoscope,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Agenda</h1>
        {paciente && (
          <p className="text-sm text-gray-500 mt-0.5">{paciente.nombre} {paciente.apellido}</p>
        )}
      </div>

      {!caso && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CalendarDays size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No hay un caso activo. La agenda se mostrará cuando el servicio esté activo.</p>
        </div>
      )}

      {caso && eventos.length === 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CalendarDays size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No hay actividades programadas para los próximos 7 días.</p>
        </div>
      )}

      {/* Próximos 8 días */}
      {caso && eventos.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
            <CalendarDays size={14} style={{ color: '#2AABBF' }} />
            Próximos 7 días
          </h2>
          <div className="space-y-4">
            {diasSemana.map(dia => {
              const key = dia.toLocaleDateString('es-MX')
              const evsDia = diasConEventos.get(key) ?? []
              if (evsDia.length === 0 && !isSameDay(dia, hoy)) return null

              return (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center"
                      style={{
                        backgroundColor: isSameDay(dia, hoy) ? '#1B2B4B' : '#F1F5F9',
                        color: isSameDay(dia, hoy) ? 'white' : '#64748B',
                      }}
                    >
                      <span className="text-[9px] font-medium uppercase leading-tight">
                        {dia.toLocaleString('es-MX', { weekday: 'short' })}
                      </span>
                      <span className="text-sm font-bold leading-tight">{dia.getDate()}</span>
                    </div>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {evsDia.length === 0 ? (
                    <div className="ml-12 text-xs text-gray-300 py-1">Sin actividades</div>
                  ) : (
                    <div className="ml-0 space-y-2">
                      {evsDia.map(ev => {
                        const Icon = TIPO_ICON[ev.tipo]
                        return (
                          <div key={ev.key} className="bg-white rounded-xl shadow-sm p-3.5 flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${ev.color ?? '#2AABBF'}15` }}
                            >
                              <Icon size={14} style={{ color: ev.color ?? '#2AABBF' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold leading-tight truncate" style={{ color: '#1B2B4B' }}>
                                  {ev.titulo}
                                </p>
                                <span className="flex-shrink-0 text-[10px] font-medium" style={{ color: ev.color ?? '#94A3B8' }}>
                                  {ev.hora}
                                </span>
                              </div>
                              {ev.subtitulo && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{ev.subtitulo}</p>
                              )}
                              {ev.extra && (
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin size={9} className="text-gray-300 flex-shrink-0" />
                                  <p className="text-[10px] text-gray-400 truncate">{ev.extra}</p>
                                </div>
                              )}
                              {ev.estado && ev.tipo !== 'turno' && (
                                <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: `${ev.color ?? '#94A3B8'}15`, color: ev.color ?? '#94A3B8' }}>
                                  {ev.extra ?? ESTADO_EVENTO[ev.estado]?.label ?? ev.estado}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Citas futuras (más allá de 7 días) */}
      {(() => {
        const futuras = (citasHistorial as Array<{
          id: string; medico_nombre?: string; especialidad?: string
          fecha: string; hora?: string; estado: string; ubicacion?: string
          motivo?: string; preparacion?: string
        }>).filter(c => {
          const f = new Date(c.fecha)
          return f > en7dias && !['realizada', 'cancelada'].includes(c.estado)
        })
        if (futuras.length === 0) return null
        return (
          <section>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
              <Stethoscope size={14} style={{ color: '#2AABBF' }} />
              Citas próximas
            </h2>
            <div className="space-y-2">
              {futuras.map(c => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>
                      {c.medico_nombre ?? 'Cita médica'}
                    </p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                      style={{
                        backgroundColor: `${ESTADO_CITA_COLOR[c.estado]}15`,
                        color: ESTADO_CITA_COLOR[c.estado],
                      }}>
                      {formatFechaCorta(c.fecha)}{c.hora ? ` · ${c.hora}` : ''}
                    </span>
                  </div>
                  {c.especialidad && <p className="text-[10px] text-gray-400">{c.especialidad}</p>}
                  {c.motivo && <p className="text-[10px] text-gray-500 mt-1">Motivo: {c.motivo}</p>}
                  {c.preparacion && (
                    <div className="mt-2 bg-amber-50 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                      <AlertCircle size={10} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-amber-700">{c.preparacion}</p>
                    </div>
                  )}
                  {c.ubicacion && (
                    <div className="flex items-center gap-1 mt-2">
                      <MapPin size={10} className="text-gray-400" />
                      <p className="text-[10px] text-gray-400">{c.ubicacion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })()}
    </div>
  )
}
