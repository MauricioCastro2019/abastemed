import { getEnfermero } from '@/lib/actions/enfermeros'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Phone, Mail, Star, Briefcase, FileText, Download } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EnfermeroDetailPage({ params }: { params: { id: string } }) {
  let enfermero
  try {
    enfermero = await getEnfermero(params.id)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/enfermeros" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: '#1B2B4B' }}>
              {enfermero.nombre[0]}{enfermero.apellido[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
                {enfermero.nombre} {enfermero.apellido}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-500">{enfermero.cedula}</span>
                <span className="text-gray-300">·</span>
                <Badge variant="outline" className="text-xs"
                  style={{
                    borderColor: enfermero.disponible ? '#2AABBF' : '#e5e7eb',
                    color: enfermero.disponible ? '#2AABBF' : '#6b7280',
                    backgroundColor: enfermero.disponible ? '#EBF8FB' : 'transparent',
                  }}>
                  {enfermero.disponible ? 'Disponible' : 'No disponible'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <Link href={`/enfermeros/${enfermero.id}/editar`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white">
          <Pencil size={14} />
          Editar
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <span className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
              {enfermero.rating?.toFixed(1) ?? '0.0'}
            </span>
          </div>
          <p className="text-xs text-gray-400">Rating</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Briefcase size={16} style={{ color: '#2AABBF' }} />
            <span className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
              {enfermero.total_casos}
            </span>
          </div>
          <p className="text-xs text-gray-400">Casos totales</p>
        </div>
      </div>

      {/* Contacto */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2B4B' }}>Contacto</h2>
        <div className="space-y-3">
          <a href={`tel:${enfermero.telefono}`}
            className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
            <Phone size={15} />
            {enfermero.telefono}
          </a>
          <a href={`mailto:${enfermero.email}`}
            className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
            <Mail size={15} />
            {enfermero.email}
          </a>
        </div>
      </div>

      {/* Especialidades */}
      {enfermero.especialidades?.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2B4B' }}>Especialidades</h2>
          <div className="flex flex-wrap gap-2">
            {enfermero.especialidades.map((esp, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
                {esp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CV */}
      {enfermero.cv_url && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2B4B' }}>Currículum vitae</h2>
          <a href={enfermero.cv_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[#2AABBF] text-[#2AABBF] hover:bg-[#EBF8FB] transition-all">
            <Download size={15} />
            Ver / Descargar CV
          </a>
        </div>
      )}

      {/* Bio */}
      {enfermero.bio && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Notas</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{enfermero.bio}</p>
        </div>
      )}
    </div>
  )
}
