'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, List } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'

interface LeccionMeta {
  numero: number
  titulo: string
}

interface Props {
  lecciones: LeccionMeta[]
  leccionIdx: number
  maxVisitado: number
  onSelect: (idx: number) => void
}

function ItemLeccion({
  leccion, idx, actual, visitada, onSelect,
}: {
  leccion: LeccionMeta
  idx: number
  actual: boolean
  visitada: boolean
  onSelect: (idx: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(idx)}
      disabled={!visitada && !actual}
      aria-current={actual ? 'step' : undefined}
      className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
        actual ? 'font-semibold' : visitada ? 'text-gray-600 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'
      }`}
      style={actual ? { backgroundColor: '#EBF8FB', color: '#0D6E80' } : undefined}
    >
      {visitada && !actual
        ? <CheckCircle2 size={15} className="flex-shrink-0 text-emerald-500" />
        : <span className={`w-[15px] h-[15px] rounded-full border flex-shrink-0 ${actual ? 'border-[#2AABBF]' : 'border-gray-300'}`} />}
      <span className="truncate">{leccion.numero}. {leccion.titulo}</span>
    </button>
  )
}

export function LeccionNavigator({ lecciones, leccionIdx, maxVisitado, onSelect }: Props) {
  const [abierto, setAbierto] = useState(false)
  const actual = lecciones[leccionIdx]

  return (
    <>
      {/* Escritorio: índice lateral fijo */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-6 bg-white rounded-2xl shadow-sm p-3 max-h-[70vh] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-2">
            Lecciones
          </p>
          <nav className="space-y-0.5">
            {lecciones.map((leccion, idx) => (
              <ItemLeccion
                key={leccion.numero}
                leccion={leccion}
                idx={idx}
                actual={idx === leccionIdx}
                visitada={idx <= maxVisitado}
                onSelect={onSelect}
              />
            ))}
          </nav>
        </div>
      </aside>

      {/* Móvil: botón que despliega el índice */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="w-full flex items-center justify-between gap-2 bg-white rounded-xl shadow-sm px-4 py-3"
        >
          <span className="flex items-center gap-2 min-w-0 text-sm font-medium" style={{ color: '#1B2B4B' }}>
            <List size={15} className="flex-shrink-0" style={{ color: '#2AABBF' }} />
            <span className="truncate">
              Lección {actual.numero} de {lecciones.length}: {actual.titulo}
            </span>
          </span>
          <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
        </button>

        <Sheet open={abierto} onClose={() => setAbierto(false)} title="Lecciones">
          <nav className="p-3 space-y-0.5">
            {lecciones.map((leccion, idx) => (
              <ItemLeccion
                key={leccion.numero}
                leccion={leccion}
                idx={idx}
                actual={idx === leccionIdx}
                visitada={idx <= maxVisitado}
                onSelect={i => { onSelect(i); setAbierto(false) }}
              />
            ))}
          </nav>
        </Sheet>
      </div>
    </>
  )
}
