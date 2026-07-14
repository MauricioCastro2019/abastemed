import type { FilaRango } from '@/types'

const NIVEL_CONFIG: Record<FilaRango['nivel'], { label: string; color: string; bg: string }> = {
  normal:   { label: 'Frecuente',            color: '#059669', bg: '#ECFDF5' },
  atencion: { label: 'Vigilar',              color: '#B45309', bg: '#FFFBEB' },
  alerta:   { label: 'Hipotensión',          color: '#C2410C', bg: '#FFF7ED' },
  critico:  { label: 'Emergencia médica',    color: '#B91C1C', bg: '#FEF2F2' },
}

export function TablaRangos({ filas }: { filas: FilaRango[] }) {
  return (
    <div className="space-y-2" aria-label="Escala orientativa de tensión arterial">
      {filas.map((fila, i) => {
        const cfg = NIVEL_CONFIG[fila.nivel]
        return (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3"
            style={{ backgroundColor: cfg.bg }}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: '#1B2B4B' }}>{fila.valor}</p>
              <p className="text-xs text-gray-500 mt-0.5">{fila.etiqueta}</p>
            </div>
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap"
              style={{ color: cfg.color, backgroundColor: 'white' }}
            >
              {cfg.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
