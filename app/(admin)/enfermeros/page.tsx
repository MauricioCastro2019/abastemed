import { getEnfermeros, aprobarEnfermero } from '@/lib/actions/enfermeros'
import { Badge } from '@/components/ui/badge'
import { Stethoscope, Plus, ChevronRight, Star, Clock } from 'lucide-react'
import Link from 'next/link'
import type { Enfermero } from '@/types'

export default async function EnfermerosPage() {
  let enfermeros: Enfermero[] = []
  try { enfermeros = await getEnfermeros() } catch { enfermeros = [] }

  const pendientes   = enfermeros.filter(e => !e.disponible && e.total_casos === 0)
  const activos      = enfermeros.filter(e => e.disponible)
  const noDisponible = enfermeros.filter(e => !e.disponible && e.total_casos > 0)
  const disponibles  = activos.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Enfermeros</h1>
          <p className="text-sm text-gray-500 mt-1">
            {enfermeros.length} registrado{enfermeros.length !== 1 ? 's' : ''} · {disponibles} disponible{disponibles !== 1 ? 's' : ''}
            {pendientes.length > 0 && ` · ${pendientes.length} por aprobar`}
          </p>
        </div>
        <Link href="/enfermeros/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={16} />
          Nuevo enfermero/a
        </Link>
      </div>

      {/* Pendientes de aprobación */}
      {pendientes.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock size={12} />
            Por aprobar ({pendientes.length})
          </h2>
          <div className="space-y-2">
            {pendientes.map(e => (
              <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: '#D97706' }}>
                  {e.nombre[0]}{e.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
                    {e.nombre} {e.apellido}
                  </p>
                  <p className="text-xs text-gray-400">{e.cedula} · {e.email}</p>
                  {e.especialidades?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">{e.especialidades.join(', ')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/enfermeros/${e.id}`}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-all">
                    Ver perfil
                  </Link>
                  <form action={async () => {
                    'use server'
                    await aprobarEnfermero(e.id)
                  }}>
                    <button type="submit"
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all"
                      style={{ backgroundColor: '#059669' }}>
                      Aprobar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Equipo activo */}
      {enfermeros.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#EEF1F7' }}>
            <Stethoscope size={24} style={{ color: '#1B2B4B' }} />
          </div>
          <p className="font-medium text-gray-700 mb-1">No hay enfermeros registrados</p>
          <p className="text-sm text-gray-400 mb-4">Comparte el link de registro con tu equipo</p>
          <Link href="/enfermeros/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={14} />
            Registrar enfermero/a
          </Link>
        </div>
      ) : (
        <>
          {(activos.length > 0 || noDisponible.length > 0) && (
            <section>
              {pendientes.length > 0 && (
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Equipo</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...activos, ...noDisponible].map(e => (
                  <Link key={e.id} href={`/enfermeros/${e.id}`}
                    className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#2AABBF] border border-transparent transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#1B2B4B' }}>
                          {e.nombre[0]}{e.apellido[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
                            {e.nombre} {e.apellido}
                          </p>
                          <p className="text-xs text-gray-400">{e.cedula}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0"
                        style={{
                          borderColor: e.disponible ? '#2AABBF' : '#e5e7eb',
                          color: e.disponible ? '#2AABBF' : '#6b7280',
                          backgroundColor: e.disponible ? '#EBF8FB' : 'transparent',
                        }}>
                        {e.disponible ? 'Disponible' : 'No disponible'}
                      </Badge>
                    </div>

                    {e.especialidades?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {e.especialidades.slice(0, 3).map((esp, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {esp}
                          </span>
                        ))}
                        {e.especialidades.length > 3 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                            +{e.especialidades.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span>{e.rating?.toFixed(1) ?? '0.0'}</span>
                        <span>· {e.total_casos} caso{e.total_casos !== 1 ? 's' : ''}</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
