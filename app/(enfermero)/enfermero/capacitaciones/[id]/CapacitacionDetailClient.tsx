'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { iniciarModulo, completarModulo } from '@/lib/actions/capacitaciones'
import type { ModuloCapacitacion, ProgresoCapacitacion, ContenidoModulo } from '@/types'
import {
  ArrowLeft, Clock, BookOpen, CheckCircle2, CheckSquare, Square,
  ChevronRight, AlertTriangle, Star, RefreshCw, Award
} from 'lucide-react'

const CATEGORIA_LABELS: Record<string, string> = {
  induccion: 'Inducción', comunicacion: 'Comunicación', operativo: 'Operativo',
  clinico: 'Clínico', medicacion: 'Medicación', cuidado_basico: 'Cuidado básico',
  procedimientos: 'Procedimientos', especializado: 'Especializado',
}

type Fase = 'inicio' | 'contenido' | 'checklist' | 'evaluacion' | 'resultado'

interface Props {
  modulo: ModuloCapacitacion
  progreso: ProgresoCapacitacion | null
}

function SeccionContenido({ bloque }: { bloque: ContenidoModulo }) {
  switch (bloque.tipo) {
    case 'intro':
      return (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-800 leading-relaxed">{bloque.texto}</p>
        </div>
      )
    case 'seccion':
      return (
        <div>
          {bloque.titulo && (
            <h3 className="font-semibold text-sm mb-1.5" style={{ color: '#1B2B4B' }}>{bloque.titulo}</h3>
          )}
          <p className="text-sm text-gray-600 leading-relaxed">{bloque.texto}</p>
        </div>
      )
    case 'punto_clave':
      return (
        <div className="flex gap-3 bg-teal-50 border border-teal-100 rounded-xl p-4">
          <Star size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-teal-800">{bloque.texto}</p>
        </div>
      )
    case 'alerta':
      return (
        <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{bloque.texto}</p>
        </div>
      )
    case 'frase_cultura':
      return (
        <div className="border-l-4 pl-4 py-1" style={{ borderColor: '#2AABBF' }}>
          <p className="text-sm italic text-gray-500 leading-relaxed">&ldquo;{bloque.texto}&rdquo;</p>
        </div>
      )
    default:
      return null
  }
}

