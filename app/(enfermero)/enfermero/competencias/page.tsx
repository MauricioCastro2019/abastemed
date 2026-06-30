import { getMisCompetenciasCompleto } from '@/lib/actions/centro-profesional'
import Link from 'next/link'
import { Shield, CheckCircle2, Circle, BookOpen, ChevronRight, Award, Info } from 'lucide-react'
import type { EstadoCompetencia } from '@/types'

const CATEGORIA_LABELS: Record<string, string> = {
  induccion: 'Inducción',
  comunicacion: 'Comunicación',
  operativo: 'Operativo',
  clinico: 'Clínico',
  medicacion: 'Medicación',
  cuidado_basico: 'Cuidado básico',
  procedimientos: 'Procedimientos',
  especializado: 'Especializado',
}

const ESTADO_CONFIG: Record<EstadoCompetencia, { label: string; color: string; bg: string; icono: typeof Circle }> = {
  no_iniciado:           { label: 'No iniciado',        color: '#9CA3AF', bg: '#F3F4F6', icono: Circle },
  capacitacion_vista:    { label: 'Capacitación vista',  color: '#0284C7', bg: '#E0F2FE', icono: BookOpen },
  evaluacion_aprobada:   { label: 'Evaluación aprobada', color: '#7C3AED', bg: '#EDE9FE', icono: CheckCircle2 },
  practica_observada:    { label: 'Práctica observada',  color: '#D97706', bg: '#FFFBEB', icono: CheckCircle2 },
  validado:              { label: 'Validado',            color: '#059669', bg: '#ECFDF5', icono: Award },
}

const CATEGORIAS_ORDEN = [
  'induccion', 'operativo', 'clinico', 'medicacion',
  'cuidado_basico', 'procedimientos', 'comunicacion', 'especializado',
]

export default async function CompetenciasPage() {
  const { competencias, mis_competencias } = await getMisCompetenciasCompleto()

  // Mapear mis competencias por id
  const miMapeo = new Map(mis_competencias.map(mc => [mc.competencia_id, mc]))

  // Agrupar por categoría
  const grupos = CATEGORIAS_ORDEN.reduce((acc, cat) => {
    const items = competencias.filter(c => c.categoria === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, typeof competencias>)

  // Categorías sin mapear
  competencias.forEach(c => {
    if (!CATEGORIAS_ORDEN.includes(c.categoria)) {
      if (!grupos[c.categoria]) grupos[c.categoria] = []
      grupos[c.categoria].push(c)
    }
  })

  const verificadas = mis_competencias.filter(mc => mc.estado === 'validado').length
  const enProgreso  = mis_competencias.filter(mc => mc.estado !== 'no_iniciado' && mc.estado !== 'validado').length
  const total       = competencias.length

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Mis Competencias</h1>
        <p className="text-sm text-gray-400 mt-1">
          Competencias clínicas y operativas verificadas por Abastemed
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Verificadas', value: verificadas, color: '#059669', bg: '#ECFDF5', icon: Award },
          { label: 'En progreso', value: enProgreso,  color: '#D97706', bg: '#FFFBEB', icon: BookOpen },
          { label: 'Total',       value: total,       color: '#2AABBF', bg: '#EBF8FB', icon: Shield },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-xl font-bold" style={{ color: '#1B2B4B' }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Explicación del sistema */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex gap-3">
          <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-semibold">¿Cómo funciona el sistema de competencias?</p>
            <p>1. <strong>Capacitación vista</strong> — completa el módulo teórico</p>
            <p>2. <strong>Evaluación aprobada</strong> — aprueba con 70%+ la evaluación del módulo</p>
            <p>3. <strong>Práctica observada</strong> — coordinación observa la práctica en campo</p>
            <p>4. <strong>Validado</strong> — coordinación valida y certifica la competencia</p>
          </div>
        </div>
      </div>

      {/* Grupos por categoría */}
      {Object.entries(grupos).map(([categoria, items]) => (
        <div key={categoria}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#1B2B4B' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2AABBF' }} />
            {CATEGORIA_LABELS[categoria] ?? categoria}
            <span className="text-xs text-gray-300 font-normal">
              ({items.filter(c => miMapeo.get(c.id)?.estado === 'validado').length}/{items.length} validadas)
            </span>
          </h2>

          <div className="space-y-2">
            {items.map(competencia => {
              const miComp = miMapeo.get(competencia.id)
              const estado: EstadoCompetencia = miComp?.estado ?? 'no_iniciado'
              const cfg = ESTADO_CONFIG[estado]
              const Icon = cfg.icono

              return (
                <div key={competencia.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cfg.bg }}>
                      <Icon size={16} style={{ color: cfg.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
                            {competencia.nombre}
                          </p>
                          {competencia.descripcion && (
                            <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                              {competencia.descripcion}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Fecha si está validado */}
                      {miComp?.validado_at && (
                        <p className="text-xs text-emerald-600 mt-1">
                          Validado el {new Date(miComp.validado_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}

                      {/* Score de evaluación */}
                      {miComp?.evaluacion_score !== null && miComp?.evaluacion_score !== undefined && estado !== 'no_iniciado' && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Evaluación: {miComp.evaluacion_score}%
                        </p>
                      )}

                      {/* CTA si no iniciado o evaluación pendiente */}
                      {(estado === 'no_iniciado' || estado === 'capacitacion_vista') && (
                        <Link
                          href="/enfermero/capacitaciones"
                          className="inline-flex items-center gap-1 mt-2 text-xs font-medium"
                          style={{ color: '#2AABBF' }}
                        >
                          <BookOpen size={11} />
                          {estado === 'no_iniciado' ? 'Comenzar capacitación' : 'Completar evaluación'}
                          <ChevronRight size={11} />
                        </Link>
                      )}

                      {/* Mensaje si aprobó pero falta validación */}
                      {estado === 'evaluacion_aprobada' && (
                        <p className="text-xs text-purple-600 mt-1 italic">
                          Coordinación programará la observación práctica
                        </p>
                      )}

                      {estado === 'practica_observada' && (
                        <p className="text-xs text-amber-600 mt-1 italic">
                          Pendiente validación final por coordinación
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Barra de progreso del estado */}
                  <div className="mt-3 flex gap-1">
                    {(['capacitacion_vista', 'evaluacion_aprobada', 'practica_observada', 'validado'] as EstadoCompetencia[]).map((e, i) => {
                      const estados: EstadoCompetencia[] = ['no_iniciado', 'capacitacion_vista', 'evaluacion_aprobada', 'practica_observada', 'validado']
                      const nivelActual = estados.indexOf(estado)
                      const nivelEste   = estados.indexOf(e)
                      return (
                        <div
                          key={e}
                          className="flex-1 h-1 rounded-full"
                          style={{
                            backgroundColor: nivelActual >= nivelEste
                              ? ESTADO_CONFIG[e].color
                              : '#E5E7EB',
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Estado vacío */}
      {competencias.length === 0 && (
        <div className="text-center py-16">
          <Shield size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No hay competencias definidas aún.</p>
        </div>
      )}
    </div>
  )
}
