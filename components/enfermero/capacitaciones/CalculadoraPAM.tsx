'use client'

import { useId, useState } from 'react'
import { Calculator, Info } from 'lucide-react'
import { calcularPAM } from '@/lib/pam'

export function CalculadoraPAM() {
  const sistolicaId = useId()
  const diastolicaId = useId()
  const errorId = useId()

  const [sistolica, setSistolica] = useState('')
  const [diastolica, setDiastolica] = useState('')
  const [resultado, setResultado] = useState<{ presionPulso: number; pam: number; interpretacion: string } | null>(null)
  const [error, setError] = useState('')

  function handleCalcular() {
    const s = Number(sistolica)
    const d = Number(diastolica)

    if (sistolica.trim() === '' || diastolica.trim() === '') {
      setError('Ingresa ambos valores para calcular.')
      setResultado(null)
      return
    }

    const salida = calcularPAM(s, d)
    if ('error' in salida) {
      setError(salida.error)
      setResultado(null)
      return
    }

    setError('')
    setResultado(salida)
  }

  return (
    <div className="rounded-xl border border-gray-100 p-4" style={{ backgroundColor: '#F8FBFB' }}>
      <div className="flex items-center gap-2 mb-3">
        <Calculator size={16} style={{ color: '#2AABBF' }} />
        <p className="text-sm font-bold" style={{ color: '#1B2B4B' }}>Calculadora de PAM</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor={sistolicaId} className="block text-xs font-medium text-gray-500 mb-1">
            Sistólica (mmHg)
          </label>
          <input
            id={sistolicaId}
            type="number"
            inputMode="numeric"
            value={sistolica}
            onChange={e => setSistolica(e.target.value)}
            placeholder="Ej. 50"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/30 focus:border-[#2AABBF]"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={!!error}
          />
        </div>
        <div>
          <label htmlFor={diastolicaId} className="block text-xs font-medium text-gray-500 mb-1">
            Diastólica (mmHg)
          </label>
          <input
            id={diastolicaId}
            type="number"
            inputMode="numeric"
            value={diastolica}
            onChange={e => setDiastolica(e.target.value)}
            placeholder="Ej. 20"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/30 focus:border-[#2AABBF]"
            aria-describedby={error ? errorId : undefined}
            aria-invalid={!!error}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleCalcular}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
        style={{ backgroundColor: '#2AABBF' }}
      >
        Calcular PAM
      </button>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 mt-2">{error}</p>
      )}

      {resultado && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg bg-white border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-400">Presión de pulso</p>
              <p className="text-lg font-black" style={{ color: '#1B2B4B' }}>{resultado.presionPulso} mmHg</p>
            </div>
            <div className="flex-1 rounded-lg bg-white border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-400">PAM estimada</p>
              <p className="text-lg font-black" style={{ color: '#1B2B4B' }}>{resultado.pam} mmHg</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{resultado.interpretacion}</p>
        </div>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <Info size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          Esta herramienta es educativa y no sustituye la valoración clínica. No registres aquí datos que identifiquen a un paciente.
        </p>
      </div>
    </div>
  )
}
