import { getCaso } from '@/lib/actions/casos'
import { getKardexByCaso } from '@/lib/actions/kardex'
import { KardexClient } from '@/components/admin/kardex/KardexClient'
import { ArrowLeft, Pill } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Paciente } from '@/types'

export default async function KardexPage({ params }: { params: { id: string } }) {
  let caso
  try {
    caso = await getCaso(params.id)
  } catch {
    notFound()
  }

  const kardex  = await getKardexByCaso(params.id)
  const paciente = caso.paciente as Paciente | undefined

  const activos     = kardex.filter(k => k.estatus === 'activo').length
  const suspendidos = kardex.filter(k => k.estatus === 'suspendido').length

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
              <Pill size={20} style={{ color: '#2AABBF' }} />
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Kardex de Medicamentos</h1>
            </div>
            {paciente && (
              <p className="text-sm text-gray-500 mt-0.5">
                {paciente.nombre} {paciente.apellido} · {caso.titulo}
              </p>
            )}
          </div>
        </div>
        <Link href={`/casos/${params.id}/incidencias`}
          className="text-xs text-[#2AABBF] hover:underline flex-shrink-0">
          Ver incidencias →
        </Link>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold" style={{ color: '#2AABBF' }}>{kardex.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{activos}</p>
          <p className="text-xs text-gray-500 mt-0.5">Activos</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-400">{suspendidos}</p>
          <p className="text-xs text-gray-500 mt-0.5">Suspendidos</p>
        </div>
      </div>

      {/* Cliente interactivo */}
      <KardexClient casoId={params.id} kardex={kardex} />
    </div>
  )
}
