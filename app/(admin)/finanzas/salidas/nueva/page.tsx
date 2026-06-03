import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SalidaForm } from '@/components/admin/finanzas/SalidaForm'
import { getPacientesParaSelect, getCasosParaSelect, getEnfermerosParaSelect } from '@/lib/actions/finanzas'

export default async function NuevaSalidaPage() {
  const [pacientes, casos, enfermeros] = await Promise.all([
    getPacientesParaSelect(),
    getCasosParaSelect(),
    getEnfermerosParaSelect(),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/finanzas/salidas" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nueva salida</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra un pago, gasto o egreso de Abastemed</p>
        </div>
      </div>
      <SalidaForm pacientes={pacientes} casos={casos} enfermeros={enfermeros} />
    </div>
  )
}
