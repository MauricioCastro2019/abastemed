import { EnfermeroForm } from '@/components/admin/enfermeros/EnfermeroForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NuevoEnfermeroPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/enfermeros" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nuevo enfermero/a</h1>
          <p className="text-sm text-gray-500 mt-0.5">Completa los datos del profesional</p>
        </div>
      </div>
      <EnfermeroForm />
    </div>
  )
}
