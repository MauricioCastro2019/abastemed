'use client'

import { useState, useTransition } from 'react'
import { registrarAccion, omitirAccion, crearAccionManual } from '@/lib/actions/acciones-nai'
import {
  CheckCircle2, XCircle, Clock, Activity, Pill, Heart,
  Stethoscope, Utensils, Droplets, MoveHorizontal,
  MessageSquare, Plus, ChevronDown, ChevronUp, AlertTriangle,
  Zap
} from 'lucide-react'
import type { Accion, TipoPlanItem, EstadoAccion } from '@/types'
import { TIPO_PLAN_ITEM_CONFIG, ESTADO_ACCION_CONFIG } from '@/types'

// ─── Ícono de tipo ────────────────────────────────────────────

function TipoIcon({ tipo, size = 14 }: { tipo: TipoPlanItem; size?: number }) {
  const p = { size, strokeWidth: 2 }
  const map: Record<TipoPlanItem, React.ReactNode> = {
    medicamento:  <Pill {...p} />,
    rutina:       <Heart {...p} />,
    monitoreo:    <Activity {...p} />,
    procedimiento:<Stethoscope {...p} />,
    nutricion:    <Utensils {...p} />,
    eliminacion:  <Droplets {...p} />,
    movilidad:    <MoveHorizontal {...p} />,
    comunicacion: <MessageSquare {...p} />,
  }
  return <>{map[tipo]}</>
}

// ─── Modal de registro rápido ─────────────────────────────────

interface RegistrarModalProps {
  accion: Accion
  pacienteId: string
  onClose: () => void
  onRegistrado: () => void
}

