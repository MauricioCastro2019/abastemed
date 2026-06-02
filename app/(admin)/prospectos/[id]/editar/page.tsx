import { getProspecto } from '@/lib/actions/prospectos'
import { ProspectoForm } from '@/components/admin/prospectos/ProspectoForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EditarProspectoPage({ params }: { params: { id: string } }) {
  const { id } = params
  let prospect
  try {
    prospect = await getProspecto(id)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/prospectos/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Editar prospecto</h1>
          <p className="text-sm text-gray-500 mt-1">{prospect.requester_name}</p>
        </div>
      </div>
      <ProspectoForm prospect={prospect} />
    </div>
  )
}
