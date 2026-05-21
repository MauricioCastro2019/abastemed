import { getBitacoraGlobal } from '@/lib/actions/bitacora'
import { BitacoraTimeline } from '@/components/admin/bitacora/BitacoraTimeline'
import { ScrollText } from 'lucide-react'

export default async function BitacoraPage() {
  let movimientos: Awaited<ReturnType<typeof getBitacoraGlobal>> = []
  try {
    movimientos = await getBitacoraGlobal(300)
  } catch { /* sin datos */ }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#EBF8FB' }}>
          <ScrollText size={18} style={{ color: '#2AABBF' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Bitácora</h1>
          <p className="text-sm text-gray-400">
            {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''} registrado{movimientos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <BitacoraTimeline movimientos={movimientos} showCaso />
    </div>
  )
}
