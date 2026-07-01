import { getPaciente }       from '@/lib/actions/pacientes'
import { getCasosByPaciente } from '@/lib/actions/casos'
import { getPlanActivo, getPlanesByPaciente } from '@/lib/actions/plan-atencion'
import { notFound }            from 'next/navigation'
import Link                    from 'next/link'
import { ArrowLeft }           from 'lucide-react'
import { PlanAtencionClient }  from './PlanAtencionClient'

export default async function PlanAtencionPage({ params }: { params: { id: string } }) {
  let paciente
  try { paciente = await getPaciente(params.id) }
  catch { notFound() }

  const casos     = await getCasosByPaciente(params.id)
  const casoActivo = casos.find(c => c.status === 'activo') ?? casos[0] ?? null
  const planActivo = await getPlanActivo(params.id)
  const historial  = await getPlanesByPaciente(params.id)

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/pacientes/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1B2B4B]">Plan de Atención</h1>
          <p className="text-sm text-gray-500">{paciente.nombre} {paciente.apellido}</p>
        </div>
      </div>

      <PlanAtencionClient
        pacienteId={params.id}
        casoId={casoActivo?.id ?? null}
        planActivo={planActivo}
        historial={historial}
      />
    </div>
  )
}
