import { getCaso, getCoordinadores } from '@/lib/actions/casos'
import { getPacientes } from '@/lib/actions/pacientes'
import { requireAuth } from '@/lib/actions/utils'
import { CasoForm } from '@/components/admin/casos/CasoForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Caso, Paciente, PerfilUsuario } from '@/types'

export default async function EditarCasoPage({ params }: { params: { id: string } }) {
  let caso: Caso | undefined, pacientes: Paciente[] = [], coordinadores: PerfilUsuario[] = [], rolActual = 'coordinador'

  try {
    const { perfil } = await requireAuth()
    rolActual = perfil.rol

    const results = await Promise.allSettled([
      getCaso(params.id),
      getPacientes(),
      perfil.rol === 'admin' ? getCoordinadores() : Promise.resolve([]),
    ])

    if (results[0].status === 'rejected') notFound()
    caso = (results[0] as PromiseFulfilledResult<Caso>).value
    if (results[1].status === 'fulfilled') pacientes = results[1].value
    if (results[2].status === 'fulfilled') coordinadores = results[2].value as PerfilUsuario[]
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/casos/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Editar caso</h1>
          <p className="text-sm text-gray-500 mt-0.5">{caso!.titulo}</p>
        </div>
      </div>
      <CasoForm
        caso={caso!}
        pacientes={pacientes}
        coordinadores={coordinadores}
        rolActual={rolActual as 'admin' | 'coordinador'}
      />
    </div>
  )
}
