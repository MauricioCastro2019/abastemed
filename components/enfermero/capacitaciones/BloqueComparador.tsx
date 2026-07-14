import { CheckCircle2, AlertTriangle } from 'lucide-react'
import type { ComparadorBloque } from '@/types'

function Columna({ titulo, items, critico }: { titulo: string; items: string[]; critico?: boolean }) {
  return (
    <div
      className={`flex-1 rounded-xl p-4 border ${critico ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {critico
          ? <AlertTriangle size={15} className="text-red-500 flex-shrink-0" />
          : <CheckCircle2 size={15} className="text-gray-400 flex-shrink-0" />}
        <p className={`text-sm font-bold ${critico ? 'text-red-700' : 'text-gray-700'}`}>{titulo}</p>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className={`text-sm leading-snug ${critico ? 'text-red-700' : 'text-gray-600'}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BloqueComparador({ bloque }: { bloque: ComparadorBloque }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Columna {...bloque.izquierda} />
      <Columna {...bloque.derecha} />
    </div>
  )
}
