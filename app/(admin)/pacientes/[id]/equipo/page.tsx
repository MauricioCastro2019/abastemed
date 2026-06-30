import { getPaciente } from '@/lib/actions/pacientes'
import {
  getEquipoCuidadoByPaciente,
  getEnfermerosSugeridos,
} from '@/lib/actions/equipo-cuidado'
import { EquipoCuidadoClient } from './EquipoCuidadoClient'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EquipoCuidadoPage({
  params,
}: {
  params: { id: string }
}) {
  const [paciente, equipo, sugeridos] = await Promise.all([
    getPaciente(params.id),
    getEquipoCuidadoByPaciente(params.id),
    getEnfermerosSugeridos(params.id),
  ])

  if (!paciente) notFound()

  return (
    <div className="space-y-5 max-w-4xl mx-auto p-6">
      {/* Navegación de regreso */}
      <Link
        href={`/pacientes/${params.id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={14} />
        {paciente.nombre} {paciente.apellido}
      </Link>

      <EquipoCuidadoClient
        pacienteId={params.id}
        pacienteNombre={`${paciente.nombre} ${paciente.apellido}`}
        activos={equipo.activos}
        pendientes={equipo.pendientes}
        historial={equipo.historial}
        enfermerosSugeridos={sugeridos}
      />
    </div>
  )
}
