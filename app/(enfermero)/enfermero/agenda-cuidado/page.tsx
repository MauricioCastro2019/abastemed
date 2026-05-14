import { getEventosByFechaEnfermero } from '@/lib/actions/plan-cuidado'
import { EventoRow } from '@/components/plan-cuidado/EventoRow'
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
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

export default async function EnfermeroAgendaPage({
  searchParams,
}: {
  searchParams: { fecha?: string }
}) {
  const hoy     = new Date().toISOString().split('T')[0]
  const fecha   = searchParams.fecha ?? hoy
  const eventos = await getEventosByFechaEnfermero(fecha)

  const prevFecha = addDays(fecha, -1)
  const nextFecha = addDays(fecha,  1)
  const isHoy     = fecha === hoy

  const pendientes  = eventos.filter(e => e.status === 'pendiente').length
  const confirmados = eventos.filter(e => e.status === 'confirmado').length

  // Agrupar por paciente
  const byPaciente = eventos.reduce<Record<string, typeof eventos>>((acc, ev) => {
    const pid = ev.paciente_id
    if (!acc[pid]) acc[pid] = []
    acc[pid].push(ev)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <CalendarClock size={22} style={{ color: '#2AABBF' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Agenda de Cuidado</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/enfermero/agenda-cuidado?fecha=${prevFecha}`}
            className="p-2 rounded-lg border border-gray-200 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
            <ChevronLeft size={16} />
          </Link>

          <span className="text-sm font-medium text-gray-700 capitalize min-w-[200px] text-center">
            {formatFechaLarga(fecha)}
          </span>

          <Link href={`/enfermero/agenda-cuidado?fecha=${nextFecha}`}
            className="p-2 rounded-lg border border-gray-200 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
            <ChevronRight size={16} />
          </Link>

          {!isHoy && (
            <Link href="/enfermero/agenda-cuidado"
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
              Hoy
            </Link>
          )}
        </div>
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{eventos.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total eventos</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-500">{pendientes}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-500">{confirmados}</p>
          <p className="text-xs text-gray-500 mt-0.5">Confirmados</p>
        </div>
      </div>

      {/* Eventos */}
      {Object.keys(byPaciente).length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <CalendarClock size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">Sin eventos asignados para este día</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byPaciente).map(([pacienteId, evs]) => {
            const paciente  = evs[0]?.indicacion?.paciente
            const pend      = evs.filter(e => e.status === 'pendiente').length

            return (
              <div key={pacienteId} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: '#1B2B4B' }}>
                    {paciente?.nombre?.[0]}{paciente?.apellido?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                      {paciente?.nombre} {paciente?.apellido}
                    </p>
                    <p className="text-xs text-gray-400">
                      {evs.length} evento{evs.length !== 1 ? 's' : ''}
                      {pend > 0 && (
                        <span className="ml-2 text-amber-600 font-medium">
                          · {pend} pendiente{pend !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

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
