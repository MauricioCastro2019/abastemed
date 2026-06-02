import { ProspectoForm } from '@/components/admin/prospectos/ProspectoForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NuevoProspectoPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/prospectos" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nuevo prospecto</h1>
          <p className="text-sm text-gray-500 mt-1">Paso 1 de 8 — Datos del solicitante</p>
        </div>
      </div>
      <ProspectoForm />
    </div>
  )
}
