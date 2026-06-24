'use client'

import { useState } from 'react'
import { Eye, Plus, X, EyeOff } from 'lucide-react'
import { crearVigilancia, desactivarVigilancia } from '@/lib/actions/vigilancias'
import type { VigilanciaEspecial, ParametroVigilancia, FrecuenciaVigilancia } from '@/types'

// ─── Helpers ────────────────────────────────────────────────
const PARAMETRO_LABEL: Record<ParametroVigilancia, string> = {
  saturacion:       'Saturación de oxígeno',
  integridad_piel:  'Integridad de piel',
  hidratacion:      'Hidratación',
  evacuaciones:     'Evacuaciones',
  presion_arterial: 'Presión arterial',
  glucosa:          'Glucosa',
  dolor:            'Control de dolor',
  frecuencia_cardiaca: 'Frecuencia cardíaca',
  temperatura:      'Temperatura',
  peso:             'Peso',
  otro:             'Otro',
}

const PARAMETRO_ICON: Record<ParametroVigilancia, string> = {
  saturacion:          '💨',
  integridad_piel:     '🩹',
  hidratacion:         '💧',
  evacuaciones:        '🚽',
  presion_arterial:    '❤️',
  glucosa:             '🩸',
  dolor:               '⚡',
  frecuencia_cardiaca: '💓',
  temperatura:         '🌡️',
  peso:                '⚖️',
  otro:                '👁️',
}

const FRECUENCIA_LABEL: Record<FrecuenciaVigilancia, string> = {
  continua:        'Continua',
  cada_hora:       'Cada hora',
  cada_2_horas:    'Cada 2 horas',
  cada_4_horas:    'Cada 4 horas',
  cada_turno:      'Por turno',
  cada_12_horas:   'Cada 12 horas',
  diario:          'Diario',
  segun_necesidad: 'Según necesidad',
}

// ─── Formulario nueva vigilancia ─────────────────────────────
function NuevaVigilanciaForm({ casoId, onClose }: {
  casoId: string
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('caso_id', casoId)
    const result = await crearVigilancia(fd)
    if (result.error) {
      setError(result.error)
      setPending(false)
    } else {
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 mt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Nueva vigilancia especial</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Parámetro a vigilar</label>
          <select
            name="parametro"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
            required
          >
            <option value="">Seleccionar...</option>
            {Object.entries(PARAMETRO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Frecuencia</label>
          <select
            name="frecuencia"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF]"
          >
            <option value="">Sin especificar</option>
            {Object.entries(FRECUENCIA_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Instrucciones específicas</label>
        <textarea
          name="instrucciones"
          rows={2}
          placeholder="Ej: Registrar cada 4 horas o ante cambios. Alertar si < 90%..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2AABBF] resize-none"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
          Cancelar
        </button>
        <button type="submit" disabled={pending}
          className="px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-all"
          style={{ backgroundColor: '#1B2B4B' }}>
          {pending ? 'Guardando...' : 'Agregar vigilancia'}
        </button>
      </div>
    </form>
  )
}

// ─── Ítem de vigilancia ──────────────────────────────────────
function VigilanciaItem({ v, onDesactivar }: { v: VigilanciaEspecial; onDesactivar: (id: string) => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [pending, setPending] = useState(false)

  async function desactivar() {
    setPending(true)
    await desactivarVigilancia(v.id)
    onDesactivar(v.id)
    setPending(false)
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-[#EBF8FB] rounded-xl border border-[#2AABBF]/20">
      <span className="text-base flex-shrink-0 mt-0.5">{PARAMETRO_ICON[v.parametro]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            {PARAMETRO_LABEL[v.parametro]}
          </span>
          {v.frecuencia && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white text-[#1A7A8C] font-medium border border-[#2AABBF]/20">
              {FRECUENCIA_LABEL[v.frecuencia]}
            </span>
          )}
        </div>
        {v.instrucciones && (
          <p className="text-xs text-gray-600 mt-1">{v.instrucciones}</p>
        )}
      </div>
      {!confirmando ? (
        <button onClick={() => setConfirmando(true)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
          <EyeOff size={14} />
        </button>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-1">
          <button onClick={desactivar} disabled={pending}
            className="text-xs px-2 py-1 text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#dc2626' }}>
            {pending ? '...' : 'Desactivar'}
          </button>
          <button onClick={() => setConfirmando(false)}
            className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Panel principal ─────────────────────────────────────────
interface VigilanciaPanelProps {
  vigilancias: VigilanciaEspecial[]
  casoId: string
  compact?: boolean
}

export function VigilanciaPanel({ vigilancias: initialVigilancias, casoId, compact = false }: VigilanciaPanelProps) {
  const [vigilancias, setVigilancias] = useState(initialVigilancias)
  const [mostrarForm, setMostrarForm] = useState(false)

  function handleDesactivar(id: string) {
    setVigilancias(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Eye size={15} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Vigilancias especiales
          </h2>
          {vigilancias.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#EBF8FB] text-[#1A7A8C] font-medium">
              {vigilancias.length} activas
            </span>
          )}
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2AABBF] text-[#2AABBF] hover:bg-[#EBF8FB] transition-colors"
        >
          <Plus size={13} /> Agregar vigilancia
        </button>
      </div>

      {mostrarForm && (
        <NuevaVigilanciaForm casoId={casoId} onClose={() => setMostrarForm(false)} />
      )}

      {vigilancias.length === 0 ? (
        <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl">
          <Eye size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin vigilancias especiales activas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(compact ? vigilancias.slice(0, 3) : vigilancias).map(v => (
            <VigilanciaItem key={v.id} v={v} onDesactivar={handleDesactivar} />
          ))}
          {compact && vigilancias.length > 3 && (
            <p className="text-xs text-center text-[#2AABBF]">+{vigilancias.length - 3} vigilancias más</p>
          )}
        </div>
      )}
    </div>
  )
}
