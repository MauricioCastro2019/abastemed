import { getRecibos } from '@/lib/actions/recibos'
import { crearReciboDemo } from '@/lib/actions/recibos'
import { getTituloDocumento, ESTADO_RECIBO_LABELS } from '@/lib/config/pagos'
import { FileText, Plus, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import type { EstadoRecibo, Recibo } from '@/types'

function formatearFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const ESTADO_BADGE_STYLE: Record<EstadoRecibo, { bg: string; color: string }> = {
  pendiente: { bg: '#FEF6E7', color: '#A66A00' },
  pagado:    { bg: '#EAFAF5', color: '#178C93' },
  cancelado: { bg: '#FDF1F1', color: '#B91C1C' },
}

export default async function RecibosPage() {
  let recibos: Recibo[] = []
  try {
    recibos = await getRecibos()
  } catch {
    recibos = []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Recibos de pago</h1>
          <p className="text-sm text-gray-500 mt-1">
            {recibos.length} recibo{recibos.length !== 1 ? 's' : ''} registrado{recibos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/recibos/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
          style={{ backgroundColor: '#2AABBF' }}
        >
          <Plus size={16} />
          Nuevo recibo
        </Link>
      </div>

      {/* Lista vacía */}
      {recibos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#EBF8FB' }}
          >
            <FileText size={24} style={{ color: '#2AABBF' }} />
          </div>
          <p className="font-medium text-gray-700 mb-1">No hay recibos registrados</p>
          <p className="text-sm text-gray-400 mb-6">Crea tu primer recibo o carga los datos de prueba</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/recibos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: '#2AABBF' }}
            >
              <Plus size={14} />
              Nuevo recibo
            </Link>
            <form action={crearReciboDemo}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                <Sparkles size={14} />
                Cargar recibo demo (Sra. Margarita)
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Folio</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Paciente</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recibos.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span
                      className="text-xs font-mono font-semibold px-2 py-1 rounded-md"
                      style={{ backgroundColor: '#EBF8FB', color: '#0B2A44' }}
                    >
                      {r.folio}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: '#1B2B4B' }}
                      >
                        {r.paciente_nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
                        {r.paciente_nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="text-sm text-gray-500">{formatearFecha(r.fecha_emision)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-md"
                      style={{ backgroundColor: ESTADO_BADGE_STYLE[r.estado].bg, color: ESTADO_BADGE_STYLE[r.estado].color }}
                      title={getTituloDocumento(r.estado)}
                    >
                      {ESTADO_RECIBO_LABELS[r.estado]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-bold" style={{ color: '#178C93' }}>
                      ${r.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/recibos/${r.id}`}
                      className="flex items-center justify-end text-gray-400 hover:text-[#2AABBF] transition-colors"
                    >
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
