import { getCasos } from '@/lib/actions/casos'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Plus, ChevronRight, MapPin, Clock, Search } from 'lucide-react'
import Link from 'next/link'
import type { Caso } from '@/types'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  activo:  { label: 'Activo',  color: '#2AABBF', bg: '#EBF8FB', border: '#2AABBF' },
  pausado: { label: 'Pausado', color: '#D97706', bg: '#FFFBEB', border: '#D97706' },
  cerrado: { label: 'Cerrado', color: '#6b7280', bg: 'transparent', border: '#e5e7eb' },
}

export default async function CasosPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams.q?.trim()
  let casos: Caso[] = []
  let fetchError: string | null = null
  try {
    casos = await getCasos(q)
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Error al cargar los casos'
  }

  const activos  = casos.filter(c => c.status === 'activo').length
  const pausados = casos.filter(c => c.status === 'pausado').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Casos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activos} activo{activos !== 1 ? 's' : ''}
            {pausados > 0 && ` · ${pausados} pausado${pausados !== 1 ? 's' : ''}`}
            {' · '}{casos.length} total
          </p>
        </div>
        <Link href="/casos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={16} />
          Nuevo caso
        </Link>
      </div>

      {/* Error de carga */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Error al cargar casos: <strong>{fetchError}</strong>
        </div>
      )}

      {/* Búsqueda */}
      <form method="GET" className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por título o dirección..."
          className="w-full sm:max-w-xs pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all"
        />
      </form>

      {/* Lista */}
      {casos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#EEF1F7' }}>
            <FolderOpen size={24} style={{ color: '#1B2B4B' }} />
          </div>
          <p className="font-medium text-gray-700 mb-1">
            {q ? 'Sin resultados' : 'No hay casos registrados'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {q ? `No se encontraron casos para "${q}"` : 'Crea el primer caso vinculando un paciente'}
          </p>
          {!q && (
            <Link href="/casos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: '#2AABBF' }}>
              <Plus size={14} />
              Nuevo caso
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {casos.map(c => {
            const st = STATUS_STYLE[c.status]
            const diasActivo = Math.floor(
              (Date.now() - new Date(c.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
            )
            const paciente = c.paciente as { nombre: string; apellido: string } | undefined

            return (
              <Link key={c.id} href={`/casos/${c.id}`}
                className="flex items-center gap-4 bg-white rounded-xl px-6 py-4 shadow-sm hover:shadow-md border border-transparent hover:border-[#2AABBF] transition-all group">

                <div className="w-2 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.color }} />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#1B2B4B' }}>
                    {c.titulo}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {paciente && (
                      <span className="text-xs text-gray-500">
                        {paciente.nombre} {paciente.apellido}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={10} />
                      <span className="capitalize">{c.contexto.replace('_', ' ')}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={10} />
                      {diasActivo === 0 ? 'Hoy' : `${diasActivo}d`}
                    </span>
                  </div>
                </div>

                <div className="text-right hidden sm:block flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                    ${c.tarifa_hora}/h
                  </p>
                  <p className="text-xs text-gray-400">tarifa</p>
                </div>

                <Badge variant="outline" className="text-xs flex-shrink-0"
                  style={{ borderColor: st.border, color: st.color, backgroundColor: st.bg }}>
                  {st.label}
                </Badge>

                <ChevronRight size={16} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
