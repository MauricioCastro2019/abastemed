import { X } from 'lucide-react'
import type { CategoriaLista } from '@/types'

export function ListaCategorias({ categorias }: { categorias: CategoriaLista[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {categorias.map((cat, i) => (
        <div
          key={i}
          className={`rounded-xl border p-3.5 ${cat.advertencia ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}
        >
          <p className={`text-sm font-bold mb-2 ${cat.advertencia ? 'text-red-700' : ''}`} style={!cat.advertencia ? { color: '#1B2B4B' } : undefined}>
            {cat.titulo}
          </p>
          <ul className="space-y-1">
            {cat.items.map((item, j) => (
              <li key={j} className={`text-sm leading-snug flex gap-2 ${cat.advertencia ? 'text-red-700' : 'text-gray-600'}`}>
                {cat.advertencia
                  ? <X size={14} className="flex-shrink-0 mt-0.5 text-red-400" />
                  : <span className="text-gray-300 flex-shrink-0">&bull;</span>}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
