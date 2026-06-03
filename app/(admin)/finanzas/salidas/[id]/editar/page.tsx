import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSalida, getPacientesParaSelect, getCasosParaSelect, getEnfermerosParaSelect } from '@/lib/actions/finanzas'
import { SalidaForm } from '@/components/admin/finanzas/SalidaForm'

export default async function EditarSalidaPage({ params }: { params: { id: string } }) {
  let salida: Awaited<ReturnType<typeof getSalida>> | null = null
  try { salida = await getSalida(params.id) } catch { notFound() }
  if (!salida || salida.estatus === 'cancelado') notFound()

  const [pacientes, casos, enfermeros] = await Promise.all([
    getPacientesParaSelect(),
    getCasosParaSelect(),
    getEnfermerosParaSelect(),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/finanzas/salidas/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Editar salida</h1>
          <p className="text-sm text-gray-500 mt-0.5">{salida.folio} · {salida.concepto}</p>
        </div>
      </div>
      <SalidaForm pacientes={pacientes} casos={casos} enfermeros={enfermeros} salida={salida} />
    </div>
  )
}
