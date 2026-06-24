import { getPaciente } from '@/lib/actions/pacientes'
import { getCasosByPaciente } from '@/lib/actions/casos'
import { getHallazgosByCaso } from '@/lib/actions/hallazgos'
import { getPendientesByCaso } from '@/lib/actions/pendientes-caso'
import { getAlertasActivasByCaso } from '@/lib/actions/alertas-activas'
import { getVigilanciasByCaso } from '@/lib/actions/vigilancias'
import { ArrowLeft, Brain } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MemoriaClient } from './MemoriaClient'
import { RealtimeRefresh } from '@/components/RealtimeRefresh'
import type { EventoTimeline } from '@/types'

export default async function MemoriaOperativaPage({ params }: { params: { id: string } }) {
  let paciente
  try {
    paciente = await getPaciente(params.id)
  } catch {
    notFound()
  }

  const casos     = await getCasosByPaciente(params.id)
  const casoActivo = casos.find(c => c.status === 'activo') ?? casos[0] ?? null

  if (!casoActivo) {
    return (
      <div className="max-w-4xl space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/pacientes/${params.id}`} className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Memoria Operativa</h1>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400">
          <Brain size={36} className="mx-auto mb-2 opacity-30" />
          <p>Sin caso activo para mostrar la memoria operativa.</p>
          <Link href="/casos/nuevo" className="mt-3 inline-block text-sm text-[#2AABBF] hover:underline">
            Crear caso →
          </Link>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  const [hallazgos, pendientes, alertas, vigilancias] = await Promise.all([
    getHallazgosByCaso(casoActivo.id),
    getPendientesByCaso(casoActivo.id),
    getAlertasActivasByCaso(casoActivo.id),
    getVigilanciasByCaso(casoActivo.id),
  ])

  // Línea de tiempo desde la vista unificada
  const { data: timelineData } = await supabase
    .from('v_timeline_caso')
    .select('*')
    .eq('caso_id', casoActivo.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const timeline = (timelineData ?? []) as EventoTimeline[]

  const hallazgosAbiertos = hallazgos.filter(h => h.estado !== 'resuelto').length
  const pendientesUrgentes = pendientes.filter(p =>
    (p.estado === 'pendiente' || p.estado === 'en_proceso') && p.prioridad === 'urgente'
  ).length

  return (
    <div className="max-w-4xl space-y-5">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/pacientes/${params.id}`}
            className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#1B2B4B' }}>
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>
                Memoria Operativa
              </h1>
              <p className="text-sm text-gray-500">
                {paciente.nombre} {paciente.apellido}
              </p>
            </div>
          </div>
        </div>

        {/* Indicadores rápidos */}
        <div className="flex items-center gap-2">
          {alertas.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium text-white animate-pulse"
              style={{ backgroundColor: '#dc2626' }}>
              ● {alertas.length} alerta{alertas.length > 1 ? 's' : ''}
            </span>
          )}
          {hallazgosAbiertos > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: '#FEF2F2', color: '#dc2626' }}>
              {hallazgosAbiertos} hallazgo{hallazgosAbiertos > 1 ? 's' : ''}
            </span>
          )}
          {pendientesUrgentes > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: '#FEF3C7', color: '#d97706' }}>
              {pendientesUrgentes} urgente{pendientesUrgentes > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <RealtimeRefresh tables={['hallazgos_clinicos', 'pendientes_caso', 'alertas_activas', 'vigilancias_especiales', 'entregas_turno_guiadas']} />

      {/* ── CONTENT ────────────────────────────────────────── */}
      <MemoriaClient
        casoId={casoActivo.id}
        hallazgos={hallazgos}
        pendientes={pendientes}
        alertas={alertas}
        vigilancias={vigilancias}
        timeline={timeline}
      />
    </div>
  )
}
