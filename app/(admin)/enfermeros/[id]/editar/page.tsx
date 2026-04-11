import { getEnfermero } from '@/lib/actions/enfermeros'
import { EnfermeroForm } from '@/components/admin/enfermeros/EnfermeroForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EditarEnfermeroPage({ params }: { params: { id: string } }) {
  let enfermero
  try {
    enfermero = await getEnfermero(params.id)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/enfermeros/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Editar enfermero/a</h1>
          <p className="text-sm text-gray-500 mt-0.5">{enfermero.nombre} {enfermero.apellido}</p>
        </div>
      </div>
      <EnfermeroForm enfermero={enfermero} />
    </div>
  )
}
