import { getLevantamiento } from '@/lib/actions/levantamientos'
import { LevantamientoDetalle } from '@/components/admin/levantamientos/LevantamientoDetalle'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'

export default async function LevantamientoDetailPage({ params }: { params: { id: string } }) {
  let lev
  try {
    lev = await getLevantamiento(params.id)
  } catch {
    notFound()
  }

  // Buscar el paciente creado a partir de este levantamiento para los "Próximos pasos"
  let pacienteId: string | null = null
  if (lev.prospect_id) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('pacientes')
      .select('id')
      .eq('source_prospect_id', lev.prospect_id)
      .maybeSingle()
    pacienteId = data?.id ?? null
  }

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      <div className="flex items-center gap-3">
        <Link href="/levantamientos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Levantamiento de Paciente</p>
          <p className="text-sm text-gray-500">
            Creado: {new Date(lev.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <LevantamientoDetalle lev={lev} pacienteId={pacienteId} />
    </div>
  )
}
