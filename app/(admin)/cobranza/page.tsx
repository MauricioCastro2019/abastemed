import { getCobranza, marcarPagado } from '@/lib/actions/cobranza'
import { Badge } from '@/components/ui/badge'
import { Receipt, CheckCircle, Clock } from 'lucide-react'

function formatMonto(n: number) {
  return n.toLocaleString('es-VE', { minimumFractionDigits: 2 })
}

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CobranzaPage() {
  let items: Awaited<ReturnType<typeof getCobranza>> = []
  try { items = await getCobranza() } catch { /* sin datos */ }

  const pendientes = items.filter(i => i.status === 'pendiente')
  const pagados    = items.filter(i => i.status === 'pagado')
  const totalPendiente = pendientes.reduce((acc, i) => acc + (i.subtotal ?? 0), 0)
  const totalPagado    = pagados.reduce((acc, i) => acc + (i.subtotal ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Cobranza</h1>
        <p className="text-sm text-gray-500 mt-1">
          Facturación generada automáticamente al completar turnos
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFFBEB' }}>
              <Clock size={16} style={{ color: '#D97706' }} />
            </div>
            <p className="text-sm text-gray-500">Por cobrar</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>${formatMonto(totalPendiente)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pendientes.length} ítem{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ECFDF5' }}>
              <CheckCircle size={16} style={{ color: '#059669' }} />
            </div>
            <p className="text-sm text-gray-500">Cobrado</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>${formatMonto(totalPagado)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pagados.length} ítem{pagados.length !== 1 ? 's' : ''} pagado{pagados.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <Receipt size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400 font-medium">Sin cobros aún</p>
          <p className="text-xs text-gray-300 mt-1">
            Los cobros se generan automáticamente al completar un turno
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const caso = item.caso as { id: string; titulo: string } | null
            const turno = item.turno as { id: string; fecha_inicio: string; enfermero?: { nombre: string; apellido: string } } | null

            return (
              <div key={item.id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
                        {caso?.titulo ?? 'Caso'}
                      </p>
                      <Badge variant="outline" className="text-xs"
                        style={{
                          borderColor: item.status === 'pagado' ? '#059669' : '#D97706',
                          color:       item.status === 'pagado' ? '#059669' : '#D97706',
                          backgroundColor: item.status === 'pagado' ? '#ECFDF5' : '#FFFBEB',
                        }}>
                        {item.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{item.concepto}</p>
                    {turno?.enfermero && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Enfermero: {turno.enfermero.nombre} {turno.enfermero.apellido}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400">{item.horas}h × ${formatMonto(item.tarifa)}/h</span>
                      {turno?.fecha_inicio && (
                        <span className="text-xs text-gray-400">{formatFecha(turno.fecha_inicio)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>
                      ${formatMonto(item.subtotal)}
                    </p>
                    {item.status === 'pendiente' && (
                      <form action={async () => {
                        'use server'
                        await marcarPagado(item.id)
                      }}>
                        <button type="submit"
                          className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-all"
                          style={{ backgroundColor: '#059669' }}>
                          Marcar pagado
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
