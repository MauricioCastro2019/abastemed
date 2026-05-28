import { getLevantamiento } from '@/lib/actions/levantamientos'
import { LevantamientoWizard } from '@/components/admin/levantamientos/LevantamientoWizard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EditarLevantamientoPage({ params }: { params: { id: string } }) {
  let lev
  try {
    lev = await getLevantamiento(params.id)
  } catch {
    notFound()
  }

  if (lev.estado === 'convertido') {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Link href={`/levantamientos/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Editar Levantamiento</h1>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <p className="text-gray-500">Este levantamiento ya fue convertido a servicio activo y no puede editarse.</p>
          <Link href={`/levantamientos/${params.id}`}
            className="inline-flex mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#2AABBF' }}>
            Volver al detalle
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/levantamientos/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Editar Levantamiento</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lev.paciente_nombre} {lev.paciente_apellido}
          </p>
        </div>
      </div>

      <LevantamientoWizard levantamiento={lev} />
    </div>
  )
}
