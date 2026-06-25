import { getEventosByFecha } from '@/lib/actions/plan-cuidado'
import { EventoRow } from '@/components/plan-cuidado/EventoRow'
import { CalendarClock, ChevronLeft, ChevronRight, ClipboardList, Plus } from 'lucide-react'
import Link from 'next/link'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatFechaLarga(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  })
}

const STATUS_STATS = [
  { key: 'pendiente',  label: 'Pendientes',  color: '#D97706' },
  { key: 'confirmado', label: 'Confirmados', color: '#059669' },
  { key: 'omitido',    label: 'Omitidos',    color: '#6B7280' },
  { key: 'cancelado',  label: 'Cancelados',  color: '#DC2626' },
] as const

export default async function AgendaCuidadoPage({
  searchParams,
}: {
  searchParams: { fecha?: string }
}) {
  const hoy    = new Date().toISOString().split('T')[0]
  const fecha  = searchParams.fecha ?? hoy
  const eventos = await getEventosByFecha(fecha)

  const prevFecha = addDays(fecha, -1)
  const nextFecha = addDays(fecha,  1)
  const isHoy     = fecha === hoy

  // Agrupar por paciente
  const byPaciente = eventos.reduce<Record<string, typeof eventos>>((acc, ev) => {
    const pid = ev.paciente_id
    if (!acc[pid]) acc[pid] = []
    acc[pid].push(ev)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header + Navegación de fecha */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <CalendarClock size={22} style={{ color: '#2AABBF' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Agenda de Cuidado</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/plan-cuidado/nueva"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={15} />
            Nueva indicación
          </Link>

          <div className="flex items-center gap-2">
          <Link href={`/agenda-cuidado?fecha=${prevFecha}`}
            className="p-2 rounded-lg border border-gray-200 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
            <ChevronLeft size={16} />
          </Link>

          <span className="text-sm font-medium text-gray-700 capitalize min-w-[220px] text-center">
            {formatFechaLarga(fecha)}
          </span>

          <Link href={`/agenda-cuidado?fecha=${nextFecha}`}
            className="p-2 rounded-lg border border-gray-200 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
            <ChevronRight size={16} />
          </Link>

          {!isHoy && (
            <Link href="/agenda-cuidado"
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
              Hoy
            </Link>
          )}
          </div>
        </div>
      </div>

      {/* Estadísticas del día */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_STATS.map(({ key, label, color }) => (
          <div key={key} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold" style={{ color }}>
              {eventos.filter(e => e.status === key).length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Eventos agrupados por paciente */}
      {Object.keys(byPaciente).length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <CalendarClock size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">Sin eventos programados para este día</p>
          <p className="text-xs text-gray-300 mt-1">
            Los eventos se generan automáticamente al crear indicaciones
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byPaciente).map(([pacienteId, evs]) => {
            const paciente = evs[0]?.indicacion?.paciente
            const pendientes = evs.filter(e => e.status === 'pendiente').length

            return (
              <div key={pacienteId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Cabecera del paciente */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: '#1B2B4B' }}>
                      {paciente?.nombre?.[0]}{paciente?.apellido?.[0]}
                    </div>
                    <div>
                      <Link
                        href={`/pacientes/${pacienteId}`}
                        className="text-sm font-semibold hover:text-[#2AABBF] transition-colors"
                        style={{ color: '#1B2B4B' }}>
                        {paciente?.nombre} {paciente?.apellido}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {evs.length} evento{evs.length !== 1 ? 's' : ''}
                        {pendientes > 0 && (
                          <span className="ml-2 text-amber-600 font-medium">
                            · {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/pacientes/${pacienteId}/plan-cuidado`}
                    className="flex items-center gap-1.5 text-xs hover:underline"
                    style={{ color: '#2AABBF' }}>
                    <ClipboardList size={12} />
                    Ver plan
                  </Link>
                </div>

                {/* Filas de eventos */}
                <div className="divide-y divide-gray-50">
                  {evs.map(ev => (
                    <EventoRow key={ev.id} evento={ev} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
