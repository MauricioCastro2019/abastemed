import { getPaciente } from '@/lib/actions/pacientes'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Phone, Mail, User, Pill, AlertTriangle, MapPin } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function PacienteDetailPage({ params }: { params: { id: string } }) {
  let paciente
  try {
    paciente = await getPaciente(params.id)
  } catch {
    notFound()
  }

  const edad = new Date().getFullYear() - new Date(paciente.fecha_nacimiento).getFullYear()

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pacientes" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: '#1B2B4B' }}>
              {paciente.nombre[0]}{paciente.apellido[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
                {paciente.nombre} {paciente.apellido}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-500">{edad} años</span>
                <span className="text-gray-300">·</span>
                <Badge variant="outline" className="text-xs"
                  style={{
                    borderColor: paciente.status === 'activo' ? '#2AABBF' : '#e5e7eb',
                    color: paciente.status === 'activo' ? '#2AABBF' : '#6b7280',
                    backgroundColor: paciente.status === 'activo' ? '#EBF8FB' : 'transparent',
                  }}>
                  {paciente.status === 'activo' ? 'Activo' : 'Cerrado'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <Link href={`/pacientes/${paciente.id}/editar`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white">
          <Pencil size={14} />
          Editar
        </Link>
      </div>

      {/* Diagnóstico */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Diagnóstico</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{paciente.diagnostico}</p>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <MapPin size={12} />
          <span className="capitalize">{paciente.contexto.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Medicamentos */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={16} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Medicamentos</h2>
          </div>
          {paciente.medicamentos?.length > 0 ? (
            <ul className="space-y-1.5">
              {paciente.medicamentos.map((m, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#2AABBF' }} />
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Sin medicamentos registrados</p>
          )}
        </div>

        {/* Alergias */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Alergias</h2>
          </div>
          {paciente.alergias?.length > 0 ? (
            <ul className="space-y-1.5">
              {paciente.alergias.map((a, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Sin alergias registradas</p>
          )}
        </div>
      </div>

      {/* Contacto familiar */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2B4B' }}>Contacto familiar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Nombre</p>
            <p className="text-sm font-medium text-gray-700">{paciente.contacto_familiar?.nombre}</p>
            <p className="text-xs text-gray-400">{paciente.contacto_familiar?.relacion}</p>
          </div>
          <div className="space-y-2">
            {paciente.contacto_familiar?.telefono && (
              <a href={`tel:${paciente.contacto_familiar.telefono}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
                <Phone size={14} />
                {paciente.contacto_familiar.telefono}
              </a>
            )}
            {paciente.contacto_familiar?.email && (
              <a href={`mailto:${paciente.contacto_familiar.email}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
                <Mail size={14} />
                {paciente.contacto_familiar.email}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
