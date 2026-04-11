import { CasoForm } from '@/components/admin/casos/CasoForm'
import { getPacientes } from '@/lib/actions/pacientes'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Paciente } from '@/types'

export default async function NuevoCasoPage() {
  let pacientes: Paciente[] = []
  try {
    pacientes = await getPacientes()
    pacientes = pacientes.filter(p => p.status === 'activo')
  } catch {
    pacientes = []
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/casos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Nuevo caso</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vincula un paciente y define los parámetros del caso</p>
        </div>
      </div>
      <CasoForm pacientes={pacientes} />
    </div>
  )
}
