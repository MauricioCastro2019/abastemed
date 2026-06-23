import { CasoForm } from '@/components/admin/casos/CasoForm'
import { getPacientes } from '@/lib/actions/pacientes'
import { getCoordinadores } from '@/lib/actions/casos'
import { requireAuth } from '@/lib/actions/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Paciente, PerfilUsuario } from '@/types'

export default async function NuevoCasoPage({
  searchParams,
}: {
  searchParams: { paciente_id?: string; costo?: string }
}) {
  let pacientes: Paciente[] = []
  let coordinadores: PerfilUsuario[] = []
  let rolActual: string = 'coordinador'

  try {
    const { perfil } = await requireAuth()
    rolActual = perfil.rol

    const results = await Promise.allSettled([
      getPacientes(),
      perfil.rol === 'admin' ? getCoordinadores() : Promise.resolve([]),
    ])

    if (results[0].status === 'fulfilled') {
      pacientes = results[0].value.filter(p => p.status === 'activo')
    }
    if (results[1].status === 'fulfilled') {
      coordinadores = results[1].value as PerfilUsuario[]
    }
  } catch {
    pacientes = []
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/casos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nuevo caso</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vincula un paciente y define los parámetros del caso</p>
        </div>
      </div>
      <CasoForm
        pacientes={pacientes}
        coordinadores={coordinadores}
        rolActual={rolActual as 'admin' | 'coordinador'}
        defaultPacienteId={searchParams.paciente_id}
        defaultCosto={searchParams.costo ? Number(searchParams.costo) : undefined}
      />
    </div>
  )
}
