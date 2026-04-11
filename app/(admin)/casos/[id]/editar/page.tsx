import { getCaso } from '@/lib/actions/casos'
import { getPacientes } from '@/lib/actions/pacientes'
import { CasoForm } from '@/components/admin/casos/CasoForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Paciente } from '@/types'

export default async function EditarCasoPage({ params }: { params: { id: string } }) {
  let caso, pacientes: Paciente[] = []
  try {
    [caso, pacientes] = await Promise.all([
      getCaso(params.id),
      getPacientes(),
    ])
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
          <p className="text-sm text-gray-500 mt-0.5">{caso.titulo}</p>
        </div>
      </div>
      <CasoForm caso={caso} pacientes={pacientes} />
    </div>
  )
}
