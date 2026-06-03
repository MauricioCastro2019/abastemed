import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getIngreso, getPacientesParaSelect, getCasosParaSelect } from '@/lib/actions/finanzas'
import { IngresoForm } from '@/components/admin/finanzas/IngresoForm'

export default async function EditarIngresoPage({ params }: { params: { id: string } }) {
  let ingreso: Awaited<ReturnType<typeof getIngreso>> | null = null
  try { ingreso = await getIngreso(params.id) } catch { notFound() }
  if (!ingreso || ingreso.estatus === 'cancelado') notFound()

  const [pacientes, casos] = await Promise.all([
    getPacientesParaSelect(),
    getCasosParaSelect(),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/finanzas/ingresos/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Editar ingreso</h1>
          <p className="text-sm text-gray-500 mt-0.5">{ingreso.folio} · {ingreso.concepto}</p>
        </div>
      </div>
      <IngresoForm pacientes={pacientes} casos={casos} ingreso={ingreso} />
    </div>
  )
}
