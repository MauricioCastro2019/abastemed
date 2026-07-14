'use client'

import { useState } from 'react'
import { HelpCircle, ChevronDown, CheckCircle2 } from 'lucide-react'
import type { CasoInteractivoBloque } from '@/types'

export function CasoInteractivo({ caso }: { caso: CasoInteractivoBloque }) {
  const [abierta, setAbierta] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Caso clínico</p>
        <p className="text-sm text-gray-700 leading-relaxed">{caso.escenario}</p>
      </div>

      <div className="space-y-2">
        {caso.preguntas.map((p, i) => {
          const abiertaAqui = abierta === i
          return (
            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setAbierta(abiertaAqui ? null : i)}
                className="w-full flex items-center justify-between gap-3 text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                aria-expanded={abiertaAqui}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <HelpCircle size={15} className="flex-shrink-0" style={{ color: '#2AABBF' }} />
                  <span className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
                    {i + 1}. {p.pregunta}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={`flex-shrink-0 text-gray-400 transition-transform ${abiertaAqui ? 'rotate-180' : ''}`}
                />
              </button>

              {abiertaAqui && (
                <div className="px-4 pb-4 pt-1">
                  <div className="flex gap-2 mb-1.5">
                    <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5 text-emerald-500" />
                    <p className="text-sm font-semibold text-emerald-700">{p.respuesta}</p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed pl-[22px]">{p.explicacion}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
