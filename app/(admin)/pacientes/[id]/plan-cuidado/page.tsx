import { getPaciente } from '@/lib/actions/pacientes'
import { getIndicacionesByPaciente } from '@/lib/actions/plan-cuidado'
import { IndicacionCard } from '@/components/plan-cuidado/IndicacionCard'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, ClipboardList } from 'lucide-react'

export default async function PlanCuidadoPage({ params }: { params: { id: string } }) {
  let paciente
  try {
    paciente = await getPaciente(params.id)
  } catch {
    notFound()
  }

  const indicaciones = await getIndicacionesByPaciente(params.id)
  const activas   = indicaciones.filter(i => i.activa)
  const inactivas = indicaciones.filter(i => !i.activa)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/pacientes/${params.id}`}
            className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList size={20} style={{ color: '#2AABBF' }} />
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Plan de Cuidado</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {paciente.nombre} {paciente.apellido}
            </p>
          </div>
        </div>

        <Link
          href={`/pacientes/${params.id}/plan-cuidado/nueva`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={16} />
          Nueva indicación
        </Link>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: '#2AABBF' }}>{indicaciones.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{activas.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Activas</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-400">{inactivas.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Inactivas</p>
        </div>
      </div>

      {/* Indicaciones activas */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Indicaciones activas · {activas.length}
        </h2>

        {activas.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">Sin indicaciones activas</p>
            <p className="text-xs text-gray-300 mt-1">
              Agrega la primera indicación del plan de cuidado
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activas.map(ind => (
              <IndicacionCard key={ind.id} indicacion={ind} pacienteId={params.id} />
            ))}
          </div>
        )}
      </div>

      {/* Indicaciones inactivas */}
      {inactivas.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Inactivas · {inactivas.length}
          </h2>
          <div className="space-y-3 opacity-50">
            {inactivas.map(ind => (
              <IndicacionCard key={ind.id} indicacion={ind} pacienteId={params.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
