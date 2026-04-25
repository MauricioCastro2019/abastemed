import { getRecibo } from '@/lib/actions/recibos'
import { ReciboForm } from '@/components/admin/recibos/ReciboForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: { id: string }
}

export default async function EditarReciboPage({ params }: Props) {
  let recibo
  try {
    recibo = await getRecibo(params.id)
  } catch {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/recibos/${recibo.id}`}
          className="p-2 rounded-lg text-gray-400 hover:text-[#2AABBF] hover:bg-white transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Editar recibo</h1>
          <p className="text-sm font-mono text-gray-400 mt-0.5">{recibo.folio}</p>
        </div>
      </div>

      <ReciboForm recibo={recibo} />
    </div>
  )
}
