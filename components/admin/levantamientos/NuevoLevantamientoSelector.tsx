'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronRight,
  User, Phone, MapPin, Activity, DollarSign, Calendar,
  AlertCircle, Lock, ArrowRight, Clock, Shield,
  Archive, Loader2,
} from 'lucide-react'
import type { ProspectoElegible, ProspectoBloqueado } from '@/types'
import { crearLevantamientoDesdeProspecto, archivarLevantamiento } from '@/lib/actions/levantamientos'

// ── Paleta de colores ──────────────────────────────────────────

const RISK_COLOR: Record<string, { bg: string; text: string; border: string; label: string }> = {
  verde:    { bg: '#DCFCE7', text: '#166534', border: '#86EFAC', label: 'Bajo' },
  amarillo: { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047', label: 'Medio-bajo' },
  naranja:  { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74', label: 'Medio-alto' },
  rojo:     { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Alto' },
}

const PROFILE_LABEL: Record<string, string> = {
  cuidador:                 'Cuidador',
  auxiliar:                 'Auxiliar de enfermería',
  enfermero_general:        'Enfermero(a) general',
  enfermero_especializado:  'Enfermero(a) especializado(a)',
}

const PROFILE_COLOR: Record<string, { bg: string; text: string }> = {
  cuidador:                { bg: '#F3F4F6', text: '#374151' },
  auxiliar:                { bg: '#DBEAFE', text: '#1E40AF' },
  enfermero_general:       { bg: '#CCFBF1', text: '#0F766E' },
  enfermero_especializado: { bg: '#EDE9FE', text: '#5B21B6' },
}

const BLOQUEO_STEP_LABEL: Record<string, string> = {
  prelevantamiento:        'Prelevantamiento incompleto',
  evaluacion_fisica:       'Evaluación física pendiente',
  evaluacion_clinica:      'Evaluación clínica pendiente',
  evaluacion_operativa:    'Evaluación operativa pendiente',
  resultado:               'Score sin calcular',
  cotizacion:              'Cotización no generada',
  aceptacion_cotizacion:   'Cotización no aceptada',
  levantamiento_activo:    'Levantamiento activo existente',
}

const BLOQUEO_STEP_COLOR: Record<string, { bg: string; text: string; icon: string }> = {
  prelevantamiento:       { bg: '#FEF9C3', text: '#854D0E', icon: '#D97706' },
  evaluacion_fisica:      { bg: '#FEF9C3', text: '#854D0E', icon: '#D97706' },
  evaluacion_clinica:     { bg: '#FFEDD5', text: '#9A3412', icon: '#EA580C' },
  evaluacion_operativa:   { bg: '#FFEDD5', text: '#9A3412', icon: '#EA580C' },
  resultado:              { bg: '#FFEDD5', text: '#9A3412', icon: '#EA580C' },
  cotizacion:             { bg: '#FEE2E2', text: '#991B1B', icon: '#DC2626' },
  aceptacion_cotizacion:  { bg: '#EFF6FF', text: '#1E40AF', icon: '#3B82F6' },
  levantamiento_activo:   { bg: '#F3E8FF', text: '#6B21A8', icon: '#9333EA' },
}

// ── Formateadores ──────────────────────────────────────────────

function fmtMoney(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const START_DATE_LABELS: Record<string, string> = {
  hoy_mismo:       'Hoy mismo',
  manana:          'Mañana',
  esta_semana:     'Esta semana',
  sin_fecha:       'Sin fecha definida',
  fecha_especifica: 'Fecha por definir',
}

function fmtStartDate(val: string | null | undefined) {
  if (!val) return '—'
  return START_DATE_LABELS[val] ?? fmtDate(val)
}

// ── Modal de confirmación / motivo de archivo ──────────────────

interface ArchivarModalProps {
  levId: string
  onCancel: () => void
  onSuccess: () => void
}

function ArchivarModal({ levId, onCancel, onSuccess }: ArchivarModalProps) {
  const [motivo, setMotivo] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleArchivar() {
    if (!motivo.trim()) {
      setError('El motivo es obligatorio')
      return
    }
    startTransition(async () => {
      const res = await archivarLevantamiento(levId, motivo.trim())
      if (res.error) {
        setError(res.error)
      } else {
        onSuccess()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
              <Archive size={18} style={{ color: '#D97706' }} />
            </div>
            <h3 className="font-semibold text-gray-900">Archivar levantamiento anterior</h3>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            El registro histórico se conservará completo. Necesitas indicar el motivo del archivo.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Motivo del archivo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={e => { setMotivo(e.target.value); setError('') }}
              rows={3}
              placeholder="Ej: Levantamiento previo con datos incompletos e incorrectos. Se genera uno nuevo desde el prelevantamiento actualizado."
              className="w-full px-3 py-2 text-sm border rounded-lg outline-none resize-none focus:border-[#2AABBF] transition-all"
              style={{ borderColor: error ? '#EF4444' : '#E5E7EB' }}
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleArchivar}
              disabled={isPending || !motivo.trim()}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#D97706' }}
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
              Archivar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de prospecto ELEGIBLE ─────────────────────────────

interface ElegibleCardProps {
  p: ProspectoElegible
  esAdmin: boolean
}

function ElegibleCard({ p, esAdmin }: ElegibleCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const riskCfg = RISK_COLOR[p.risk_color] ?? RISK_COLOR.verde
  const profileCfg = PROFILE_COLOR[p.recommended_profile] ?? PROFILE_COLOR.enfermero_general
  const precioDisplay = p.final_price ?? p.suggested_price

  function handleCrear() {
    startTransition(async () => {
      const res = await crearLevantamientoDesdeProspecto(p.prospect_id, p.quote_id)
      if (res.error) {
        setError(res.error)
      } else if (res.id) {
        router.push(`/levantamientos/${res.id}`)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
      style={{ borderColor: riskCfg.border }}>

      {/* Cabecera con semáforo de riesgo */}
      <div className="px-5 py-3 flex items-center justify-between"
        style={{ backgroundColor: riskCfg.bg }}>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={15} style={{ color: riskCfg.text }} />
          <span className="text-xs font-semibold" style={{ color: riskCfg.text }}>
            Listo para levantamiento · Riesgo {riskCfg.label}
          </span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: profileCfg.bg, color: profileCfg.text }}>
          {PROFILE_LABEL[p.recommended_profile] ?? p.recommended_profile}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Datos del paciente */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg leading-tight" style={{ color: '#1B2B4B' }}>
              {p.patient_name}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {p.patient_age ? `${p.patient_age} años · ` : ''}
              {p.patient_gender === 'femenino' ? 'Femenino' : p.patient_gender === 'masculino' ? 'Masculino' : ''}
              {p.diagnosis ? ` · ${p.diagnosis}` : ''}
            </p>
          </div>
          {esAdmin && (
            <div className="text-right shrink-0">
              <p className="text-xl font-bold" style={{ color: '#2AABBF' }}>{fmtMoney(precioDisplay)}</p>
              <p className="text-xs text-gray-400">/turno · cotización aceptada</p>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Físico', score: p.physical_score, max: 50 },
            { label: 'Clínico', score: p.clinical_score, max: 75 },
            { label: 'Operativo', score: p.operational_score, max: 60 },
            { label: 'Total', score: p.total_score, max: 185 },
          ].map(({ label, score, max }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="font-bold text-sm" style={{ color: '#1B2B4B' }}>{score}</p>
              <p className="text-xs text-gray-400">/{max}</p>
            </div>
          ))}
        </div>

        {/* Info de contacto y servicio */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600">
            <User size={13} className="text-gray-400 shrink-0" />
            <span className="truncate">{p.requester_name} ({p.relationship_to_patient})</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Phone size={13} className="text-gray-400 shrink-0" />
            <span>{p.requester_phone}</span>
          </div>
          {(p.service_address || p.city) && (
            <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
              <MapPin size={13} className="text-gray-400 shrink-0" />
              <span className="truncate">{[p.service_address, p.city].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {p.requested_service_type && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Activity size={13} className="text-gray-400 shrink-0" />
              <span>{p.requested_service_type}{p.shift_duration_hours ? ` · ${p.shift_duration_hours}h` : ''}</span>
            </div>
          )}
          {p.requested_start_date && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <span>Inicio: {fmtStartDate(p.requested_start_date)}</span>
            </div>
          )}
          {p.accepted_at && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <DollarSign size={13} className="text-gray-400 shrink-0" />
              <span>Aceptado: {fmtDate(p.accepted_at)}</span>
            </div>
          )}
          {esAdmin && p.deposit_required && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Shield size={13} className="text-gray-400 shrink-0" />
              <span>Anticipo: {fmtMoney(p.deposit_required)}</span>
            </div>
          )}
        </div>

        {/* Alertas activas (si hay) */}
        {(p.blocking_flags.length > 0 || p.warning_flags.length > 0) && (
          <div className="space-y-1">
            {p.blocking_flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded px-2 py-1">
                <XCircle size={11} className="shrink-0 mt-0.5" />
                {flag}
              </div>
            ))}
            {p.warning_flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                {flag}
              </div>
            ))}
          </div>
        )}

        {/* Error de acción */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={handleCrear}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#2AABBF' }}
          >
            {isPending
              ? <><Loader2 size={15} className="animate-spin" /> Creando levantamiento…</>
              : <><CheckCircle2 size={15} /> Crear levantamiento</>
            }
          </button>
          <Link
            href={`/prospectos/${p.prospect_id}`}
            className="px-3 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            title="Ver expediente del prospecto"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de prospecto BLOQUEADO ────────────────────────────

interface BloqueadoCardProps {
  p: ProspectoBloqueado
  onArchivado: () => void
}

function BloqueadoCard({ p, onArchivado }: BloqueadoCardProps) {
  const [showArchivarModal, setShowArchivarModal] = useState(false)
  const cfg = BLOQUEO_STEP_COLOR[p.blocking_step] ?? BLOQUEO_STEP_COLOR.prelevantamiento

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
        {/* Cabecera de bloqueo */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: cfg.bg }}>
          <Lock size={13} style={{ color: cfg.icon }} />
          <span className="text-xs font-semibold" style={{ color: cfg.text }}>
            {BLOQUEO_STEP_LABEL[p.blocking_step] ?? 'Bloqueado'}
          </span>
        </div>

        <div className="p-5 space-y-3">
          {/* Identidad */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">{p.patient_name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Solicita: {p.requester_name}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock size={11} />
              {fmtDate(p.prospect_created_at)}
            </div>
          </div>

          {/* Motivo del bloqueo */}
          <div className="flex items-start gap-2 text-sm rounded-lg px-3 py-2"
            style={{ backgroundColor: cfg.bg }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: cfg.icon }} />
            <span style={{ color: cfg.text }}>{p.blocking_reason}</span>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={p.action_url}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: '#1B2B4B' }}
            >
              <ArrowRight size={12} />
              {p.action_label}
            </Link>

            {p.blocking_step === 'levantamiento_activo' && p.active_levantamiento_id && (
              <button
                onClick={() => setShowArchivarModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all"
              >
                <Archive size={12} />
                Archivar y crear nuevo
              </button>
            )}

            <Link
              href={`/prospectos/${p.prospect_id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              Ver expediente
            </Link>
          </div>
        </div>
      </div>

      {showArchivarModal && p.active_levantamiento_id && (
        <ArchivarModal
          levId={p.active_levantamiento_id}
          onCancel={() => setShowArchivarModal(false)}
          onSuccess={() => {
            setShowArchivarModal(false)
            onArchivado()
          }}
        />
      )}
    </>
  )
}

// ── Componente principal ───────────────────────────────────────

interface Props {
  elegibles: ProspectoElegible[]
  bloqueados: ProspectoBloqueado[]
  esAdmin: boolean
}

export function NuevoLevantamientoSelector({ elegibles: initialElegibles, bloqueados: initialBloqueados, esAdmin }: Props) {
  const router = useRouter()
  const [elegibles] = useState(initialElegibles)
  const [bloqueados] = useState(initialBloqueados)

  function handleArchivado() {
    // Refrescar la página para que el servidor recalcule elegibles/bloqueados
    router.refresh()
  }

  const sinResultados = elegibles.length === 0 && bloqueados.length === 0

  if (sinResultados) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-16 text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: '#EBF8FB' }}>
          <User size={28} style={{ color: '#2AABBF' }} />
        </div>
        <p className="font-semibold text-gray-700 mb-2">No hay prospectos activos</p>
        <p className="text-sm text-gray-400 mb-6">
          Para crear un levantamiento primero debes registrar un prospecto y completar<br />
          todas las evaluaciones y la cotización.
        </p>
        <Link
          href="/prospectos/nuevo"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
          style={{ backgroundColor: '#2AABBF' }}
        >
          Registrar prospecto
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── PROSPECTOS LISTOS ──────────────────────────────────── */}
      {elegibles.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCFCE7' }}>
              <CheckCircle2 size={15} style={{ color: '#166534' }} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">
                Prospectos listos para levantamiento
                <span className="ml-2 text-sm font-medium text-gray-400">({elegibles.length})</span>
              </h2>
              <p className="text-xs text-gray-400">Evaluaciones completas y cotización aceptada</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {elegibles.map(p => (
              <ElegibleCard key={p.prospect_id} p={p} esAdmin={esAdmin} />
            ))}
          </div>
        </section>
      )}

      {/* ── PROSPECTOS BLOQUEADOS ─────────────────────────────── */}
      {bloqueados.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF9C3' }}>
              <Lock size={15} style={{ color: '#854D0E' }} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">
                Prospectos bloqueados
                <span className="ml-2 text-sm font-medium text-gray-400">({bloqueados.length})</span>
              </h2>
              <p className="text-xs text-gray-400">Faltan pasos del flujo para poder crear el levantamiento</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bloqueados.map(p => (
              <BloqueadoCard
                key={p.prospect_id}
                p={p}
                onArchivado={handleArchivado}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── AVISO DE REGLA DE NEGOCIO ────────────────────────── */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5">
        <AlertCircle size={16} className="shrink-0 mt-0.5 text-blue-500" />
        <p className="text-sm text-blue-700 leading-snug">
          <strong>Regla del sistema:</strong> Todo levantamiento debe originarse desde un prospecto con evaluaciones
          completas y cotización aceptada. Esto garantiza trazabilidad, consistencia clínica y respaldo comercial.
        </p>
      </div>

    </div>
  )
}
