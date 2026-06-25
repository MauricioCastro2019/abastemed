import { getAllIndicacionesActivas, getEventosByFecha } from '@/lib/actions/plan-cuidado'
import { IndicacionCard } from '@/components/plan-cuidado/IndicacionCard'
import { ClipboardList, Plus, CalendarClock, UserRound } from 'lucide-react'
import Link from 'next/link'

export default async function PlanCuidadoHubPage() {
  const hoy = new Date().toISOString().split('T')[0]

  const [indicaciones, eventosHoy] = await Promise.all([
    getAllIndicacionesActivas(),
    getEventosByFecha(hoy),
  ])

  // Agrupar indicaciones activas por paciente
  const byPaciente = indicaciones.reduce<Record<string, typeof indicaciones>>((acc, ind) => {
    const pid = ind.paciente_id
    if (!acc[pid]) acc[pid] = []
    acc[pid].push(ind)
    return acc
  }, {})

  const totalPacientes  = Object.keys(byPaciente).length
  const pendientesHoy   = eventosHoy.filter(e => e.status === 'pendiente').length
  const confirmadosHoy  = eventosHoy.filter(e => e.status === 'confirmado').length

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={22} style={{ color: '#2AABBF' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Plan de Cuidado</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/agenda-cuidado"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all"
            style={{ color: '#1B2B4B' }}>
            <CalendarClock size={15} />
            Agenda de hoy
            {pendientesHoy > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                {pendientesHoy}
              </span>
            )}
          </Link>

          <Link
            href="/plan-cuidado/nueva"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={15} />
            Nueva indicación
          </Link>
        </div>
      </div>

      {/* Stats del día */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: '#2AABBF' }}>{totalPacientes}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pacientes con plan</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{indicaciones.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Indicaciones activas</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-600">{pendientesHoy}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Pendientes hoy
            {confirmadosHoy > 0 && (
              <span className="ml-1 text-emerald-500">· {confirmadosHoy} ✓</span>
            )}
          </p>
        </div>
      </div>

      {/* Contenido principal */}
      {totalPacientes === 0 ? (
        <div className="bg-white rounded-xl p-14 shadow-sm text-center">
          <ClipboardList size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-sm font-medium text-gray-500">Sin indicaciones activas</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">
            Registra la primera indicación del plan de cuidado
          </p>
          <Link
            href="/plan-cuidado/nueva"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={15} /> Nueva indicación
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byPaciente).map(([pacienteId, inds]) => {
            const paciente = inds[0]?.paciente
            return (
              <div key={pacienteId}>
                {/* Cabecera del paciente */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: '#1B2B4B' }}>
                      {paciente?.nombre?.[0]}{paciente?.apellido?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                        {paciente?.nombre} {paciente?.apellido}
                      </p>
                      <p className="text-xs text-gray-400">
                        {inds.length} indicación{inds.length !== 1 ? 'es' : ''} activa{inds.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/agenda-cuidado?paciente=${pacienteId}`}
                      className="text-xs text-gray-400 hover:text-[#2AABBF] transition-colors flex items-center gap-1">
                      <CalendarClock size={12} />
                      Agenda
                    </Link>
                    <Link
                      href={`/pacientes/${pacienteId}/plan-cuidado`}
                      className="text-xs font-medium hover:underline flex items-center gap-1"
                      style={{ color: '#2AABBF' }}>
                      <UserRound size={12} />
                      Ver plan completo
                    </Link>
                  </div>
                </div>

                {/* Indicaciones del paciente */}
                <div className="space-y-2">
                  {inds.map(ind => (
                    <IndicacionCard key={ind.id} indicacion={ind} pacienteId={pacienteId} />
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
