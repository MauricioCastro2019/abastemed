import type { TarjetaCausa } from '@/types'

export function TarjetasCausas({ tarjetas }: { tarjetas: TarjetaCausa[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {tarjetas.map((tarjeta, i) => (
        <div key={i} className="rounded-xl border border-gray-100 p-3.5" style={{ backgroundColor: '#EBF8FB' }}>
          <p className="text-sm font-bold mb-1" style={{ color: '#0D6E80' }}>{tarjeta.titulo}</p>
          {tarjeta.descripcion && (
            <p className="text-xs text-gray-500 mb-2">{tarjeta.descripcion}</p>
          )}
          <ul className="space-y-1">
            {tarjeta.items.map((item, j) => (
              <li key={j} className="text-sm text-gray-600 leading-snug flex gap-2">
                <span className="text-gray-300 flex-shrink-0">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
