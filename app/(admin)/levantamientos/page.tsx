import { getLevantamientos } from '@/lib/actions/levantamientos'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, ChevronRight, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import type { LevantamientoPaciente } from '@/types'

const ESTADO_LABEL: Record<string, string> = {
  borrador:           'Borrador',
  pendiente_revision: 'Pendiente revisión',
  revisado:           'Revisado',
  aprobado:           'Aprobado',
  convertido:         'Convertido',
  cancelado:          'Cancelado',
}

const ESTADO_COLOR: Record<string, { bg: string; text: string }> = {
  borrador:           { bg: '#F3F4F6', text: '#6B7280' },
  pendiente_revision: { bg: '#FEF9C3', text: '#854D0E' },
  revisado:           { bg: '#DBEAFE', text: '#1D4ED8' },
  aprobado:           { bg: '#DCFCE7', text: '#166534' },
  convertido:         { bg: '#EBF8FB', text: '#1B2B4B' },
  cancelado:          { bg: '#FEE2E2', text: '#991B1B' },
}

const RIESGO_COLOR: Record<string, { bg: string; text: string }> = {
  bajo:  { bg: '#DCFCE7', text: '#166534' },
  medio: { bg: '#FEF9C3', text: '#854D0E' },
  alto:  { bg: '#FEE2E2', text: '#991B1B' },
}

const PRIORIDAD_COLOR: Record<string, { bg: string; text: string }> = {
  baja:    { bg: '#F3F4F6', text: '#6B7280' },
  media:   { bg: '#EFF6FF', text: '#1D4ED8' },
  alta:    { bg: '#FFF7ED', text: '#C2410C' },
  urgente: { bg: '#FEE2E2', text: '#991B1B' },
}

function ColorBadge({ cfg, label }: { cfg: { bg: string; text: string }; label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}>
      {label}
    </span>
  )
}

function calcEdad(fechaNac?: string | null): string {
  if (!fechaNac) return '—'
  const edad = Math.floor((Date.now() - new Date(fechaNac).getTime()) / (365.25 * 24 * 3600 * 1000))
  return `${edad} años`
}

export default async function LevantamientosPage({
  searchParams,
}: {
  searchParams: { q?: string; estado?: string; riesgo?: string; prioridad?: string }
}) {
  const { q, estado, riesgo, prioridad } = searchParams

  let levantamientos: LevantamientoPaciente[] = []
  try {
    levantamientos = await getLevantamientos({ q, estado, riesgo, prioridad })
  } catch {
    levantamientos = []
  }

  const totalPorEstado = {
    borradores: levantamientos.filter(l => l.estado === 'borrador').length,
    pendientes: levantamientos.filter(l => l.estado === 'pendiente_revision').length,
    aprobados:  levantamientos.filter(l => l.estado === 'aprobado').length,
  }

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Levantamientos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {levantamientos.length} registro{levantamientos.length !== 1 ? 's' : ''} ·{' '}
            {totalPorEstado.pendientes} pendiente{totalPorEstado.pendientes !== 1 ? 's' : ''} de revisión ·{' '}
            {totalPorEstado.aprobados} aprobado{totalPorEstado.aprobados !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/levantamientos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: '#2AABBF' }}>
          <Plus size={16} /> Nuevo levantamiento
        </Link>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar paciente, responsable, teléfono..."
            className="pl-8 pr-4 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white w-64 transition-all"
          />
        </div>
        <select name="estado" defaultValue={estado ?? ''}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="riesgo" defaultValue={riesgo ?? ''}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all">
          <option value="">Todo riesgo</option>
          <option value="bajo">Bajo</option>
          <option value="medio">Medio</option>
          <option value="alto">Alto</option>
        </select>
        <select name="prioridad" defaultValue={prioridad ?? ''}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#2AABBF] bg-white transition-all">
          <option value="">Toda prioridad</option>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#1B2B4B' }}>
          Filtrar
        </button>
        {(q || estado || riesgo || prioridad) && (
          <a href="/levantamientos" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-all">
            Limpiar
          </a>
        )}
      </form>

      {/* Lista */}
      {levantamientos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#EBF8FB' }}>
            <ClipboardCheck size={24} style={{ color: '#2AABBF' }} />
          </div>
          <p className="font-medium text-gray-700 mb-1">
            {q || estado || riesgo || prioridad ? 'Sin resultados' : 'No hay levantamientos registrados'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {q || estado || riesgo || prioridad
              ? 'Ajusta los filtros de búsqueda'
              : 'Registra el primer levantamiento de paciente'}
          </p>
          {!(q || estado || riesgo || prioridad) && (
            <Link href="/levantamientos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: '#2AABBF' }}>
              <Plus size={14} /> Nuevo levantamiento
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Paciente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Servicio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Riesgo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Prioridad</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {levantamientos.map(lev => (
                <tr key={lev.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: '#1B2B4B' }}>
                        {lev.paciente_nombre[0]}{lev.paciente_apellido[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: '#1B2B4B' }}>
                          {lev.paciente_nombre} {lev.paciente_apellido}
                        </p>
                        <p className="text-xs text-gray-400">
                          {calcEdad(lev.paciente_fecha_nacimiento)}
                          {lev.responsable_nombre && ` · ${lev.responsable_nombre}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-600 max-w-xs truncate">
                      {lev.tipos_servicio?.slice(0, 2).join(', ') || '—'}
                      {(lev.tipos_servicio?.length ?? 0) > 2 && ` +${lev.tipos_servicio!.length - 2}`}
                    </p>
                    {lev.fecha_inicio_estimada && (
                      <p className="text-xs text-gray-400 mt-0.5">Inicio: {lev.fecha_inicio_estimada}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <ColorBadge cfg={RIESGO_COLOR[lev.riesgo_final] ?? RIESGO_COLOR.bajo}
                      label={lev.riesgo_final?.charAt(0).toUpperCase() + lev.riesgo_final?.slice(1)} />
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <ColorBadge cfg={PRIORIDAD_COLOR[lev.prioridad] ?? PRIORIDAD_COLOR.media}
                      label={lev.prioridad?.charAt(0).toUpperCase() + lev.prioridad?.slice(1)} />
                  </td>
                  <td className="px-4 py-4">
                    <ColorBadge cfg={ESTADO_COLOR[lev.estado] ?? ESTADO_COLOR.borrador}
                      label={ESTADO_LABEL[lev.estado] ?? lev.estado} />
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/levantamientos/${lev.id}`}
                      className="flex items-center justify-end text-gray-400 hover:text-[#2AABBF] transition-colors">
                      <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
