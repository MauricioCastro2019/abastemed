import { getMisCapacitaciones } from '@/lib/actions/capacitaciones'
import Link from 'next/link'
import type { ModuloCapacitacion } from '@/types'
import { BookOpen, Clock, CheckCircle2, ChevronRight, Lock, Zap, TrendingUp, HeartPulse, Layers, type LucideIcon } from 'lucide-react'

const CATEGORIA_LABELS: Record<string, string> = {
  induccion: 'Inducción',
  comunicacion: 'Comunicación',
  operativo: 'Operativo',
  clinico: 'Clínico',
  medicacion: 'Medicación',
  cuidado_basico: 'Cuidado básico',
  procedimientos: 'Procedimientos',
  especializado: 'Especializado',
  urgencias: 'Signos vitales y urgencias',
}

const CATEGORIA_ICONOS: Record<string, LucideIcon> = {
  urgencias: HeartPulse,
}

function iconoModulo(modulo: ModuloCapacitacion): LucideIcon {
  const categoria = modulo.competencia?.categoria
  return (categoria && CATEGORIA_ICONOS[categoria]) || BookOpen
}

function contarLecciones(modulo: ModuloCapacitacion): number {
  return new Set(modulo.contenido.filter(b => b.leccion != null).map(b => b.leccion)).size
}

const ESTADO_CONFIG = {
  no_iniciado: { label: 'Comenzar', color: '#6B7280', bg: '#F3F4F6', dot: '#6B7280' },
  en_progreso: { label: 'Continuar', color: '#D97706', bg: '#FFFBEB', dot: '#D97706' },
  completado:  { label: 'Revisar',   color: '#0284C7', bg: '#E0F2FE', dot: '#0284C7' },
  aprobado:    { label: 'Aprobado',  color: '#059669', bg: '#ECFDF5', dot: '#059669' },
}

export default async function CapacitacionesPage() {
  const { modulos, progresos } = await getMisCapacitaciones()

  const obligatorios   = modulos.filter(m => m.obligatorio)
  const opcionales     = modulos.filter(m => !m.obligatorio)
  const totalAprobados = progresos.filter(p => p.estado === 'aprobado').length

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Capacitaciones</h1>
        <p className="text-sm text-gray-400 mt-1">
          Aprende, prepárate y desbloquea competencias verificadas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Completadas', value: totalAprobados, icon: CheckCircle2, color: '#059669', bg: '#ECFDF5' },
          { label: 'Disponibles', value: modulos.length, icon: BookOpen, color: '#2AABBF', bg: '#EBF8FB' },
          {
            label: 'Pendientes oblig.',
            value: obligatorios.filter(m => {
              const p = progresos.find(p => p.modulo_id === m.id)
              return !p || p.estado === 'no_iniciado' || p.estado === 'en_progreso'
            }).length,
            icon: Zap,
            color: '#D97706',
            bg: '#FFFBEB',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-xl font-bold" style={{ color: '#1B2B4B' }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Obligatorios */}
      {obligatorios.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} style={{ color: '#D97706' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Obligatorios</h2>
            <span className="text-xs text-gray-400 ml-1">Requeridos para comenzar a recibir guardias</span>
          </div>

          <div className="space-y-2">
            {obligatorios.map(modulo => {
              const progreso = progresos.find(p => p.modulo_id === modulo.id)
              const estado = progreso?.estado ?? 'no_iniciado'
              const cfg = ESTADO_CONFIG[estado]
              const aprobado = estado === 'aprobado'
              const Icono = iconoModulo(modulo)
              const numLecciones = contarLecciones(modulo)

              return (
                <Link
                  key={modulo.id}
                  href={`/enfermero/capacitaciones/${modulo.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                >
                  {/* Ícono de estado */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: aprobado ? '#ECFDF5' : '#F5F5F0' }}>
                    {aprobado
                      ? <CheckCircle2 size={20} style={{ color: '#059669' }} />
                      : <Icono size={20} style={{ color: '#2AABBF' }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#1B2B4B' }}>
                          {modulo.titulo}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={10} /> {modulo.duracion_minutos} min
                          </span>
                          {numLecciones > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Layers size={10} /> {numLecciones} lecciones
                            </span>
                          )}
                          {modulo.competencia && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
                              {CATEGORIA_LABELS[modulo.competencia.categoria] ?? modulo.competencia.categoria}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    {progreso && progreso.progreso_pct > 0 && estado !== 'aprobado' && (
                      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${progreso.progreso_pct}%`, backgroundColor: cfg.dot }} />
                      </div>
                    )}
                    {aprobado && progreso?.score !== null && progreso?.score !== undefined && (
                      <p className="text-xs text-emerald-600 mt-1">Calificación: {progreso.score}%</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Opcionales */}
      {opcionales.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Desarrollo profesional</h2>
          </div>

          <div className="space-y-2">
            {opcionales.map(modulo => {
              const progreso = progresos.find(p => p.modulo_id === modulo.id)
              const estado = progreso?.estado ?? 'no_iniciado'
              const cfg = ESTADO_CONFIG[estado]
              const aprobado = estado === 'aprobado'
              const Icono = iconoModulo(modulo)
              const numLecciones = contarLecciones(modulo)

              return (
                <Link
                  key={modulo.id}
                  href={`/enfermero/capacitaciones/${modulo.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: aprobado ? '#ECFDF5' : '#F5F5F0' }}>
                    {aprobado
                      ? <CheckCircle2 size={20} style={{ color: '#059669' }} />
                      : <Icono size={20} className="text-gray-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#1B2B4B' }}>{modulo.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={10} /> {modulo.duracion_minutos} min
                          </span>
                          {numLecciones > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Layers size={10} /> {numLecciones} lecciones
                            </span>
                          )}
                          {modulo.competencia && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
                              {CATEGORIA_LABELS[modulo.competencia.categoria] ?? modulo.competencia.categoria}
                            </span>
                          )}
                          {modulo.nivel_requerido > 1 && (
                            <span className="text-xs text-gray-300 flex items-center gap-1">
                              <Lock size={9} /> N{modulo.nivel_requerido}+
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                    {progreso && progreso.progreso_pct > 0 && estado !== 'aprobado' && (
                      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${progreso.progreso_pct}%`, backgroundColor: cfg.dot }} />
                      </div>
                    )}
                    {aprobado && progreso?.score !== null && progreso?.score !== undefined && (
                      <p className="text-xs text-emerald-600 mt-1">Calificación: {progreso.score}%</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {modulos.length === 0 && (
        <div className="text-center py-16">
          <BookOpen size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No hay capacitaciones disponibles aún.</p>
          <p className="text-gray-300 text-xs mt-1">El equipo está preparando el contenido.</p>
        </div>
      )}
    </div>
  )
}