function RegistrarModal({ accion, pacienteId, onClose, onRegistrado }: RegistrarModalProps) {
  const [pending, startT]       = useTransition()
  const [observaciones, setObs] = useState('')
  const [motivoOmision, setMot] = useState('')
  const [showOmitir, setShowOmitir] = useState(false)

  // Campos específicos por tipo
  const [administrado, setAdm]  = useState(true)
  const [taSistolica, setTAS]   = useState('')
  const [taDiastolica, setTAD]  = useState('')
  const [fc, setFC]             = useState('')
  const [spo2, setSpo2]         = useState('')
  const [temperatura, setTemp]  = useState('')
  const [glucosa, setGlu]       = useState('')
  const [dolorEva, setDolor]    = useState('')
  const [porcentajeIngesta, setPct] = useState('')
  const [volOrina, setVolOrina] = useState('')

  const conf = TIPO_PLAN_ITEM_CONFIG[accion.tipo]

  const buildDatos = (): Record<string, unknown> => {
    switch (accion.tipo) {
      case 'medicamento':
        return { administrado, hora_real: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) }
      case 'monitoreo':
        return {
          ta_sistolica:  taSistolica  ? Number(taSistolica)  : undefined,
          ta_diastolica: taDiastolica ? Number(taDiastolica) : undefined,
          fc:            fc           ? Number(fc)           : undefined,
          spo2:          spo2         ? Number(spo2)         : undefined,
          temperatura:   temperatura  ? Number(temperatura)  : undefined,
          glucosa:       glucosa      ? Number(glucosa)      : undefined,
          dolor_eva:     dolorEva     ? Number(dolorEva)     : undefined,
        }
      case 'nutricion':
        return { porcentaje_ingesta: porcentajeIngesta ? Number(porcentajeIngesta) : undefined }
      case 'eliminacion':
        return { vol_orina_ml: volOrina ? Number(volOrina) : undefined }
      default:
        return { completado: true }
    }
  }

  const handleRegistrar = () => {
    startT(async () => {
      await registrarAccion(accion.id, pacienteId, buildDatos(), observaciones || undefined)
      onRegistrado()
    })
  }

  const handleOmitir = () => {
    if (!motivoOmision.trim()) return
    startT(async () => {
      await omitirAccion(accion.id, pacienteId, motivoOmision)
      onRegistrado()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: conf.bg, color: conf.color }}>
              <TipoIcon tipo={accion.tipo} size={18} />
            </div>
            <div>
              <p className="font-bold text-[#1B2B4B]">{accion.nombre}</p>
              <p className="text-xs text-gray-400">{conf.label}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Campos por tipo */}
          {accion.tipo === 'medicamento' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">¿Se administró?</label>
              <div className="flex gap-2">
                <button onClick={() => setAdm(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${administrado ? 'text-white border-emerald-500' : 'border-gray-200 text-gray-500'}`}
                  style={{ backgroundColor: administrado ? '#059669' : 'white' }}>
                  ✓ Sí, administrado
                </button>
                <button onClick={() => setAdm(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${!administrado ? 'text-white border-red-500' : 'border-gray-200 text-gray-500'}`}
                  style={{ backgroundColor: !administrado ? '#dc2626' : 'white' }}>
                  ✗ No administrado
                </button>
              </div>
            </div>
          )}

          {accion.tipo === 'monitoreo' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-600">Registrar valores</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'T.A. sistólica', val: taSistolica, set: setTAS, placeholder: '120', unit: 'mmHg' },
                  { label: 'T.A. diastólica', val: taDiastolica, set: setTAD, placeholder: '80', unit: 'mmHg' },
                  { label: 'Frec. cardíaca', val: fc, set: setFC, placeholder: '72', unit: 'lpm' },
                  { label: 'SpO₂', val: spo2, set: setSpo2, placeholder: '97', unit: '%' },
                  { label: 'Temperatura', val: temperatura, set: setTemp, placeholder: '36.5', unit: '°C' },
                  { label: 'Glucosa', val: glucosa, set: setGlu, placeholder: '90', unit: 'mg/dL' },
                  { label: 'Dolor (EVA)', val: dolorEva, set: setDolor, placeholder: '0-10', unit: '' },
                ].map(field => (
                  <div key={field.label}>
                    <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <input type="number" value={field.val}
                        onChange={e => field.set(e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-2 py-2 text-sm focus:outline-none" />
                      {field.unit && (
                        <span className="text-xs text-gray-400 px-2 bg-gray-50 border-l border-gray-200 h-full flex items-center">
                          {field.unit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {accion.tipo === 'nutricion' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">% de ingesta</label>
              <div className="flex gap-2">
                {['25', '50', '75', '100'].map(pct => (
                  <button key={pct} onClick={() => setPct(pct)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${porcentajeIngesta === pct ? 'text-white border-amber-500' : 'border-gray-200 text-gray-500'}`}
                    style={{ backgroundColor: porcentajeIngesta === pct ? '#d97706' : 'white' }}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {accion.tipo === 'eliminacion' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Volumen de orina (mL)</label>
              <input type="number" value={volOrina} onChange={e => setVolOrina(e.target.value)}
                placeholder="ej. 250"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones (opcional)</label>
            <textarea value={observaciones} onChange={e => setObs(e.target.value)}
              rows={2} placeholder="Notas del enfermero..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
          </div>

          {/* Botón registrar */}
          <button onClick={handleRegistrar} disabled={pending}
            className="w-full py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50"
            style={{ backgroundColor: conf.color }}>
            {pending ? 'Registrando...' : '✓ Registrar acción'}
          </button>

          {/* Omitir */}
          <div>
            <button onClick={() => setShowOmitir(v => !v)}
              className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600 transition-colors">
              {showOmitir ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              Omitir esta acción
            </button>
            {showOmitir && (
              <div className="mt-2 space-y-2">
                <textarea value={motivoOmision} onChange={e => setMot(e.target.value)}
                  rows={2} placeholder="Motivo de omisión (requerido)..."
                  className="w-full px-3 py-2 text-xs border border-red-200 rounded-lg focus:outline-none resize-none bg-red-50" />
                <button onClick={handleOmitir} disabled={pending || !motivoOmision.trim()}
                  className="w-full py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all disabled:opacity-40">
                  Confirmar omisión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────

interface ColaNaiSectionProps {
  accionesIniciales: Accion[]
  pacienteId: string
  turnoId: string
}

export function ColaNaiSection({ accionesIniciales, pacienteId, turnoId }: ColaNaiSectionProps) {
  const [acciones, setAcciones] = useState(accionesIniciales)
  const [accionActiva, setAccionActiva] = useState<Accion | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const pendientes  = acciones.filter(a => ['pendiente', 'proxima', 'en_proceso'].includes(a.estado))
  const realizadas  = acciones.filter(a => ['realizada', 'verificada'].includes(a.estado))
  const omitidas    = acciones.filter(a => ['omitida', 'rechazada'].includes(a.estado))

  const total       = acciones.length
  const pct         = total > 0 ? Math.round((realizadas.length / total) * 100) : 0

  const handleRegistrado = () => {
    setAccionActiva(null)
    // Refresca la lista desde el servidor vía window reload (simple para ahora)
    window.location.reload()
  }

  if (acciones.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        <Clock size={28} className="mx-auto mb-2 text-gray-200" />
        <p className="text-sm font-medium text-gray-500">Sin acciones NAI generadas para este turno</p>
        <p className="text-xs text-gray-400 mt-1">El paciente puede no tener un plan de atención activo.</p>
      </div>
    )
  }

  return (
    <>
      {/* Modal de registro */}
      {accionActiva && (
        <RegistrarModal
          accion={accionActiva}
          pacienteId={pacienteId}
          onClose={() => setAccionActiva(null)}
          onRegistrado={handleRegistrado}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Cabecera con progreso */}
        <div className="p-4 border-b border-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-bold text-[#1B2B4B]">Cola de acciones NAI</h2>
            </div>
            <span className="text-xs font-bold" style={{ color: pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#6b7280' }}>
              {pct}% completado
            </span>
          </div>
          {/* Barra de progreso */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#2AABBF',
              }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span>{realizadas.length} realizadas</span>
            <span>{pendientes.length} pendientes</span>
            {omitidas.length > 0 && <span className="text-red-400">{omitidas.length} omitidas</span>}
          </div>
        </div>

        {/* Pendientes */}
        <div className="p-3 space-y-2">
          {pendientes.length === 0 && (
            <div className="text-center py-4">
              <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-600">¡Todas las acciones completadas!</p>
            </div>
          )}
          {pendientes.map(accion => {
            const conf = TIPO_PLAN_ITEM_CONFIG[accion.tipo]
            const esCritica = accion.prioridad === 'critica' || accion.prioridad === 'urgente'
            return (
              <div key={accion.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${esCritica ? 'animate-pulse' : ''}`}
                style={{ borderColor: esCritica ? '#fca5a5' : `${conf.color}20`, backgroundColor: esCritica ? '#fff5f5' : conf.bg }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${conf.color}20`, color: conf.color }}>
                  <TipoIcon tipo={accion.tipo} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1B2B4B] truncate">{accion.nombre}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{conf.label}</span>
                    {accion.programada_para && (
                      <>
                        <span className="text-gray-200">·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(accion.programada_para).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => setAccionActiva(accion)}
                  className="text-xs font-bold px-3 py-2 rounded-xl text-white transition-all hover:opacity-90 flex-shrink-0"
                  style={{ backgroundColor: conf.color }}>
                  Registrar
                </button>
              </div>
            )
          })}

          {/* Realizadas (colapsadas) */}
          {realizadas.length > 0 && (
            <div className="pt-1">
              <button onClick={() => setShowCompleted(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full py-1">
                {showCompleted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <CheckCircle2 size={12} className="text-emerald-400" />
                {realizadas.length} realizadas — ver detalle
              </button>
              {showCompleted && (
                <div className="space-y-1.5 mt-2">
                  {realizadas.map(accion => {
                    const conf = TIPO_PLAN_ITEM_CONFIG[accion.tipo]
                    return (
                      <div key={accion.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50 opacity-70">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ color: '#059669' }}>
                          <CheckCircle2 size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-emerald-800 truncate line-through">{accion.nombre}</p>
                          {accion.completada_en && (
                            <p className="text-xs text-emerald-500">
                              {new Date(accion.completada_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        {accion.observaciones && (
                          <p className="text-xs text-emerald-600 italic truncate max-w-24">{accion.observaciones}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Omitidas */}
          {omitidas.length > 0 && (
            <div className="pt-1 border-t border-red-50">
              <p className="text-xs text-red-400 font-medium mb-1.5">
                <XCircle size={11} className="inline mr-1" />
                {omitidas.length} omitidas
              </p>
              {omitidas.map(accion => {
                const conf = TIPO_PLAN_ITEM_CONFIG[accion.tipo]
                return (
                  <div key={accion.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-100 opacity-70">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-red-400 flex-shrink-0">
                      <XCircle size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-red-700 truncate">{accion.nombre}</p>
                      {accion.observaciones && (
                        <p className="text-xs text-red-500 italic truncate">{accion.observaciones}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
