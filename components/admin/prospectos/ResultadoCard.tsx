import type { AssessmentResult, RiskColor, ComplexityLevel, RecommendedProfile } from '@/types'
import { SemaforoBadge } from './SemaforoBadge'

const RISK_COLOR_LABELS: Record<RiskColor, string> = {
  verde:   'Cotizable de inmediato',
  amarillo:'Cotizable con aclaraciones',
  naranja: 'Requiere valoración antes de iniciar',
  rojo:    'No iniciar sin validación formal',
}

const PROFILE_LABELS: Record<RecommendedProfile, string> = {
  cuidador:               'Cuidador / acompañante capacitado',
  auxiliar:               'Auxiliar / cuidador experimentado',
  enfermero_general:      'Enfermero general',
  enfermero_especializado:'Enfermero especializado + supervisión obligatoria',
}

const PHYSICAL_LEVEL_LABELS: Record<string, string> = {
  apoyo_ligero:       'Apoyo ligero (0-5)',
  apoyo_moderado:     'Apoyo moderado (6-12)',
  alta_dependencia:   'Alta dependencia (13-22)',
  dependencia_severa: 'Dependencia severa (23+)',
}

interface Props {
  result: AssessmentResult
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function ResultadoCard({ result }: Props) {
  const physicalColor   = result.physical_score <= 5 ? '#22c55e' : result.physical_score <= 12 ? '#eab308' : result.physical_score <= 22 ? '#f97316' : '#ef4444'
  const clinicalColor   = result.clinical_score <= 4 ? '#22c55e' : result.clinical_score <= 12 ? '#eab308' : result.clinical_score <= 24 ? '#f97316' : '#ef4444'
  const operationalColor = result.operational_score <= 5 ? '#22c55e' : result.operational_score <= 12 ? '#eab308' : result.operational_score <= 22 ? '#f97316' : '#ef4444'

  return (
    <div className="space-y-5">

      {/* Semáforo principal */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: '#1B2B4B' }}>
              Resultado de Evaluación
            </h3>
            <SemaforoBadge
              color={result.risk_color as RiskColor}
              complexity={result.general_complexity_level as ComplexityLevel}
              score={result.total_score}
              size="lg"
            />
            <p className="text-sm text-gray-500 mt-2">{RISK_COLOR_LABELS[result.risk_color as RiskColor]}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Score total</p>
            <p className="text-4xl font-bold" style={{ color: '#1B2B4B' }}>{result.total_score}</p>
            <p className="text-xs text-gray-400">puntos</p>
          </div>
        </div>
      </div>

      {/* Scores parciales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Score Físico', score: result.physical_score, max: 39, level: PHYSICAL_LEVEL_LABELS[result.general_complexity_level] ?? '', color: physicalColor, desc: `${result.physical_score} pts` },
          { label: 'Score Clínico', score: result.clinical_score, max: 65, level: '', color: clinicalColor, desc: `${result.clinical_score} pts` },
          { label: 'Score Operativo', score: result.operational_score, max: 48, level: '', color: operationalColor, desc: `${result.operational_score} pts` },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{item.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: item.color }}>{item.score}</p>
            <ScoreBar value={item.score} max={item.max} color={item.color} />
          </div>
        ))}
      </div>

      {/* Perfil recomendado */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Perfil recomendado</h3>
        <p className="text-base font-semibold" style={{ color: '#1B2B4B' }}>
          {PROFILE_LABELS[result.recommended_profile as RecommendedProfile] ?? result.recommended_profile}
        </p>
      </div>

      {/* Condiciones y requerimientos */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Condiciones requeridas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'requires_in_person_assessment', label: 'Valoración presencial' },
            { key: 'requires_formal_proposal',      label: 'Propuesta formal' },
            { key: 'requires_clinical_supervision', label: 'Supervisión clínica' },
            { key: 'requires_mandatory_log',        label: 'Bitácora obligatoria' },
            { key: 'requires_advance_payment',      label: 'Pago anticipado' },
          ].map(({ key, label }) => {
            const val = result[key as keyof AssessmentResult] as boolean
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${val ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {val ? '!' : '✓'}
                </div>
                <span className={`text-sm ${val ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{label}</span>
                <span className={`text-xs ${val ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  {val ? 'Requerido' : 'No requerido'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Banderas de bloqueo */}
      {result.blocking_flags.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
            <span>🔴</span> Banderas de bloqueo — No iniciar sin resolución
          </h3>
          <ul className="space-y-1.5">
            {result.blocking_flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                <span className="flex-shrink-0 mt-0.5">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advertencias */}
      {result.warning_flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
            <span>⚠</span> Advertencias
          </h3>
          <ul className="space-y-1.5">
            {result.warning_flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="flex-shrink-0 mt-0.5">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recomendación interna */}
      {result.internal_recommendation && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-blue-700 mb-2">Recomendación interna</h3>
          <p className="text-sm text-blue-800 leading-relaxed">{result.internal_recommendation}</p>
        </div>
      )}
    </div>
  )
}
