'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardCopy, FileText } from 'lucide-react'

interface CampoReporte {
  key: string
  label: string
  area?: boolean
}

const SECCIONES: { titulo: string; campos: CampoReporte[] }[] = [
  {
    titulo: 'Identificación',
    campos: [
      { key: 'paciente', label: 'Paciente' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'hora', label: 'Hora' },
      { key: 'posicion', label: 'Posición' },
      { key: 'brazo', label: 'Brazo' },
    ],
  },
  {
    titulo: 'Signos vitales',
    campos: [
      { key: 'taInicial', label: 'TA inicial' },
      { key: 'taConfirmacion', label: 'TA de confirmación' },
      { key: 'fc', label: 'FC' },
      { key: 'fr', label: 'FR' },
      { key: 'spo2', label: 'SpO₂' },
      { key: 'temperatura', label: 'Temperatura' },
      { key: 'glucosa', label: 'Glucosa' },
    ],
  },
  {
    titulo: 'Valoración clínica',
    campos: [
      { key: 'conciencia', label: 'Estado de conciencia' },
      { key: 'sintomas', label: 'Síntomas referidos', area: true },
      { key: 'piel', label: 'Piel y perfusión' },
      { key: 'miccion', label: 'Última micción' },
      { key: 'ingesta', label: 'Ingesta reciente' },
      { key: 'vomitoDiarreaSangrado', label: 'Vómito, diarrea o sangrado' },
      { key: 'medicamentos', label: 'Últimos medicamentos' },
      { key: 'hemodialisis', label: 'Última hemodiálisis' },
    ],
  },
  {
    titulo: 'Actuación y seguimiento',
    campos: [
      { key: 'medidas', label: 'Medidas realizadas', area: true },
      { key: 'medicoNotificado', label: 'Personal médico notificado' },
      { key: 'familiaresNotificados', label: 'Familiares notificados' },
      { key: 'indicaciones', label: 'Indicaciones recibidas', area: true },
      { key: 'evolucion', label: 'Evolución', area: true },
      { key: 'traslado', label: 'Traslado' },
      { key: 'firma', label: 'Nombre y firma del personal' },
    ],
  },
]

const ETIQUETAS_REPORTE: Record<string, string> = {
  paciente: 'Paciente', fecha: 'Fecha', hora: 'Hora', posicion: 'Posición', brazo: 'Brazo',
  taInicial: 'TA inicial', taConfirmacion: 'TA de confirmación', fc: 'FC', fr: 'FR',
  spo2: 'SpO₂', temperatura: 'Temperatura', glucosa: 'Glucosa',
  conciencia: 'Estado de conciencia', sintomas: 'Síntomas referidos', piel: 'Piel y perfusión',
  miccion: 'Última micción', ingesta: 'Ingesta reciente', vomitoDiarreaSangrado: 'Vómito, diarrea o sangrado',
  medicamentos: 'Últimos medicamentos', hemodialisis: 'Última hemodiálisis',
  medidas: 'Medidas realizadas', medicoNotificado: 'Personal médico notificado',
  familiaresNotificados: 'Familiares notificados', indicaciones: 'Indicaciones recibidas',
  evolucion: 'Evolución', traslado: 'Traslado', firma: 'Nombre y firma del personal',
}

function construirTexto(valores: Record<string, string>): string {
  const linea = (key: string) => `${ETIQUETAS_REPORTE[key]}: ${valores[key] ?? ''}`

  return [
    'REPORTE DE HIPOTENSIÓN', '',
    linea('paciente'), linea('fecha'), linea('hora'), linea('posicion'), linea('brazo'),
    linea('taInicial'), linea('taConfirmacion'), linea('fc'), linea('fr'), linea('spo2'),
    linea('temperatura'), linea('glucosa'), '',
    linea('conciencia'), linea('sintomas'), linea('piel'), linea('miccion'), linea('ingesta'),
    linea('vomitoDiarreaSangrado'), linea('medicamentos'), linea('hemodialisis'), '',
    linea('medidas'), linea('medicoNotificado'), linea('familiaresNotificados'),
    linea('indicaciones'), linea('evolucion'), linea('traslado'), '',
    linea('firma'),
  ].join('\n')
}

export function ChecklistReporte() {
  const [valores, setValores] = useState<Record<string, string>>({})

  function setCampo(key: string, value: string) {
    setValores(prev => ({ ...prev, [key]: value }))
  }

  async function handleCopiar() {
    const texto = construirTexto(valores)
    try {
      await navigator.clipboard.writeText(texto)
      toast.success('Formato de reporte copiado. Puedes pegarlo en WhatsApp o en el registro de la plataforma.')
    } catch {
      toast.error('No se pudo copiar automáticamente. Selecciona y copia el texto manualmente.')
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} style={{ color: '#2AABBF' }} />
        <p className="text-sm font-bold" style={{ color: '#1B2B4B' }}>Reporte de hipotensión</p>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Completa lo que corresponda y copia el formato para tu reporte de turno. No se guarda en la plataforma.
      </p>

      <div className="space-y-4">
        {SECCIONES.map(seccion => (
          <div key={seccion.titulo}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{seccion.titulo}</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {seccion.campos.map(campo => (
                <div key={campo.key} className={campo.area ? 'sm:col-span-2' : ''}>
                  <label htmlFor={`reporte-${campo.key}`} className="block text-xs text-gray-500 mb-1">
                    {campo.label}
                  </label>
                  {campo.area ? (
                    <textarea
                      id={`reporte-${campo.key}`}
                      value={valores[campo.key] ?? ''}
                      onChange={e => setCampo(campo.key, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/30 focus:border-[#2AABBF] resize-none"
                    />
                  ) : (
                    <input
                      id={`reporte-${campo.key}`}
                      type="text"
                      value={valores[campo.key] ?? ''}
                      onChange={e => setCampo(campo.key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/30 focus:border-[#2AABBF]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleCopiar}
        className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
        style={{ backgroundColor: '#2AABBF' }}
      >
        <ClipboardCopy size={15} /> Copiar formato de reporte
      </button>
    </div>
  )
}
