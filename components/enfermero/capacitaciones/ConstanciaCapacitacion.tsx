'use client'

import { Award, Printer } from 'lucide-react'

interface Props {
  nombreUsuario: string | null
  tituloCapacitacion: string
  fechaAprobacion: string | null
  calificacion: number | null
  folio: string
}

function formatearFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function ConstanciaCapacitacion({ nombreUsuario, tituloCapacitacion, fechaAprobacion, calificacion, folio }: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 p-5 print:shadow-none" id="constancia-capacitacion">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Award size={18} style={{ color: '#2AABBF' }} />
          <p className="text-sm font-bold" style={{ color: '#1B2B4B' }}>Constancia interna de capacitación</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="print:hidden flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 flex-shrink-0"
        >
          <Printer size={13} /> Imprimir / PDF
        </button>
      </div>

      <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <div>
          <dt className="text-xs text-gray-400">Nombre</dt>
          <dd className="font-medium" style={{ color: '#1B2B4B' }}>{nombreUsuario ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Capacitación</dt>
          <dd className="font-medium" style={{ color: '#1B2B4B' }}>{tituloCapacitacion}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Fecha de aprobación</dt>
          <dd className="font-medium" style={{ color: '#1B2B4B' }}>{formatearFecha(fechaAprobacion)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Calificación</dt>
          <dd className="font-medium" style={{ color: '#1B2B4B' }}>{calificacion != null ? `${calificacion}%` : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Folio interno</dt>
          <dd className="font-medium" style={{ color: '#1B2B4B' }}>{folio}</dd>
        </div>
      </dl>

      <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 leading-relaxed">
        Documento interno de Abastemed. No sustituye certificaciones profesionales ni acreditaciones oficiales.
      </p>
    </div>
  )
}
