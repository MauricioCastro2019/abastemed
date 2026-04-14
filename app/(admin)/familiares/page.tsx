import { getFamiliares } from '@/lib/actions/familiares'
import { Users, Plus, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'

export default async function FamiliaresPage() {
  let familiares: Awaited<ReturnType<typeof getFamiliares>> = []
  try { familiares = await getFamiliares() } catch { /* sin datos */ }

  const vinculados   = familiares.filter(f => f.paciente_id)
  const sinVincular  = familiares.filter(f => !f.paciente_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Familiares</h1>
          <p className="text-sm text-gray-500 mt-1">
            {vinculados.length} vinculado{vinculados.length !== 1 ? 's' : ''} · {sinVincular.length} sin vincular
          </p>
        </div>
        <Link
          href="/familiares/invitar"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
          style={{ backgroundColor: '#2AABBF' }}
        >
          <Plus size={16} />
          Invitar familiar
        </Link>
      </div>

      {/* Lista */}
      {familiares.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <Users size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400 font-medium">Sin cuentas de familiares aún</p>
          <p className="text-xs text-gray-300 mt-1">
            Invita a familiares para que puedan ver el caso y turnos de su paciente
          </p>
          <Link
            href="/familiares/invitar"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-[#2AABBF] hover:underline"
          >
            <Plus size={14} />
            Invitar primer familiar
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {familiares.map(f => {
            const paciente = f.paciente as unknown as { id: string; nombre: string; apellido: string } | null

            return (
              <div key={f.id} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: paciente ? '#1B2B4B' : '#94a3b8' }}
                >
                  {f.nombre?.[0] ?? '?'}{f.apellido?.[0] ?? ''}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
                    {f.nombre} {f.apellido}
                  </p>
                  <p className="text-xs text-gray-400">{f.email}</p>
                  {paciente ? (
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: '#059669' }}>
                      <UserCheck size={11} />
                      Vinculado a: {paciente.nombre} {paciente.apellido}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5 flex items-center gap-1 text-amber-500">
                      <UserX size={11} />
                      Sin paciente vinculado
                    </p>
                  )}
                </div>

                {/* Acción */}
                <Link
                  href={`/familiares/${f.id}`}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all text-gray-600 bg-white flex-shrink-0"
                >
                  {paciente ? 'Editar' : 'Vincular paciente'}
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
