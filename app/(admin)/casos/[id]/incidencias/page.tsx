import { getCaso } from '@/lib/actions/casos'
import { getIncidenciasByCaso } from '@/lib/actions/incidencias'
import { IncidenciasClient } from '@/components/admin/incidencias/IncidenciasClient'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Paciente } from '@/types'

export default async function IncidenciasPage({ params }: { params: { id: string } }) {
  let caso
  try {
    caso = await getCaso(params.id)
  } catch {
    notFound()
  }

  const incidencias = await getIncidenciasByCaso(params.id)
  const paciente    = caso.paciente as Paciente | undefined

  const graves   = incidencias.filter(i => i.gravedad === 'grave' || i.gravedad === 'critica')
  const recientes = incidencias.filter(i => {
    const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
    return new Date(i.fecha_hora) > hace48h
  })

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/casos/${params.id}`}
            className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} style={{ color: '#dc2626' }} />
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Incidencias</h1>
            </div>
            {paciente && (
              <p className="text-sm text-gray-500 mt-0.5">
                {paciente.nombre} {paciente.apellido} · {caso.titulo}
              </p>
            )}
          </div>
        </div>
        <Link href={`/casos/${params.id}/kardex`}
          className="text-xs text-[#2AABBF] hover:underline flex-shrink-0">
          Ver kardex →
        </Link>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{incidencias.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className={`text-2xl font-bold ${graves.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {graves.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Graves / Críticas</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className={`text-2xl font-bold ${recientes.length > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            {recientes.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Últimas 48h</p>
        </div>
      </div>

      {/* Semáforo de alerta si hay incidencias críticas recientes */}
      {graves.filter(i => new Date(i.fecha_hora) > new Date(Date.now() - 48 * 60 * 60 * 1000)).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Alerta — Incidencias graves en las últimas 48h</p>
            <p className="text-xs text-red-600 mt-0.5">
              Este paciente requiere seguimiento clínico especial.
            </p>
          </div>
        </div>
      )}

      {/* Cliente interactivo */}
      <IncidenciasClient casoId={params.id} incidencias={incidencias} />
    </div>
  )
}
