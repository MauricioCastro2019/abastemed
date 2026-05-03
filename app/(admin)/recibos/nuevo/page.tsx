import { ReciboForm } from '@/components/admin/recibos/ReciboForm'
import { getPacientes } from '@/lib/actions/pacientes'
import { getCatalogo } from '@/lib/actions/insumos'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NuevoReciboPage() {
  const [todosPacientes, catalogo] = await Promise.all([
    getPacientes(),
    getCatalogo(),
  ])
  const pacientes = todosPacientes.filter(p => p.status === 'activo')

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/recibos"
          className="p-2 rounded-lg text-gray-400 hover:text-[#2AABBF] hover:bg-white transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nuevo recibo</h1>
          <p className="text-sm text-gray-500 mt-0.5">El folio se genera automáticamente</p>
        </div>
      </div>

      <ReciboForm pacientes={pacientes} catalogo={catalogo} />
    </div>
  )
}
