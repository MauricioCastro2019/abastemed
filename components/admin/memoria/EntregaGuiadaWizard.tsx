'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, Minus, TrendingDown, ChevronRight, ChevronLeft,
  CheckCircle2, FileText, Users, Heart, Bell, BellOff, Sparkles,
  ListTodo, Eye, ClipboardList,
} from 'lucide-react'
import { crearEntregaGuiada } from '@/lib/actions/entrega-guiada'
import { CopyButton } from './CopyButton'
import type { EstadoPacienteEntrega } from '@/types'

// ─── Config estados ──────────────────────────────────────────
const ESTADO_CONFIG: Record<EstadoPacienteEntrega, {
  label: string
  sublabel: string
  icon: React.ReactNode
  color: string
  bg: string
  border: string
}> = {
  mejor: {
    label:    'Mejor',
    sublabel: 'Mejoría observable respecto al turno anterior',
    icon:     <TrendingUp size={24} />,
    color:    '#059669',
    bg:       '#ECFDF5',
    border:   '#86efac',
  },
  igual: {
    label:    'Igual',
    sublabel: 'Estable, sin cambios significativos',
    icon:     <Minus size={24} />,
    color:    '#2563eb',
    bg:       '#EFF6FF',
    border:   '#bfdbfe',
  },
  peor: {
    label:    'Peor',
    sublabel: 'Deterioro observable, requiere atención',
    icon:     <TrendingDown size={24} />,
    color:    '#dc2626',
    bg:       '#FEF2F2',
    border:   '#fca5a5',
  },
}

// ─── Pasos del wizard ────────────────────────────────────────
const PASOS = [
  { id: 1, label: 'Estado',    icon: <Heart size={14} /> },
  { id: 2, label: 'Cambios',   icon: <ClipboardList size={14} /> },
  { id: 3, label: 'Pendientes', icon: <ListTodo size={14} /> },
  { id: 4, label: 'Resumen',   icon: <Sparkles size={14} /> },
]

// ─── Generadores de preview (mirror del server) ──────────────
function previewResumenTurno(estado: EstadoPacienteEntrega, cambios: string, pendientes: string, vigilancia: string) {
  const estadoMap: Record<EstadoPacienteEntrega, string> = {
    mejor: 'Paciente con mejoría respecto al turno anterior',
    igual: 'Paciente estable sin cambios significativos',
    peor:  'Paciente con deterioro respecto al turno anterior — requiere atención',
  }
  const partes = [estadoMap[estado] + '.']
  if (cambios.trim())     partes.push(`Cambios durante el turno: ${cambios.trim()}.`)
  if (pendientes.trim())  partes.push(`Para siguiente turno: ${pendientes.trim()}.`)
  if (vigilancia.trim())  partes.push(`Vigilar especialmente: ${vigilancia.trim()}.`)
  return partes.join(' ')
}

function previewResumenFamiliar(estado: EstadoPacienteEntrega, cambios: string) {
  const estadoMap: Record<EstadoPacienteEntrega, string> = {
    mejor: 'con mejoría en su condición durante este turno',
    igual: 'estable y con sus cuidados al día',
    peor:  'con algunos cambios en su condición que nuestro equipo está atendiendo',
  }
  let resumen = `Su familiar se encuentra ${estadoMap[estado]}.`
  resumen += ' Se realizaron todos los cuidados programados del turno.'
  if (cambios.trim() && estado !== 'igual') resumen += ` Nota relevante: ${cambios.trim()}.`
  resumen += ' Nuestro equipo continuará con la atención en el próximo turno.'
  return resumen
}

function contarPendientes(texto: string): string[] {
  return texto
    .split('\n')
    .map(l => l.replace(/^[-•·*]\s*/, '').trim())
    .filter(l => l.length > 3)
}

// ─── Props ───────────────────────────────────────────────────
interface EntregaGuiadaWizardProps {
  turnoId: string
  casoId: string
  pacienteNombre: string
  redirectOnSuccess?: string
}

