import { getEnfermeros } from '@/lib/actions/enfermeros'
import { Badge } from '@/components/ui/badge'
import { Stethoscope, Plus, ChevronRight, Star } from 'lucide-react'
import Link from 'next/link'
import type { Enfermero } from '@/types'

export default async function EnfermerosPage() {
  let enfermeros: Enfermero[] = []
  try {
    enfermeros = await getEnfermeros()
  } catch {
    enfermeros = []
  }

  const disponibles = enfermeros.filter(e => e.disponible).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Enfermeros</h1>
          <p className="text-sm text-gray-500 mt-1">
            {enfermeros.length} registrado{enfermeros.length !== 1 ? 's' : ''} · {disponibles} disponible{disponibles !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/enfermeros/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={16} />
          Nuevo enfermero/a
        </Link>
      </div>

      {/* Grid de tarjetas */}
      {enfermeros.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#EEF1F7' }}>
            <Stethoscope size={24} style={{ color: '#1B2B4B' }} />
          </div>
          <p className="font-medium text-gray-700 mb-1">No hay enfermeros registrados</p>
          <p className="text-sm text-gray-400 mb-4">Registra a tu equipo de enfermería</p>
          <Link href="/enfermeros/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={14} />
            Registrar enfermero/a
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {enfermeros.map(e => (
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
                  {e.disponible ? 'Disponible' : 'Ocupado'}
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
      )}
    </div>
  )
}
