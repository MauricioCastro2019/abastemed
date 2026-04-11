import { getPacientes } from '@/lib/actions/pacientes'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { Paciente } from '@/types'

export default async function PacientesPage() {
  let pacientes: Paciente[] = []
  try {
    pacientes = await getPacientes()
  } catch {
    pacientes = []
  }

  const activos = pacientes.filter(p => p.status === 'activo').length
  const cerrados = pacientes.filter(p => p.status === 'cerrado').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Pacientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activos} activo{activos !== 1 ? 's' : ''} · {cerrados} cerrado{cerrados !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/pacientes/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={16} />
          Nuevo paciente
        </Link>
      </div>

      {/* Lista */}
      {pacientes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#EBF8FB' }}>
            <Users size={24} style={{ color: '#2AABBF' }} />
          </div>
          <p className="font-medium text-gray-700 mb-1">No hay pacientes registrados</p>
          <p className="text-sm text-gray-400 mb-4">Comienza dando de alta al primer paciente</p>
          <Link href="/pacientes/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: '#2AABBF' }}>
            <Plus size={14} />
            Nuevo paciente
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Paciente</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Diagnóstico</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Contexto</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pacientes.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                        style={{ backgroundColor: '#1B2B4B' }}>
                        {p.nombre[0]}{p.apellido[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: '#1B2B4B' }}>
                          {p.nombre} {p.apellido}
                        </p>
                        <p className="text-xs text-gray-400">{p.contacto_familiar?.nombre}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-600 max-w-xs truncate">{p.diagnostico}</p>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="text-sm text-gray-500 capitalize">{p.contexto.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: p.status === 'activo' ? '#2AABBF' : '#e5e7eb',
                        color: p.status === 'activo' ? '#2AABBF' : '#6b7280',
                        backgroundColor: p.status === 'activo' ? '#EBF8FB' : 'transparent',
                      }}>
                      {p.status === 'activo' ? 'Activo' : 'Cerrado'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/pacientes/${p.id}`}
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
