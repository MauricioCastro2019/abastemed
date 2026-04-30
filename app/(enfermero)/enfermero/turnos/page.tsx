import { getMisTurnos } from '@/lib/actions/enfermero-portal'
import { TurnoStatusBtn } from '@/components/admin/turnos/TurnoStatusBtn'
import { Calendar, Clock, MapPin, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import Link from 'next/link'
import type { Turno } from '@/types'

const STATUS_TURNO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  programado: { label: 'Programado', color: '#2AABBF', bg: '#EBF8FB', border: '#2AABBF' },
  activo:     { label: 'En curso',   color: '#059669', bg: '#ECFDF5', border: '#059669' },
  completado: { label: 'Completado', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

function duracion(inicio: string, fin: string) {
  const horas = (new Date(fin).getTime() - new Date(inicio).getTime()) / 3600000
  return `${horas.toFixed(1)}h`
}

export default async function MisTurnosPage() {
  let turnos: Turno[] = []
  try { turnos = await getMisTurnos() } catch { turnos = [] }

  const proximos  = turnos.filter(t => t.status !== 'completado')
  const historial = turnos.filter(t => t.status === 'completado')

  return (
    <div className="space-y-8">
      <Suspense><ToastSuccess /></Suspense>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Mis turnos</h1>
        <p className="text-sm text-gray-500 mt-1">
          {proximos.length} próximo{proximos.length !== 1 ? 's' : ''} · {historial.length} completado{historial.length !== 1 ? 's' : ''}
        </p>
      </div>

      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Próximos y en curso</h2>
        {proximos.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <Calendar size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">Sin turnos próximos asignados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proximos.map((t: Turno) => <TurnoCard key={t.id} turno={t} />)}
          </div>
        )}
      </section>

      {historial.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Historial</h2>
          <div className="space-y-3">
            {historial.map((t: Turno) => <TurnoCard key={t.id} turno={t} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function TurnoCard({ turno }: { turno: Turno }) {
  const st = STATUS_TURNO[turno.status] ?? STATUS_TURNO.programado
  const caso = turno.caso

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4" style={{ borderColor: st.color }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
            {caso?.titulo ?? 'Turno asignado'}
          </p>
          {caso?.paciente && (
            <p className="text-xs text-gray-400 mt-0.5">
              Paciente: {caso.paciente.nombre} {caso.paciente.apellido}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs flex-shrink-0"
          style={{ borderColor: st.border, color: st.color, backgroundColor: st.bg }}>
          {st.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock size={12} />
          <span>{formatFecha(turno.fecha_inicio)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar size={12} />
          <span>Duración: {duracion(turno.fecha_inicio, turno.fecha_fin)}</span>
        </div>
        {caso?.direccion && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin size={12} />
            <span className="truncate">{caso.direccion}</span>
          </div>
        )}
      </div>

      {turno.notas_entrega && (
        <div className="mb-3 pt-3 border-t border-gray-50">
          <p className="text-xs text-gray-500 italic">{turno.notas_entrega}</p>
        </div>
      )}

      {turno.status !== 'completado' && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
          {turno.status === 'programado' && (
            <TurnoStatusBtn
              turnoId={turno.id}
              nuevoStatus="activo"
              label="Iniciar turno"
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#059669] text-[#059669] hover:bg-[#ECFDF5] transition-all disabled:opacity-50"
            />
          )}
          {turno.status === 'activo' && (
            <Link href={`/enfermero/turnos/entrega/${turno.id}`}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all"
              style={{ backgroundColor: '#1B2B4B' }}>
              <ClipboardList size={13} />
              Registrar entrega
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
