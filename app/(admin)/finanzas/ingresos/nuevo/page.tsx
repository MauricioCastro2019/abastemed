import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { IngresoForm } from '@/components/admin/finanzas/IngresoForm'
import { getPacientesParaSelect, getCasosParaSelect } from '@/lib/actions/finanzas'

export default async function NuevoIngresoPage() {
  const [pacientes, casos] = await Promise.all([
    getPacientesParaSelect(),
    getCasosParaSelect(),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/finanzas/ingresos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nuevo ingreso</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registra un pago recibido de familia o cliente</p>
        </div>
      </div>
      <IngresoForm pacientes={pacientes} casos={casos} />
    </div>
  )
}
