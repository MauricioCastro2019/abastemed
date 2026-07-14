import { CheckCircle2 } from 'lucide-react'

export function ResumenFinalCapacitacion({ puntos, frase }: { puntos: string[]; frase: string }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {puntos.map((punto, i) => (
          <div key={i} className="flex gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
            <p className="text-sm text-gray-700 leading-snug">{punto}</p>
          </div>
        ))}
      </div>
      <div className="border-l-4 pl-4 py-1" style={{ borderColor: '#2AABBF' }}>
        <p className="text-sm italic text-gray-500 leading-relaxed">&ldquo;{frase}&rdquo;</p>
      </div>
    </div>
  )
}
