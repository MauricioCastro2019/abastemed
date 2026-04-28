import { getTurnos } from '@/lib/actions/turnos'
import { TurnoStatusBtn } from '@/components/admin/turnos/TurnoStatusBtn'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Plus, Search, User } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  programado: { label: 'Programado', color: '#2AABBF', bg: '#EBF8FB', border: '#2AABBF' },
  activo:     { label: 'En curso',   color: '#059669', bg: '#ECFDF5', border: '#059669' },
  completado: { label: 'Completado', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleString('es-VE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function duracion(inicio: string, fin: string) {
  const h = (new Date(fin).getTime() - new Date(inicio).getTime()) / 3600000
  return `${h.toFixed(1)}h`
}

function getStatusStyle(status: string) {
  return STATUS_STYLE[status] ?? STATUS_STYLE.programado
}

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams.q?.trim()
  let allTurnos: Awaited<ReturnType<typeof getTurnos>> = []
  try { allTurnos = await getTurnos() } catch { /* sin datos */ }

  // Filtrado client-side (Supabase no soporta ilike en joins directamente)
  const turnos = q
    ? allTurnos.filter(t => {
        const caso = t.caso as { titulo?: string } | null
        const enf = t.enfermero as { nombre?: string; apellido?: string } | null
        const haystack = [caso?.titulo, enf?.nombre, enf?.apellido].join(' ').toLowerCase()
        return haystack.includes(q.toLowerCase())
      })
    : allTurnos

  const activos   = turnos.filter(t => t.status !== 'completado')
  const historial = turnos.filter(t => t.status === 'completado')

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Turnos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activos.length} activo{activos.length !== 1 ? 's' : ''} · {historial.length} completado{historial.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/turnos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={16} />
          Asignar turno
        </Link>
      </div>

      {/* Búsqueda */}
      <form method="GET" className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por caso o enfermero..."
          className="w-full sm:max-w-xs pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all"
        />
      </form>

      {/* Activos */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Próximos y en curso</h2>
        {activos.length === 0 ? (
          <div className="bg-white rounded-xl p-10 shadow-sm text-center">
            <Calendar size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">
              {q ? 'Sin resultados para esa búsqueda' : 'Sin turnos programados'}
            </p>
            {!q && (
              <Link href="/turnos/nuevo"
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-[#2AABBF] hover:underline">
                <Plus size={14} />
                Asignar primer turno
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activos.map(t => <TurnoCard key={t.id} turno={t} />)}
          </div>
        )}
      </section>

      {/* Historial */}
      {historial.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Historial</h2>
          <div className="space-y-3">
            {historial.map(t => <TurnoCard key={t.id} turno={t} />)}
          </div>
        </section>
      )}
    </div>
  )
}

type TurnoRow = Awaited<ReturnType<typeof getTurnos>>[number]

function TurnoCard({ turno }: { turno: TurnoRow }) {
  const st = getStatusStyle(turno.status)
  const caso      = turno.caso as { id: string; titulo: string; direccion: string } | null
  const enfermero = turno.enfermero as { id: string; nombre: string; apellido: string } | null

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ borderColor: st.color }}>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
            {caso?.titulo ?? 'Turno'}
          </p>
          <Badge variant="outline" className="text-xs flex-shrink-0"
            style={{ borderColor: st.border, color: st.color, backgroundColor: st.bg }}>
            {st.label}
          </Badge>
        </div>

        {enfermero && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={11} />
            <span>{enfermero.nombre} {enfermero.apellido}</span>
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={11} />
            {formatFecha(turno.fecha_inicio)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar size={11} />
            {duracion(turno.fecha_inicio, turno.fecha_fin)}
          </span>
          {caso?.direccion && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={11} />
              <span className="truncate max-w-48">{caso.direccion}</span>
            </span>
          )}
        </div>
      </div>

      {turno.status !== 'completado' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {turno.status === 'programado' && (
            <TurnoStatusBtn
              turnoId={turno.id}
              nuevoStatus="activo"
              label="Iniciar"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#059669] text-[#059669] hover:bg-[#ECFDF5] transition-all disabled:opacity-50"
            />
          )}
          <TurnoStatusBtn
            turnoId={turno.id}
            nuevoStatus="completado"
            label="Completar"
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: '#1B2B4B' } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  )
}
