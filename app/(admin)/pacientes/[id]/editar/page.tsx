import { getPaciente } from '@/lib/actions/pacientes'
import { PacienteForm } from '@/components/admin/pacientes/PacienteForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EditarPacientePage({ params }: { params: { id: string } }) {
  let paciente
  try {
    paciente = await getPaciente(params.id)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/pacientes/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Editar paciente</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {paciente.nombre} {paciente.apellido}
          </p>
        </div>
      </div>
      <PacienteForm paciente={paciente} />
    </div>
  )
}