export function CapacitacionDetailClient({ modulo, progreso }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const yaAprobado = progreso?.estado === 'aprobado'
  const yaCompletado = progreso?.estado === 'completado' || yaAprobado

  const [fase, setFase] = useState<Fase>(
    yaAprobado ? 'resultado' : yaCompletado ? 'evaluacion' : 'inicio'
  )

  // Checklist state
  const [checkItems, setCheckItems] = useState<boolean[]>(
    new Array(modulo.checklist.length).fill(false)
  )
  const todosCheck = checkItems.every(Boolean)

  // Evaluación state
  const [respuestas, setRespuestas] = useState<(number | null)[]>(
    new Array(modulo.evaluacion.length).fill(null)
  )
  const todasRespondidas = respuestas.every(r => r !== null)

  // Resultado
  const [resultado, setResultado] = useState<{ score: number; aprobado: boolean } | null>(
    yaAprobado && progreso?.score !== undefined && progreso.score !== null
      ? { score: progreso.score, aprobado: true }
      : null
  )
  const [error, setError] = useState('')

  function handleIniciar() {
    startTransition(async () => {
      await iniciarModulo(modulo.id)
      setFase(modulo.contenido.length > 0 ? 'contenido' : 'checklist')
    })
  }

  function handleCompletarContenido() {
    if (modulo.checklist.length > 0) {
      setFase('checklist')
    } else if (modulo.evaluacion.length > 0) {
      setFase('evaluacion')
    } else {
      handleEnviarEvaluacion()
    }
  }

  function handleCompletarChecklist() {
    if (modulo.evaluacion.length > 0) {
      setFase('evaluacion')
    } else {
      handleEnviarEvaluacion()
    }
  }

  function handleEnviarEvaluacion() {
    if (modulo.evaluacion.length > 0 && !todasRespondidas) return

    startTransition(async () => {
      setError('')
      const resp = respuestas.map(r => r ?? 0)
      const result = await completarModulo(modulo.id, resp, modulo.evaluacion)
      if (result.ok) {
        setResultado({ score: result.score, aprobado: result.aprobado })
        setFase('resultado')
      } else {
        setError(result.error ?? 'Error al enviar evaluación')
      }
    })
  }

  const categoria = modulo.competencia
    ? (CATEGORIA_LABELS[modulo.competencia.categoria] ?? modulo.competencia.categoria)
    : 'General'

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Back */}
      <Link href="/enfermero/capacitaciones"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        <ArrowLeft size={15} /> Capacitaciones
      </Link>

      {/* Header del módulo */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#EBF8FB' }}>
            <BookOpen size={22} style={{ color: '#2AABBF' }} />
          </div>
          {yaAprobado && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={13} /> Aprobado
            </div>
          )}
        </div>

        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
          {categoria}
        </span>
        <h1 className="text-xl font-bold mt-2" style={{ color: '#1B2B4B' }}>{modulo.titulo}</h1>
        {modulo.descripcion && (
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{modulo.descripcion}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Clock size={11} /> {modulo.duracion_minutos} min estimados</span>
          {modulo.checklist.length > 0 && <span>{modulo.checklist.length} puntos de verificación</span>}
          {modulo.evaluacion.length > 0 && <span>{modulo.evaluacion.length} preguntas</span>}
          {modulo.obligatorio && <span className="text-amber-500 font-medium">Obligatorio</span>}
        </div>

        {/* Pasos visuales */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          {[
            { key: 'contenido', label: 'Contenido', show: modulo.contenido.length > 0 },
            { key: 'checklist', label: 'Verificación', show: modulo.checklist.length > 0 },
            { key: 'evaluacion', label: 'Evaluación', show: modulo.evaluacion.length > 0 },
            { key: 'resultado', label: 'Resultado', show: true },
          ].filter(s => s.show).map((step, i, arr) => {
            const pasado = (['inicio', 'contenido', 'checklist', 'evaluacion', 'resultado'] as Fase[])
              .indexOf(fase) > (['inicio', 'contenido', 'checklist', 'evaluacion', 'resultado'] as Fase[]).indexOf(step.key as Fase)
            const actual = fase === step.key
            return (
              <div key={step.key} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  actual ? 'text-[#2AABBF]' : pasado ? 'text-emerald-500' : 'text-gray-300'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    actual ? 'bg-[#2AABBF] text-white' : pasado ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-300'
                  }`}>
                    {pasado ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {i < arr.length - 1 && <div className="flex-1 h-px bg-gray-100" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── FASE: INICIO ──────────────────────────────────── */}
      {fase === 'inicio' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#EBF8FB' }}>
            <BookOpen size={28} style={{ color: '#2AABBF' }} />
          </div>
          <h2 className="font-bold text-lg mb-2" style={{ color: '#1B2B4B' }}>
            {yaCompletado ? 'Repetir capacitación' : 'Comenzar capacitación'}
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            {yaCompletado
              ? `Ya completaste este módulo con ${progreso?.score ?? 0}% de calificación. Puedes repetirlo para mejorar.`
              : `Este módulo te tomará aproximadamente ${modulo.duracion_minutos} minutos.`}
          </p>
          <button
            onClick={handleIniciar}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: '#2AABBF' }}
          >
            {isPending ? <RefreshCw size={15} className="animate-spin" /> : <ChevronRight size={15} />}
            {isPending ? 'Iniciando...' : yaCompletado ? 'Repetir módulo' : 'Comenzar'}
          </button>
        </div>
      )}

      {/* ── FASE: CONTENIDO ──────────────────────────────── */}
      {fase === 'contenido' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            {modulo.contenido.map((bloque, i) => (
              <SeccionContenido key={i} bloque={bloque} />
            ))}
          </div>

          <button
            onClick={handleCompletarContenido}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#2AABBF' }}
          >
            {modulo.checklist.length > 0
              ? <>Continuar a verificación <ChevronRight size={15} /></>
              : modulo.evaluacion.length > 0
              ? <>Ir a evaluación <ChevronRight size={15} /></>
              : <>Finalizar <CheckCircle2 size={15} /></>}
          </button>
        </div>
      )}

      {/* ── FASE: CHECKLIST ──────────────────────────────── */}
      {fase === 'checklist' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold mb-1" style={{ color: '#1B2B4B' }}>Lista de verificación</h2>
            <p className="text-sm text-gray-400 mb-4">Confirma que entendiste cada punto antes de continuar</p>

            <div className="space-y-3">
              {modulo.checklist.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const next = [...checkItems]
                    next[i] = !next[i]
                    setCheckItems(next)
                  }}
                  className="w-full flex items-start gap-3 text-left p-3 rounded-xl transition-all hover:bg-gray-50"
                  style={{ backgroundColor: checkItems[i] ? '#F0FDF4' : undefined }}
                >
                  {checkItems[i]
                    ? <CheckSquare size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
                    : <Square size={18} className="flex-shrink-0 mt-0.5 text-gray-300" />
                  }
                  <span className={`text-sm leading-snug ${checkItems[i] ? 'text-emerald-700 line-through' : 'text-gray-700'}`}>
                    {item}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCompletarChecklist}
            disabled={!todosCheck}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: '#2AABBF' }}
          >
            {modulo.evaluacion.length > 0
              ? <>Ir a evaluación <ChevronRight size={15} /></>
              : <>Finalizar módulo <CheckCircle2 size={15} /></>}
          </button>

          {!todosCheck && (
            <p className="text-center text-xs text-gray-400">
              Marca todos los puntos para continuar
            </p>
          )}
        </div>
      )}

      {/* ── FASE: EVALUACIÓN ─────────────────────────────── */}
      {fase === 'evaluacion' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold mb-1" style={{ color: '#1B2B4B' }}>Evaluación</h2>
            <p className="text-sm text-gray-400 mb-5">Responde correctamente al menos 70% para aprobar</p>

            <div className="space-y-6">
              {modulo.evaluacion.map((pregunta, qi) => (
                <div key={qi}>
                  <p className="text-sm font-medium mb-3" style={{ color: '#1B2B4B' }}>
                    {qi + 1}. {pregunta.pregunta}
                  </p>
                  <div className="space-y-2">
                    {pregunta.opciones.map((opcion, oi) => {
                      const seleccionada = respuestas[qi] === oi
                      return (
                        <button
                          key={oi}
                          onClick={() => {
                            const next = [...respuestas]
                            next[qi] = oi
                            setRespuestas(next)
                          }}
                          className="w-full text-left px-4 py-3 rounded-xl border text-sm transition-all"
                          style={{
                            borderColor: seleccionada ? '#2AABBF' : '#E5E7EB',
                            backgroundColor: seleccionada ? '#EBF8FB' : 'white',
                            color: seleccionada ? '#0D6E80' : '#374151',
                          }}
                        >
                          <span className="font-medium mr-2 text-xs"
                            style={{ color: seleccionada ? '#2AABBF' : '#9CA3AF' }}>
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          {opcion}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
          )}

          <button
            onClick={handleEnviarEvaluacion}
            disabled={!todasRespondidas || isPending}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: '#2AABBF' }}
          >
            {isPending
              ? <><RefreshCw size={15} className="animate-spin" /> Enviando...</>
              : <><CheckCircle2 size={15} /> Enviar respuestas</>}
          </button>

          {!todasRespondidas && (
            <p className="text-center text-xs text-gray-400">
              Responde todas las preguntas para continuar ({respuestas.filter(r => r !== null).length}/{modulo.evaluacion.length})
            </p>
          )}
        </div>
      )}

      {/* ── FASE: RESULTADO ──────────────────────────────── */}
      {fase === 'resultado' && resultado && (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            resultado.aprobado ? 'bg-emerald-100' : 'bg-amber-100'
          }`}>
            {resultado.aprobado
              ? <Award size={36} style={{ color: '#059669' }} />
              : <RefreshCw size={36} style={{ color: '#D97706' }} />
            }
          </div>

          <h2 className={`text-xl font-bold mb-1 ${resultado.aprobado ? 'text-emerald-700' : 'text-amber-700'}`}>
            {resultado.aprobado ? '¡Módulo aprobado!' : 'Sigue practicando'}
          </h2>

          <p className="text-3xl font-black my-3" style={{ color: resultado.aprobado ? '#059669' : '#D97706' }}>
            {resultado.score}%
          </p>

          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            {resultado.aprobado
              ? modulo.competencia
                ? `Has avanzado en la competencia "${modulo.competencia.nombre}". Solicita validación al coordinador para completarla.`
                : 'Has completado y aprobado este módulo de capacitación.'
              : 'Necesitas 70% para aprobar. Puedes repetir el módulo cuando quieras.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!resultado.aprobado && (
              <button
                onClick={() => {
                  setFase('inicio')
                  setRespuestas(new Array(modulo.evaluacion.length).fill(null))
                  setCheckItems(new Array(modulo.checklist.length).fill(false))
                  setResultado(null)
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <RefreshCw size={14} /> Repetir módulo
              </button>
            )}
            <Link
              href="/enfermero/capacitaciones"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#2AABBF' }}
            >
              <ChevronRight size={14} /> Ver todas las capacitaciones
            </Link>
          </div>
        </div>
      )}

      {/* Resultado vacío / aprobado previo sin datos */}
      {fase === 'resultado' && !resultado && (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
          <h2 className="font-bold text-lg mb-2 text-emerald-700">Módulo completado</h2>
          <Link
            href="/enfermero/capacitaciones"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mt-3"
            style={{ backgroundColor: '#2AABBF' }}
          >
            Ver todas las capacitaciones
          </Link>
        </div>
      )}
    </div>
  )
}
