import type { EtapaProgresion } from '@/types'

export function LineaProgresion({ etapas }: { etapas: EtapaProgresion[] }) {
  return (
    <div className="space-y-0">
      {etapas.map((etapa, i) => {
        const esUltima = i === etapas.length - 1
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: '#2AABBF' }}
              >
                {i + 1}
              </div>
              {!esUltima && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>
            <div className={esUltima ? 'pb-0' : 'pb-4'}>
              <p className="text-sm font-bold mb-1.5" style={{ color: '#1B2B4B' }}>{etapa.titulo}</p>
              <ul className="space-y-1">
                {etapa.items.map((item, j) => (
                  <li key={j} className="text-sm text-gray-600 leading-snug">{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )
      })}
    </div>
  )
}
