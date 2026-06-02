import { getProspectos } from '@/lib/actions/prospectos'
import { ProspectoStatusBadge } from '@/components/admin/prospectos/SemaforoBadge'
import { Plus, Search, ChevronRight, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import type { Prospect } from '@/types'

const STATUS_FILTER_OPTIONS = [
  { value: 'todos',                    label: 'Todos' },
  { value: 'nuevo',                    label: 'Nuevos' },
  { value: 'prelevantamiento_iniciado',label: 'En proceso' },
  { value: 'cotizacion_generada',      label: 'Cotizados' },
  { value: 'propuesta_enviada',        label: 'Propuesta enviada' },
  { value: 'propuesta_aceptada',       label: 'Aceptados' },
  { value: 'listo_para_activar',       label: 'Listos para activar' },
  { value: 'paciente_activo',          label: 'Paciente activo' },
  { value: 'rechazado',                label: 'Rechazados' },
]

export default async function ProspectosPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string }
}) {
  const q      = searchParams.q?.trim()
  const status = searchParams.status ?? 'todos'

  let prospectos: Prospect[] = []
  try {
    prospectos = await getProspectos(q, status)
  } catch {
    prospectos = []
  }

  const total    = prospectos.length
  const urgentes = prospectos.filter(p => p.is_urgent).length

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Prospectos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} prospecto{total !== 1 ? 's' : ''}
            {urgentes > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                {urgentes} urgente{urgentes !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/prospectos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={16} />
          Nuevo prospecto
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form method="GET" className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar solicitante o responsable..."
            className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all w-full sm:w-72"
          />
          {status !== 'todos' && <input type="hidden" name="status" value={status} />}
        </form>

        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <Link
              key={opt.value}
              href={`/prospectos?status=${opt.value}${q ? `&q=${q}` : ''}`}
              className="px-3 py-1.5 text-xs font-medium rounded-full border transition-all"
              style={{
                backgroundColor: status === opt.value ? '#1B2B4B' : 'white',
                color:           status === opt.value ? 'white'   : '#6b7280',
                borderColor:     status === opt.value ? '#1B2B4B' : '#e5e7eb',
              }}>
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Lista */}
      {prospectos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#EBF8FB' }}>
            <UserPlus size={24} style={{ color: '#2AABBF' }} />
          </div>
          <p className="font-medium text-gray-700 mb-1">
            {q ? 'Sin resultados' : 'No hay prospectos registrados'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {q ? `No se encontraron prospectos para "${q}"` : 'Registra el primer prospecto para comenzar la evaluación'}
          </p>
          {!q && (
            <Link href="/prospectos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: '#2AABBF' }}>
              <Plus size={14} />
              Nuevo prospecto
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Solicitante</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Medio / Urgencia</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {prospectos.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 ${p.is_urgent ? 'bg-red-500' : ''}`}
                        style={p.is_urgent ? {} : { backgroundColor: '#1B2B4B' }}>
                        {p.requester_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: '#1B2B4B' }}>
                          {p.requester_name}
                          {p.is_urgent && (
                            <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">URGENTE</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{p.requester_phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-600 capitalize">{p.source?.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400 capitalize">{p.urgency?.replace('_', ' ')}</p>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <ProspectoStatusBadge status={p.status} />
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="text-sm text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/prospectos/${p.id}`}
                      className="flex items-center justify-end text-gray-400 hover:text-[#2AABBF] transition-colors">
                      <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
