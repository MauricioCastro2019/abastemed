import type { RiskColor, ComplexityLevel } from '@/types'

const COLORS: Record<RiskColor, { bg: string; text: string; border: string; dot: string }> = {
  verde:   { bg: '#F0FDF4', text: '#166534', border: '#86efac', dot: '#22c55e' },
  amarillo:{ bg: '#FEFCE8', text: '#854d0e', border: '#fcd34d', dot: '#eab308' },
  naranja: { bg: '#FFF7ED', text: '#9a3412', border: '#fdba74', dot: '#f97316' },
  rojo:    { bg: '#FEF2F2', text: '#991b1b', border: '#fca5a5', dot: '#ef4444' },
}

const LABELS: Record<RiskColor, string> = {
  verde:   'Verde — Cotizable',
  amarillo:'Amarillo — Con aclaraciones',
  naranja: 'Naranja — Requiere valoración',
  rojo:    'Rojo — No iniciar sin autorización',
}

const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  bajo:        'Bajo',
  medio:       'Medio',
  alto:        'Alto',
  especializado:'Especializado',
}

interface Props {
  color: RiskColor
  complexity?: ComplexityLevel
  score?: number
  size?: 'sm' | 'md' | 'lg'
}

export function SemaforoBadge({ color, complexity, score, size = 'md' }: Props) {
  const s = COLORS[color]
  const isLg = size === 'lg'

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full font-medium"
      style={{
        backgroundColor: s.bg,
        color:           s.text,
        border:          `1px solid ${s.border}`,
        padding:         isLg ? '8px 16px' : size === 'sm' ? '3px 10px' : '5px 12px',
        fontSize:        isLg ? '15px' : size === 'sm' ? '11px' : '13px',
      }}>
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: isLg ? 10 : 8, height: isLg ? 10 : 8, backgroundColor: s.dot }}
      />
      <span>{LABELS[color]}</span>
      {complexity && (
        <span className="opacity-60 text-xs">· Nivel {COMPLEXITY_LABELS[complexity]}</span>
      )}
      {score !== undefined && (
        <span className="opacity-60 text-xs">· {score} pts</span>
      )}
    </div>
  )
}

export function ProspectoStatusBadge({ status }: { status: string }) {
  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    nuevo:                    { label: 'Nuevo',                   color: '#6b7280', bg: '#f3f4f6' },
    prelevantamiento_iniciado:{ label: 'Pre-levantamiento',       color: '#2563eb', bg: '#eff6ff' },
    informacion_incompleta:   { label: 'Info incompleta',         color: '#d97706', bg: '#fffbeb' },
    requiere_valoracion:      { label: 'Requiere valoración',     color: '#dc2626', bg: '#fef2f2' },
    cotizacion_generada:      { label: 'Cotización generada',     color: '#7c3aed', bg: '#f5f3ff' },
    propuesta_enviada:        { label: 'Propuesta enviada',       color: '#0891b2', bg: '#ecfeff' },
    propuesta_aceptada:       { label: 'Propuesta aceptada',      color: '#059669', bg: '#f0fdf4' },
    en_validacion:            { label: 'En validación',           color: '#d97706', bg: '#fffbeb' },
    en_espera_de_pago:        { label: 'Espera de pago',          color: '#dc2626', bg: '#fef2f2' },
    listo_para_activar:       { label: 'Listo para activar',      color: '#059669', bg: '#f0fdf4' },
    paciente_activo:          { label: 'Paciente activo ✓',       color: '#065f46', bg: '#ecfdf5' },
    rechazado:                { label: 'Rechazado',               color: '#6b7280', bg: '#f3f4f6' },
    cancelado:                { label: 'Cancelado',               color: '#6b7280', bg: '#f3f4f6' },
  }

  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6' }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  )
}