export function EntregaGuiadaWizard({ turnoId, casoId, pacienteNombre, redirectOnSuccess }: EntregaGuiadaWizardProps) {
  const router = useRouter()
  const [paso, setPaso]   = useState(1)
  const [saving, setSaving] = useState(false)
  const [done, setDone]   = useState(false)
  const [error, setError] = useState('')

  // Datos del formulario
  const [estado, setEstado]         = useState<EstadoPacienteEntrega | null>(null)
  const [cambios, setCambios]       = useState('')
  const [pendientes, setPendientes] = useState('')
  const [vigilancia, setVigilancia] = useState('')
  const [notificar, setNotificar]   = useState(false)
  const [notasCoord, setNotasCoord] = useState('')

  // Navegación
  function siguiente() {
    if (paso === 1 && !estado) return
    if (paso < 4) setPaso(p => p + 1)
  }
  function anterior() { if (paso > 1) setPaso(p => p - 1) }

  async function confirmar() {
    if (!estado) return
    setSaving(true)
    setError('')

    const fd = new FormData()
    fd.set('turno_id',              turnoId)
    fd.set('caso_id',               casoId)
    fd.set('estado_paciente',       estado)
    fd.set('cambios_relevantes',    cambios)
    fd.set('pendientes_siguiente',  pendientes)
    fd.set('vigilancia_especial',   vigilancia)
    fd.set('notificar_coordinacion', String(notificar))
    fd.set('notas_coordinacion',    notasCoord)

    const result = await crearEntregaGuiada(fd)
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }
    setDone(true)
    setTimeout(() => router.push(redirectOnSuccess ?? `/turnos/${turnoId}`), 1800)
  }

  // ── Pantalla de éxito ─────────────────────────────────────
  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-lg font-bold" style={{ color: '#1B2B4B' }}>
          Entrega de turno registrada
        </h2>
        <p className="text-sm text-gray-500">
          Los resúmenes fueron generados y los pendientes creados.
        </p>
        {pendientes.trim() && contarPendientes(pendientes).length > 0 && (
          <p className="text-xs text-[#2AABBF]">
            {contarPendientes(pendientes).length} pendiente(s) agregado(s) a la Memoria Operativa
          </p>
        )}
        <p className="text-xs text-gray-400">Redirigiendo al turno...</p>
      </div>
    )
  }

  const pendientesParsed = contarPendientes(pendientes)

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── Progress bar ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          {PASOS.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                paso === p.id ? 'text-white' :
                paso > p.id  ? 'text-white' : 'text-gray-400 bg-gray-100'
              }`}
                style={paso >= p.id ? { backgroundColor: '#1B2B4B' } : {}}
              >
                {paso > p.id ? <CheckCircle2 size={12} /> : p.icon}
                <span className="hidden sm:inline">{p.label}</span>
              </div>
              {i < PASOS.length - 1 && (
                <div className={`h-px flex-1 mx-1 transition-all ${paso > p.id ? 'bg-[#1B2B4B]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── PASO 1: Estado del paciente ────────────────────── */}
      {paso === 1 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#1B2B4B' }}>
              ¿Cómo encontraste al paciente?
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Evalúa el estado general de <span className="font-medium">{pacienteNombre}</span> al finalizar tu turno
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.entries(ESTADO_CONFIG) as [EstadoPacienteEntrega, typeof ESTADO_CONFIG[EstadoPacienteEntrega]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setEstado(key)}
                className="rounded-xl p-4 text-left border-2 transition-all"
                style={estado === key
                  ? { borderColor: cfg.color, backgroundColor: cfg.bg }
                  : { borderColor: '#e5e7eb', backgroundColor: 'white' }
                }
              >
                <div className="flex items-center gap-2 mb-2" style={{ color: estado === key ? cfg.color : '#6b7280' }}>
                  {cfg.icon}
                  <span className="font-bold text-sm" style={{ color: '#1B2B4B' }}>{cfg.label}</span>
                </div>
                <p className="text-xs text-gray-500 leading-tight">{cfg.sublabel}</p>
              </button>
            ))}
          </div>

          {!estado && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Selecciona el estado del paciente para continuar
            </p>
          )}
        </div>
      )}

      {/* ── PASO 2: Cambios del turno ──────────────────────── */}
      {paso === 2 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#1B2B4B' }}>
              ¿Qué ocurrió durante el turno?
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Registra los cambios relevantes que observaste. Sé específico.
            </p>
          </div>

          <textarea
            value={cambios}
            onChange={e => setCambios(e.target.value)}
            rows={5}
            placeholder="Ej: Se presentó evacuación líquida a las 14:00h. Se realizó curación en área de pañal por enrojecimiento observado. Paciente rechazó el baño pero aceptó aseo genital..."
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2AABBF] resize-none leading-relaxed"
          />

          <div className="bg-[#EBF8FB] rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-[#1A7A8C] mb-1">Sugerencias para documentar</p>
            <ul className="text-xs text-[#1A7A8C] space-y-0.5 list-disc list-inside">
              <li>Signos o síntomas nuevos que observaste</li>
              <li>Procedimientos realizados fuera de rutina</li>
              <li>Reacciones del paciente a cuidados o medicamentos</li>
              <li>Visitas de familiares o médico relevantes</li>
              <li>Cambios en el estado de ánimo o conciencia</li>
            </ul>
          </div>

          {estado === 'peor' && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs font-medium text-red-700">
                Marcaste deterioro — es importante detallar qué observaste para que el siguiente turno pueda actuar.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── PASO 3: Pendientes y vigilancia ───────────────── */}
      {paso === 3 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold" style={{ color: '#1B2B4B' }}>
              ¿Qué queda pendiente?
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Lo que escribas aquí se guardará automáticamente como pendientes del caso.
            </p>
          </div>

          {/* Pendientes para siguiente turno */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1.5">
              <ListTodo size={13} /> Pendientes para el siguiente turno
            </label>
            <textarea
              value={pendientes}
              onChange={e => setPendientes(e.target.value)}
              rows={4}
              placeholder={`Escribe uno por línea:\n- Vigilar área de pañal por enrojecimiento\n- Solicitar insumo: gasas estériles\n- Confirmar indicación médica de omeprazol`}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2AABBF] resize-none font-mono leading-relaxed"
            />
            {pendientesParsed.length > 0 && (
              <p className="text-xs text-[#2AABBF] mt-1.5">
                {pendientesParsed.length} pendiente(s) serán creados en la Memoria Operativa
              </p>
            )}
          </div>

          {/* Vigilancia especial */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1.5">
              <Eye size={13} /> Vigilancia especial requerida (opcional)
            </label>
            <input
              value={vigilancia}
              onChange={e => setVigilancia(e.target.value)}
              placeholder="Ej: Vigilar saturación de oxígeno, revisar integridad de piel cada 2 horas..."
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#2AABBF]"
            />
          </div>

          {/* Notificar coordinación */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setNotificar(!notificar)}
                className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                  notificar ? 'bg-[#1B2B4B]' : 'bg-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  notificar ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
                  Notificar a coordinación
                </p>
                <p className="text-xs text-gray-400">Genera un resumen específico para el coordinador</p>
              </div>
              {notificar ? <Bell size={16} className="ml-auto text-[#1B2B4B]" /> : <BellOff size={16} className="ml-auto text-gray-300" />}
            </label>

            {notificar && (
              <textarea
                value={notasCoord}
                onChange={e => setNotasCoord(e.target.value)}
                rows={2}
                placeholder="¿Qué necesitas que sepa coordinación? (requerimientos urgentes, situaciones que escalan...)"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#2AABBF] resize-none"
              />
            )}
          </div>
        </div>
      )}

      {/* ── PASO 4: Vista previa resúmenes ─────────────────── */}
      {paso === 4 && estado && (
        <div className="space-y-4">

          {/* Resumen para siguiente enfermera */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#EBF8FB' }}>
                <Users size={14} style={{ color: '#2AABBF' }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: '#1B2B4B' }}>
                  Resumen para la siguiente enfermera
                </p>
                <p className="text-xs text-gray-400">Generado automáticamente</p>
              </div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#EBF8FB] text-[#1A7A8C] font-medium flex items-center gap-1">
                <Sparkles size={10} /> Auto
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {previewResumenTurno(estado, cambios, pendientes, vigilancia)}
              </p>
            </div>
            <div className="flex justify-end">
              <CopyButton text={previewResumenTurno(estado, cambios, pendientes, vigilancia)} />
            </div>
          </div>

          {/* Pendientes que se crearán */}
          {pendientesParsed.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-amber-100">
                  <ListTodo size={14} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#1B2B4B' }}>
                    Pendientes que se crearán
                  </p>
                  <p className="text-xs text-gray-400">Se agregarán a la Memoria Operativa del paciente</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {pendientesParsed.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-gray-700">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen para familiar */}
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-pink-100">
                <Heart size={14} className="text-pink-600" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: '#1B2B4B' }}>
                  Resumen para familiar
                </p>
                <p className="text-xs text-gray-400">Sin jerga clínica, listo para compartir</p>
              </div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#EBF8FB] text-[#1A7A8C] font-medium flex items-center gap-1">
                <Sparkles size={10} /> Auto
              </span>
            </div>
            <div className="bg-pink-50 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {previewResumenFamiliar(estado, cambios)}
              </p>
            </div>
            <div className="flex justify-end">
              <CopyButton text={previewResumenFamiliar(estado, cambios)} label="Copiar para WhatsApp" />
            </div>
          </div>

          {/* Resumen para coordinación */}
          {notificar && (
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#F5F3FF' }}>
                  <FileText size={14} style={{ color: '#7c3aed' }} />
                </div>
                <p className="text-xs font-bold" style={{ color: '#1B2B4B' }}>
                  Nota para coordinación
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700">
                  {notasCoord || '(Sin notas adicionales para coordinación)'}
                </p>
                {pendientesParsed.length > 0 && (
                  <p className="text-xs text-purple-600 mt-2">
                    + {pendientesParsed.length} pendiente(s) generado(s) en la Memoria Operativa
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}
        </div>
      )}

      {/* ── Navegación ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={anterior}
          disabled={paso === 1}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:border-gray-300 transition-all disabled:opacity-0"
        >
          <ChevronLeft size={16} /> Anterior
        </button>

        {paso < 4 ? (
          <button
            onClick={siguiente}
            disabled={paso === 1 && !estado}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-40 transition-all"
            style={{ backgroundColor: '#1B2B4B' }}
          >
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={confirmar}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-all"
            style={{ backgroundColor: '#059669' }}
          >
            {saving ? 'Guardando...' : (
              <><CheckCircle2 size={16} /> Confirmar entrega</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
