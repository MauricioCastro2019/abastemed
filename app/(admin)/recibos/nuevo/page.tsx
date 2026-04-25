import { ReciboForm } from '@/components/admin/recibos/ReciboForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NuevoReciboPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/recibos"
          className="p-2 rounded-lg text-gray-400 hover:text-[#2AABBF] hover:bg-white transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nuevo recibo</h1>
          <p className="text-sm text-gray-500 mt-0.5">El folio se genera automáticamente</p>
        </div>
      </div>

      <ReciboForm />
    </div>
  )
}
