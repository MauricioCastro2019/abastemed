import { getProspectosParaLevantamiento } from '@/lib/actions/levantamientos'
import { NuevoLevantamientoSelector } from '@/components/admin/levantamientos/NuevoLevantamientoSelector'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ProspectoElegible, ProspectoBloqueado } from '@/types'

export default async function NuevoLevantamientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfilData } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  const esAdmin = perfilData?.rol === 'admin'

  let elegibles: ProspectoElegible[] = []
  let bloqueados: ProspectoBloqueado[] = []
  let fetchError: string | null = null

  try {
    const data = await getProspectosParaLevantamiento()
    elegibles = data.elegibles
    bloqueados = data.bloqueados
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Error al cargar prospectos'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/levantamientos"
          className="text-gray-400 hover:text-[#1B2B4B] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
            Nuevo Levantamiento
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Selecciona un prospecto con cotización aceptada para iniciar el levantamiento presencial
          </p>
        </div>
      </div>

      {fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm text-red-700">{fetchError}</p>
          <Link
            href="/levantamientos"
            className="mt-3 inline-block text-sm text-red-600 underline"
          >
            Volver a levantamientos
          </Link>
        </div>
      ) : (
        <NuevoLevantamientoSelector elegibles={elegibles} bloqueados={bloqueados} esAdmin={esAdmin} />
      )}
    </div>
  )
}
