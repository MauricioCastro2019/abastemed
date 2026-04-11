import { getCaso } from '@/lib/actions/casos'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, MapPin, Calendar, DollarSign, FileText, User, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Paciente } from '@/types'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  activo:  { label: 'Activo',  color: '#2AABBF', bg: '#EBF8FB', border: '#2AABBF' },
  pausado: { label: 'Pausado', color: '#D97706', bg: '#FFFBEB', border: '#D97706' },
  cerrado: { label: 'Cerrado', color: '#6b7280', bg: 'transparent', border: '#e5e7eb' },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default async function CasoDetailPage({ params }: { params: { id: string } }) {
  let caso
  try {
    caso = await getCaso(params.id)
  } catch {
    notFound()
  }

  const st = STATUS_STYLE[caso.status]
  const paciente = caso.paciente as Paciente | undefined
  const diasActivo = Math.floor(
    (Date.now() - new Date(caso.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/casos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{caso.titulo}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs"
                style={{ borderColor: st.border, color: st.color, backgroundColor: st.bg }}>
                {st.label}
              </Badge>
              <span className="text-xs text-gray-400">{diasActivo}d activo</span>
            </div>
          </div>
        </div>
        <Link href={`/casos/${caso.id}/editar`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white">
          <Pencil size={14} />
          Editar
        </Link>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <DollarSign size={16} className="mx-auto mb-1" style={{ color: '#2AABBF' }} />
          <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>${caso.tarifa_hora}</p>
          <p className="text-xs text-gray-400">por hora</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <Calendar size={16} className="mx-auto mb-1" style={{ color: '#2AABBF' }} />
          <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>{diasActivo}</p>
          <p className="text-xs text-gray-400">días activo</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <MapPin size={16} className="mx-auto mb-1" style={{ color: '#2AABBF' }} />
          <p className="text-lg font-bold capitalize" style={{ color: '#1B2B4B' }}>
            {caso.contexto.replace('_', ' ')}
          </p>
          <p className="text-xs text-gray-400">contexto</p>
        </div>
      </div>

      {/* Paciente */}
      {paciente && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User size={15} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Paciente</h2>
            </div>
            <Link href={`/pacientes/${paciente.id}`}
              className="text-xs text-[#2AABBF] hover:underline">
              Ver perfil →
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#1B2B4B' }}>
              {paciente.nombre[0]}{paciente.apellido[0]}
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: '#1B2B4B' }}>
                {paciente.nombre} {paciente.apellido}
              </p>
              <p className="text-xs text-gray-400 capitalize">{paciente.contexto?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fechas y dirección */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2B4B' }}>Detalles</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Dirección</p>
              <p className="text-sm text-gray-700">{caso.direccion}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Período</p>
              <p className="text-sm text-gray-700">
                {formatDate(caso.fecha_inicio)}
                {caso.fecha_fin && ` → ${formatDate(caso.fecha_fin)}`}
                {!caso.fecha_fin && ' → Por definir'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notas */}
      {caso.notas && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Notas para enfermeros</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{caso.notas}</p>
        </div>
      )}

      {/* Turnos — próximo módulo */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Turnos asignados</h2>
          <Link href={`/turnos/nuevo?caso_id=${caso.id}`}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={12} />
            Asignar turno
          </Link>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">
          Los turnos aparecerán aquí una vez construido el módulo.
        </p>
      </div>
    </div>
  )
}
