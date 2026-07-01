import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, AlertTriangle, Pill, ClipboardList,
  Clock, Shield, Eye, CheckCircle2, Activity, Heart,
  MessageSquare, ChevronRight, Info
} from 'lucide-react'
import { getAccionesByTurno, generarAccionesParaTurno } from '@/lib/actions/acciones-nai'
import { ColaNaiSection } from './ColaNaiSection'

async function getTurnoConContexto(turnoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Turno con caso y paciente
  const { data: turno } = await supabase
    .from('turnos')
    .select(`
      *,
      caso:casos(
        id, titulo, direccion, contexto,
        paciente:pacientes(id, nombre, apellido, fecha_nacimiento, diagnostico, medicamentos, alergias, contacto_familiar)
      )
    `)
    .eq('id', turnoId)
    .single()

  if (!turno) return null

  const pacienteId = (turno.caso as { paciente?: { id: string } })?.paciente?.id
  const casoId = turno.caso_id

  if (!pacienteId || !casoId) return { turno, pacienteId: null, alertas: [], kardex: [], pendientes: [], vigilancias: [], manual: null, levantamiento: null }


  // Paralelo: alertas activas, kardex, pendientes, vigilancias, manual, levantamiento
  const [alertasRes, kardexRes, pendientesRes, vigilanciasRes, manualRes, levantamientoRes] = await Promise.allSettled([
    supabase
      .from('alertas_activas')
      .select('*')
      .eq('caso_id', casoId)
      .eq('activa', true),

    supabase
      .from('kardex_medicamentos')
      .select('*')
      .eq('caso_id', casoId)
      .eq('estatus', 'activo')
      .order('nombre'),

    supabase
      .from('pendientes_caso')
      .select('*')
      .eq('caso_id', casoId)
      .in('estado', ['pendiente', 'en_proceso'])
      .order('prioridad', { ascending: false })
      .limit(10),

    supabase
      .from('vigilancias_especiales')
      .select('*')
      .eq('caso_id', casoId)
      .eq('activa', true),

    supabase
      .from('manual_operativo_paciente')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('activo', true)
      .maybeSingle(),

    supabase
      .from('levantamientos_paciente')
      .select('diagnostico_principal, diagnosticos_secundarios, alergias, alergias_medicamentos, riesgo_final, riesgo_caida, usa_oxigeno, litros_oxigeno, dispositivo_oxigeno, usa_sonda, tipo_sonda, usa_cateter, tipo_cateter, alimentacion, movilidad, actividades_enfermeria, obs_clinicas, nivel_personal')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    turno,
    pacienteId,
    alertas:      alertasRes.status === 'fulfilled'      ? (alertasRes.value.data ?? [])      : [],
    kardex:       kardexRes.status === 'fulfilled'       ? (kardexRes.value.data ?? [])       : [],
    pendientes:   pendientesRes.status === 'fulfilled'   ? (pendientesRes.value.data ?? [])   : [],
    vigilancias:  vigilanciasRes.status === 'fulfilled'  ? (vigilanciasRes.value.data ?? [])  : [],
    manual:       manualRes.status === 'fulfilled'       ? manualRes.value.data               : null,
    levantamiento:levantamientoRes.status === 'fulfilled'? levantamientoRes.value.data        : null,
  }
}

const NIVEL_ALERTA_COLOR: Record<string, { border: string; bg: string; text: string }> = {
  bajo:     { border: '#34D399', bg: '#F0FDF4', text: '#065F46' },
  moderado: { border: '#FBBF24', bg: '#FFFBEB', text: '#92400E' },
  alto:     { border: '#F97316', bg: '#FFF7ED', text: '#9A3412' },
  critico:  { border: '#EF4444', bg: '#FEF2F2', text: '#991B1B' },
}

const TIPO_ALERTA_LABELS: Record<string, string> = {
  riesgo_caida:             '⚠ Riesgo de caída',
  riesgo_lesion_cutanea:    '⚠ Riesgo de lesión cutánea',
  riesgo_broncoaspiracion:  '⚠ Riesgo de broncoaspiración',
  riesgo_deshidratacion:    '⚠ Riesgo de deshidratación',
  riesgo_sepsis:            '⚠ Riesgo de sepsis',
  dolor_no_controlado:      '⚠ Dolor no controlado',
  otro:                     '⚠ Alerta activa',
}

function calcularEdad(fechaNac?: string): string {
  if (!fechaNac) return ''
  const años = Math.floor((Date.now() - new Date(fechaNac).getTime()) / (365.25 * 24 * 3600 * 1000))
  return `${años} años`
}

export default async function PreparacionGuardiaPage({ params }: { params: { id: string } }) {
  const ctx = await getTurnoConContexto(params.id)
  if (!ctx) notFound()

  const { turno, pacienteId, alertas, kardex, pendientes, vigilancias, manual, levantamiento } = ctx

  // Generar acciones NAI para este turno (idempotente — no duplica si ya existen)
  let accionesNai = [] as Awaited<ReturnType<typeof getAccionesByTurno>>
  if (pacienteId) {
    await generarAccionesParaTurno(params.id).catch(() => null)
    accionesNai = await getAccionesByTurno(params.id).catch(() => [])
  }
  const caso = turno.caso as {
    id: string; titulo: string; direccion: string; contexto: string;
    paciente?: { id: string; nombre: string; apellido: string; fecha_nacimiento?: string; diagnostico: string; medicamentos: string[]; alergias: string[]; contacto_familiar?: { nombre: string; telefono: string; relacion: string } }
  }
  const paciente = caso?.paciente

  if (!paciente) notFound()

  const edad = calcularEdad(paciente.fecha_nacimiento)

  // Checklist estándar (siempre visible)
  const checklistEstandar = [
    { label: 'Recibir turno y revisar pendientes del turno anterior', obligatorio: true },
    { label: 'Revisar el kardex de medicamentos', obligatorio: true },
    { label: 'Tomar y registrar signos vitales', obligatorio: true },
    { label: 'Verificar saturación de oxígeno si aplica', obligatorio: false },
    { label: 'Valoración general del estado del paciente', obligatorio: true },
    { label: 'Supervisar alimentación e hidratación', obligatorio: true },
    { label: 'Higiene del paciente según rutina', obligatorio: true },
    { label: 'Cambios posturales (mínimo cada 2h)', obligatorio: false },
    { label: 'Procedimientos indicados del día', obligatorio: false },
    { label: 'Registro completo en plataforma', obligatorio: true },
    { label: 'Entrega de turno al siguiente enfermero', obligatorio: true },
  ]

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-8">
      {/* Back */}
      <Link href="/enfermero/turnos"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
        <ArrowLeft size={15} /> Mis turnos
      </Link>

      {/* Header del turno */}
      <div className="rounded-2xl overflow-hidden shadow-sm"
        style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #0D3B5E 100%)' }}>
        <div className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#2AABBF' }}>
            Preparación para guardia
          </span>
          <h1 className="text-white font-bold text-xl mt-1">
            {paciente.nombre} {paciente.apellido}
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {edad && <span className="text-white/60 text-sm">{edad}</span>}
            <span className="text-white/40 text-sm">·</span>
            <span className="text-white/60 text-sm flex items-center gap-1">
              <Clock size={13} />
              {new Date(turno.fecha_inicio).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {caso.direccion && (
            <p className="text-white/50 text-xs mt-1">{caso.direccion}</p>
          )}
          <div className="flex gap-2 mt-4">
            <Link
              href={`/enfermero/turnos/${turno.id}/entrega`}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white/80 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <ClipboardList size={12} /> Registrar reporte
            </Link>
          </div>
        </div>
      </div>

      {/* ── COLA NAI ──────────────────────────────────── */}
      {pacienteId && (
        <ColaNaiSection
          accionesIniciales={accionesNai}
          pacienteId={pacienteId}
          turnoId={params.id}
        />
      )}

      {/* ── ALERTAS ACTIVAS ────────────────────────────── */}
      {alertas.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: '#1B2B4B' }}>
            <AlertTriangle size={15} style={{ color: '#EF4444' }} />
            Alertas activas en este caso
          </h2>
          <div className="space-y-2">
            {alertas.map((alerta: { id: string; tipo: string; nivel: string; descripcion?: string }) => {
              const colors = NIVEL_ALERTA_COLOR[alerta.nivel] ?? NIVEL_ALERTA_COLOR.moderado
              return (
                <div key={alerta.id} className="rounded-xl p-4 border-l-4"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                  <p className="text-sm font-semibold" style={{ color: colors.text }}>
                    {TIPO_ALERTA_LABELS[alerta.tipo] ?? alerta.tipo}
                  </p>
                  {alerta.descripcion && (
                    <p className="text-xs mt-0.5" style={{ color: colors.text + 'CC' }}>{alerta.descripcion}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── RESUMEN CLÍNICO ────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
          <User size={16} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Resumen del paciente</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Manual operativo si existe */}
          {manual?.resumen && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-teal-700 mb-1">Resumen operativo</p>
              <p className="text-sm text-teal-800 leading-relaxed">{manual.resumen}</p>
            </div>
          )}

          {/* Diagnóstico */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Diagnóstico principal</p>
            <p className="text-sm font-medium text-gray-800">
              {manual?.diagnosticos_relevantes?.[0] ?? levantamiento?.diagnostico_principal ?? paciente.diagnostico ?? 'No especificado'}
            </p>
            {(levantamiento?.diagnosticos_secundarios || manual?.diagnosticos_relevantes?.slice(1).length) && (
              <p className="text-xs text-gray-400 mt-1">
                {manual?.diagnosticos_relevantes?.slice(1).join(', ') ?? levantamiento?.diagnosticos_secundarios}
              </p>
            )}
          </div>

          {/* Alergias */}
          {(paciente.alergias?.length > 0 || levantamiento?.alergias || levantamiento?.alergias_medicamentos) && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-600 mb-1">⚠ Alergias</p>
              {paciente.alergias?.map((a: string, i: number) => (
                <p key={i} className="text-xs text-red-700">{a}</p>
              ))}
              {levantamiento?.alergias && <p className="text-xs text-red-700">{levantamiento.alergias}</p>}
              {levantamiento?.alergias_medicamentos && (
                <p className="text-xs text-red-700">Meds: {levantamiento.alergias_medicamentos}</p>
              )}
            </div>
          )}

          {/* Info del levantamiento */}
          {levantamiento && (
            <div className="grid grid-cols-2 gap-2">
              {levantamiento.riesgo_caida && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Riesgo de caída</p>
                  <p className="text-sm font-semibold capitalize" style={{ color: '#1B2B4B' }}>{levantamiento.riesgo_caida}</p>
                </div>
              )}
              {levantamiento.movilidad && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Movilidad</p>
                  <p className="text-sm font-semibold capitalize" style={{ color: '#1B2B4B' }}>{levantamiento.movilidad}</p>
                </div>
              )}
              {levantamiento.alimentacion && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Alimentación</p>
                  <p className="text-sm font-semibold capitalize" style={{ color: '#1B2B4B' }}>{levantamiento.alimentacion}</p>
                </div>
              )}
              {levantamiento.usa_oxigeno && (
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <p className="text-xs text-blue-500">Oxigenoterapia</p>
                  <p className="text-sm font-semibold text-blue-700">
                    {levantamiento.litros_oxigeno ? `${levantamiento.litros_oxigeno} L/min` : 'Activa'}
                    {levantamiento.dispositivo_oxigeno ? ` · ${levantamiento.dispositivo_oxigeno}` : ''}
                  </p>
                </div>
              )}
              {levantamiento.usa_sonda && (
                <div className="bg-amber-50 rounded-lg p-2.5">
                  <p className="text-xs text-amber-500">Sonda</p>
                  <p className="text-sm font-semibold text-amber-700">{levantamiento.tipo_sonda ?? 'Sí'}</p>
                </div>
              )}
              {levantamiento.usa_cateter && (
                <div className="bg-amber-50 rounded-lg p-2.5">
                  <p className="text-xs text-amber-500">Catéter</p>
                  <p className="text-sm font-semibold text-amber-700">{levantamiento.tipo_cateter ?? 'Sí'}</p>
                </div>
              )}
            </div>
          )}

          {/* Nivel de personal requerido */}
          {levantamiento?.nivel_personal && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-purple-700">Perfil requerido para este paciente</p>
              <p className="text-sm text-purple-800 mt-0.5">{levantamiento.nivel_personal}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MEDICAMENTOS ACTIVOS ─────────────────────── */}
      {kardex.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Pill size={16} style={{ color: '#7C3AED' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              Medicamentos activos ({kardex.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {kardex.map((med: { id: string; nombre: string; dosis?: string; via?: string; frecuencia?: string; horarios: string[]; medico?: string; observaciones?: string }) => (
              <div key={med.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>{med.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[med.dosis, med.via, med.frecuencia].filter(Boolean).join(' · ')}
                    </p>
                    {med.horarios?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {med.horarios.map((h: string, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {med.observaciones && (
                  <p className="text-xs text-gray-400 mt-1 italic">{med.observaciones}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VIGILANCIAS ESPECIALES ────────────────────── */}
      {vigilancias.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Eye size={16} style={{ color: '#F97316' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              Vigilancias especiales
            </h2>
          </div>
          <div className="p-5 space-y-3">
            {vigilancias.map((v: { id: string; parametro: string; frecuencia?: string; instrucciones?: string; descripcion?: string }) => (
              <div key={v.id} className="flex gap-3 bg-orange-50 rounded-xl p-3">
                <Activity size={15} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-orange-800 capitalize">
                    {v.parametro.replace(/_/g, ' ')}
                    {v.frecuencia && <span className="font-normal text-orange-600"> · {v.frecuencia.replace(/_/g, ' ')}</span>}
                  </p>
                  {v.instrucciones && <p className="text-xs text-orange-700 mt-0.5">{v.instrucciones}</p>}
                  {v.descripcion && <p className="text-xs text-orange-600 mt-0.5">{v.descripcion}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PENDIENTES DEL CASO ───────────────────────── */}
      {pendientes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <ClipboardList size={16} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              Pendientes del caso
            </h2>
          </div>
          <div className="p-5 space-y-2">
            {pendientes.map((p: { id: string; titulo: string; prioridad: string; descripcion?: string; estado: string }) => {
              const colors: Record<string, { dot: string; text: string }> = {
                urgente: { dot: '#EF4444', text: '#991B1B' },
                alta:    { dot: '#F97316', text: '#9A3412' },
                normal:  { dot: '#2AABBF', text: '#0D6E80' },
                baja:    { dot: '#9CA3AF', text: '#6B7280' },
              }
              const c = colors[p.prioridad] ?? colors.normal
              return (
                <div key={p.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: c.dot }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{p.titulo}</p>
                    {p.descripcion && <p className="text-xs text-gray-400 mt-0.5">{p.descripcion}</p>}
                    <p className="text-xs capitalize mt-0.5" style={{ color: c.text }}>{p.prioridad}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ACTIVIDADES DEL LEVANTAMIENTO ─────────────── */}
      {levantamiento?.actividades_enfermeria && levantamiento.actividades_enfermeria.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Heart size={16} style={{ color: '#EC4899' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              Actividades de enfermería indicadas
            </h2>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {levantamiento.actividades_enfermeria.map((act: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100">
                  {act}
                </span>
              ))}
            </div>
            {levantamiento.obs_clinicas && (
              <p className="text-xs text-gray-500 mt-3 italic">{levantamiento.obs_clinicas}</p>
            )}
          </div>
        </div>
      )}

      {/* ── MANUAL OPERATIVO: DETALLES ─────────────────── */}
      {manual && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Shield size={16} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Manual operativo</h2>
          </div>
          <div className="p-5 space-y-4">
            {manual.que_observar?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <Eye size={11} /> QUÉ OBSERVAR
                </p>
                <ul className="space-y-1">
                  {manual.que_observar.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-teal-400 flex-shrink-0">·</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {manual.que_reportar?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <MessageSquare size={11} /> QUÉ REPORTAR SIEMPRE
                </p>
                <ul className="space-y-1">
                  {manual.que_reportar.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-amber-400 flex-shrink-0">·</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {manual.que_evitar?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
                  <AlertTriangle size={11} /> QUÉ EVITAR
                </p>
                <ul className="space-y-1">
                  {manual.que_evitar.map((item: string, i: number) => (
                    <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="text-red-400 flex-shrink-0">·</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {manual.observaciones_trato && (
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                  <Info size={11} /> TRATO Y COMUNICACIÓN
                </p>
                <p className="text-sm text-blue-800">{manual.observaciones_trato}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTACTO FAMILIAR ─────────────────────────── */}
      {paciente.contacto_familiar && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Contacto de referencia</h2>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                {paciente.contacto_familiar.nombre}
              </p>
              <p className="text-xs text-gray-400">{paciente.contacto_familiar.relacion}</p>
              <p className="text-sm text-gray-600 mt-1">{paciente.contacto_familiar.telefono}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CHECKLIST ESTÁNDAR ───────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
          <CheckCircle2 size={16} style={{ color: '#059669' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Checklist del turno</h2>
        </div>
        <div className="p-5 space-y-2">
          {checklistEstandar.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                item.obligatorio ? 'bg-teal-100' : 'bg-gray-100'
              }`}>
                <div className={`w-2 h-2 rounded-full ${item.obligatorio ? 'bg-teal-500' : 'bg-gray-300'}`} />
              </div>
              <span className="text-sm text-gray-700 leading-snug">{item.label}</span>
              {item.obligatorio && (
                <span className="text-xs text-teal-600 ml-auto flex-shrink-0 font-medium">Obligatorio</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA final */}
      <div className="bg-gradient-to-r from-[#1B2B4B] to-[#0D3B5E] rounded-2xl p-5 text-center">
        <p className="text-white/60 text-xs mb-1">Mensaje de Abastemed</p>
        <p className="text-white text-sm italic leading-relaxed">
          &ldquo;No solo estás presente: estás sosteniendo una parte importante de la vida de alguien.&rdquo;
        </p>
        <Link
          href={`/enfermero/turnos/${params.id}/entrega`}
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#1B2B4B]"
          style={{ backgroundColor: '#2AABBF' }}
        >
          Ir a registrar el reporte <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  )
}
