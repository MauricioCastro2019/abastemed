import { LevantamientoWizard } from '@/components/admin/levantamientos/LevantamientoWizard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NuevoLevantamientoPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/levantamientos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nuevo Levantamiento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Completa la información del paciente paso a paso</p>
        </div>
      </div>

      <LevantamientoWizard />
    </div>
  )
}
