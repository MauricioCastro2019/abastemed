import { getPaciente }                    from '@/lib/actions/pacientes'
import { getCasosByPaciente }             from '@/lib/actions/casos'
import { getAlertasActivasByCaso }        from '@/lib/actions/alertas-activas'
import { getPendientesActivos }           from '@/lib/actions/pendientes-caso'
import { getEquipoCuidadoByPaciente }     from '@/lib/actions/equipo-cuidado'
import { getPlanActivo }                  from '@/lib/actions/plan-atencion'
import { getAccionesToday, getResumenNai, getTimelineNai } from '@/lib/actions/acciones-nai'
import { getCompetenciasRequeridasPaciente } from '@/lib/actions/competencias/paciente-competencias.actions'
import { getCompetenciasCatalogo } from '@/lib/actions/competencias/competencias.actions'
import { RealtimeRefresh }                from '@/components/RealtimeRefresh'
import { CompetenciasRequeridasWidget }   from './CompetenciasRequeridasWidget'
import Link        from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft, ClipboardList, Users, Brain,
  AlertTriangle, CheckCircle2, Clock, Circle,
  ChevronRight, Plus, Zap, Activity, Pill,
  Heart, Stethoscope, Utensils, Droplets,
  MoveHorizontal, MessageSquare, RotateCcw,
  CalendarClock, ShieldAlert
} from 'lucide-react'
import type {
  Accion, AlertaActiva, PendienteCaso,
  TipoPlanItem, SemaforoNAI,
} from '@/types'
import {
  TIPO_PLAN_ITEM_CONFIG as TIPO_CONFIG,
  ESTADO_ACCION_CONFIG  as ESTADO_CONFIG,
} from '@/types'

// ─── Helpers ──────────────────────────────────────────────────

function calcEdad(fechaNac: string) {
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let e = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--
  return e
}

function formatHora(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatRelativo(iso: string | null | undefined) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function calcSemaforoNAI(
  alertas: AlertaActiva[],
  pendientes: PendienteCaso[],
  scoreHoy: number,
): SemaforoNAI {
  const alertasCriticas = alertas.filter(a => a.nivel === 'critico' && a.activa)
  if (alertasCriticas.length > 0) return 'critico'
  const alertasAltas = alertas.filter(a => a.nivel === 'alto' && a.activa)
  if (alertasAltas.length > 0 || scoreHoy < 50) return 'rojo'
  const pendientesUrgentes = pendientes.filter(p => p.prioridad === 'urgente' && p.estado !== 'resuelto')
  if (pendientesUrgentes.length > 0 || scoreHoy < 75) return 'amarillo'
  return 'verde'
}

const SEMAFORO_CONFIG: Record<SemaforoNAI, { label: string; color: string; bg: string; border: string }> = {
  verde:   { label: 'Estable',          color: '#059669', bg: '#ECFDF5', border: '#86efac' },
  amarillo:{ label: 'Seguimiento',      color: '#d97706', bg: '#FEF3C7', border: '#fcd34d' },
  rojo:    { label: 'Atención urgente', color: '#dc2626', bg: '#FEF2F2', border: '#fca5a5' },
  critico: { label: 'CRÍTICO',          color: '#7c2d12', bg: '#FFF1F2', border: '#f87171' },
}

// Icono por tipo de acción
function TipoIcon({ tipo, size = 14 }: { tipo: TipoPlanItem; size?: number }) {
  const props = { size, strokeWidth: 2 }
  const map: Record<TipoPlanItem, React.ReactNode> = {
    medicamento:  <Pill {...props} />,
    rutina:       <Heart {...props} />,
    monitoreo:    <Activity {...props} />,
    procedimiento:<Stethoscope {...props} />,
    nutricion:    <Utensils {...props} />,
    eliminacion:  <Droplets {...props} />,
    movilidad:    <MoveHorizontal {...props} />,
    comunicacion: <MessageSquare {...props} />,
  }
  return <>{map[tipo]}</>
}

// Tarjeta de acción individual
function AccionCard({ accion }: { accion: Accion }) {
  const tipoConf  = TIPO_CONFIG[accion.tipo]
  const estadoConf = ESTADO_CONFIG[accion.estado]
  const esRealizada = accion.estado === 'realizada' || accion.estado === 'verificada'
  const esOmitida   = accion.estado === 'omitida'  || accion.estado === 'rechazada'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${esOmitida ? 'opacity-50' : ''}`}
      style={{
        borderColor: esRealizada ? '#86efac' : esOmitida ? '#fca5a5' : '#e5e7eb',
        backgroundColor: esRealizada ? '#f0fdf4' : esOmitida ? '#fff5f5' : 'white',
      }}>

      {/* Ícono tipo */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: tipoConf.bg, color: tipoConf.color }}>
        <TipoIcon tipo={accion.tipo} size={15} />
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${esRealizada ? 'line-through text-gray-400' : 'text-[#1B2B4B]'}`}>
          {accion.nombre}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{tipoConf.label}</span>
          {accion.programada_para && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={10} />
                {formatHora(accion.programada_para)}
              </span>
            </>
          )}
          {accion.observaciones && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400 truncate max-w-32">{accion.observaciones}</span>
            </>
          )}
        </div>
      </div>

      {/* Estado */}
      <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: estadoConf.bg, color: estadoConf.color }}>
        {estadoConf.label}
      </span>
    </div>
  )
}

// Evento de timeline
function TimelineEvent({ evento }: { evento: Record<string, unknown> }) {
  const TIPO_EVENTO_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    accion:       { icon: <CheckCircle2 size={13} />, color: '#059669', label: 'Acción' },
    incidencia:   { icon: <AlertTriangle size={13} />, color: '#dc2626', label: 'Incidencia' },
    hallazgo:     { icon: <Activity size={13} />, color: '#d97706', label: 'Hallazgo' },
    entrega_turno:{ icon: <RotateCcw size={13} />, color: '#7c3aed', label: 'Entrega' },
  }
  const conf = TIPO_EVENTO_CONFIG[evento.tipo_evento as string] ??
    { icon: <Circle size={13} />, color: '#6b7280', label: String(evento.tipo_evento) }

  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: `${conf.color}15`, color: conf.color }}>
        {conf.icon}
      </div>
      <div className="flex-1 min-w-0 pb-3 border-b border-gray-50">
        <p className="text-sm text-[#1B2B4B] line-clamp-2">{evento.texto as string}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-medium" style={{ color: conf.color }}>{conf.label}</span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400">{formatRelativo(evento.evento_at as string)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────

export default async function NaiHubPage({ params }: { params: { id: string } }) {
  let paciente
  try { paciente = await getPaciente(params.id) }
  catch { notFound() }

  const casos     = await getCasosByPaciente(params.id)
  const casoActivo = casos.find(c => c.status === 'activo') ?? casos[0] ?? null

  const [
    planActivo,
    accionesHoy,
    alertasActivas,
    pendientesActivos,
    equipoCuidado,
    timelineData,
    competenciasRequeridas,
    competenciasCatalogo,
  ] = await Promise.all([
    getPlanActivo(params.id),
    getAccionesToday(params.id),
    casoActivo ? getAlertasActivasByCaso(casoActivo.id)  : Promise.resolve([]),
    casoActivo ? getPendientesActivos(casoActivo.id)     : Promise.resolve([]),
    getEquipoCuidadoByPaciente(params.id).catch(() => ({ activos: [], historial: [] })),
    getTimelineNai(params.id, 20),
    getCompetenciasRequeridasPaciente(params.id).catch(() => []),
    getCompetenciasCatalogo(true).catch(() => []),
  ])

  const resumenNai = await getResumenNai(params.id)
  const edad       = calcEdad(paciente.fecha_nacimiento)
  const semaforo   = calcSemaforoNAI(alertasActivas, pendientesActivos, resumenNai.score_cumplimiento)
  const semConf    = SEMAFORO_CONFIG[semaforo]

  const accionesRealizadas = accionesHoy.filter(a => a.estado === 'realizada' || a.estado === 'verificada')
  const accionesPendientes = accionesHoy.filter(a => a.estado === 'pendiente' || a.estado === 'en_proceso' || a.estado === 'proxima')
  const accionesOmitidas   = accionesHoy.filter(a => a.estado === 'omitida'   || a.estado === 'rechazada')
  const equipo             = (equipoCuidado as { activos: { enfermero?: { nombre: string; apellido: string } }[] }).activos ?? []
  const alertasActivasHoy  = alertasActivas.filter(a => a.activa)
  const pendientesUrgentes = pendientesActivos.filter(p => p.prioridad === 'urgente' || p.prioridad === 'alta')

  const diasDeServicio = casoActivo?.fecha_inicio
    ? Math.floor((Date.now() - new Date(casoActivo.fecha_inicio).getTime()) / 86400000)
    : null

  return (
    <div className="space-y-5 max-w-6xl">
      <RealtimeRefresh tables={['acciones', 'alertas_activas', 'pendientes_caso']} />

      {/* ── BARRA DE IDENTIDAD ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/pacientes" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
              <ArrowLeft size={18} />
            </Link>
            {/* Avatar con semáforo */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                style={{ backgroundColor: '#1B2B4B' }}>
                {paciente.nombre[0]}{paciente.apellido[0]}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${semaforo !== 'verde' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: semConf.color }}
              />
            </div>
            {/* Datos */}
            <div>
              <h1 className="text-2xl font-bold text-[#1B2B4B]">
                {paciente.nombre} {paciente.apellido}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-gray-500">
                <span>{edad} años</span>
                <span className="text-gray-200">·</span>
                <span>{paciente.diagnostico}</span>
                {diasDeServicio !== null && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span>{diasDeServicio} días de servicio</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border"
                  style={{ backgroundColor: semConf.bg, color: semConf.color, borderColor: semConf.border }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${semaforo !== 'verde' ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: semConf.color }} />
                  {semConf.label}
                </span>
                {alertasActivasHoy.length > 0 && (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-red-50 text-red-600 border border-red-200">
                    <ShieldAlert size={10} />
                    {alertasActivasHoy.length} alerta{alertasActivasHoy.length > 1 ? 's' : ''} activa{alertasActivasHoy.length > 1 ? 's' : ''}
                  </span>
                )}
                {paciente.tipo_sanguineo ? (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Droplets size={10} />
                    Tipo {paciente.tipo_sanguineo}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                    <Droplets size={10} />
                    Falta tipo sanguíneo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/pacientes/${params.id}/plan`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <ClipboardList size={13} />
              Plan de Atención
            </Link>
            <Link href={`/pacientes/${params.id}/memoria`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Brain size={13} />
              Memoria Operativa
            </Link>
            <Link href={`/pacientes/${params.id}/equipo`}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Users size={13} />
              Equipo
            </Link>
          </div>
        </div>

        {/* Score de cumplimiento */}
        {accionesHoy.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Cumplimiento hoy</span>
              <span className="text-xs font-bold" style={{ color: resumenNai.score_cumplimiento >= 80 ? '#059669' : resumenNai.score_cumplimiento >= 50 ? '#d97706' : '#dc2626' }}>
                {resumenNai.score_cumplimiento}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${resumenNai.score_cumplimiento}%`,
                  backgroundColor: resumenNai.score_cumplimiento >= 80 ? '#059669' : resumenNai.score_cumplimiento >= 50 ? '#d97706' : '#dc2626',
                }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{accionesRealizadas.length} realizadas</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />{accionesPendientes.length} pendientes</span>
              {accionesOmitidas.length > 0 && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{accionesOmitidas.length} omitidas</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── GRID PRINCIPAL ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── COLUMNA IZQUIERDA (2/3) ────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* COLA DE HOY */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={16} style={{ color: '#2AABBF' }} />
                <h2 className="font-semibold text-[#1B2B4B]">Cola de hoy</h2>
                {accionesHoy.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {accionesPendientes.length} pendientes
                  </span>
                )}
              </div>
              <Link href={`/pacientes/${params.id}/plan`}
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: '#2AABBF' }}>
                <Plus size={12} /> Acción manual
              </Link>
            </div>

            <div className="p-4">
              {accionesHoy.length === 0 ? (
                <div className="text-center py-8">
                  {planActivo ? (
                    <div className="space-y-2">
                      <Clock size={28} className="mx-auto text-gray-200" />
                      <p className="text-sm text-gray-400">Sin acciones programadas para hoy.</p>
                      <p className="text-xs text-gray-300">Las acciones se generan al iniciar el turno.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ClipboardList size={28} className="mx-auto text-gray-200" />
                      <p className="text-sm text-gray-500 font-medium">Sin plan de atención activo</p>
                      <Link href={`/pacientes/${params.id}/plan`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg text-white"
                        style={{ backgroundColor: '#2AABBF' }}>
                        <Plus size={13} /> Crear Plan de Atención
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Pendientes primero */}
                  {accionesPendientes.length > 0 && (
                    <div className="space-y-2">
                      {accionesPendientes.map(a => <AccionCard key={a.id} accion={a} />)}
                    </div>
                  )}
                  {/* Realizadas (colapsadas visualmente) */}
                  {accionesRealizadas.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-50">
                      <p className="text-xs text-gray-400 font-medium mb-2">Completadas ({accionesRealizadas.length})</p>
                      {accionesRealizadas.slice(0, 3).map(a => <AccionCard key={a.id} accion={a} />)}
                      {accionesRealizadas.length > 3 && (
                        <p className="text-xs text-gray-400 text-center pt-1">
                          +{accionesRealizadas.length - 3} más completadas
                        </p>
                      )}
                    </div>
                  )}
                  {/* Omitidas */}
                  {accionesOmitidas.length > 0 && (
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-red-50">
                      <p className="text-xs text-red-400 font-medium mb-2">Omitidas ({accionesOmitidas.length})</p>
                      {accionesOmitidas.map(a => <AccionCard key={a.id} accion={a} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PLAN DE ATENCIÓN — resumen */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} style={{ color: '#1B2B4B' }} />
                <h2 className="font-semibold text-[#1B2B4B]">Plan de atención</h2>
                {planActivo && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                    Activo
                  </span>
                )}
              </div>
              <Link href={`/pacientes/${params.id}/plan`}
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: '#2AABBF' }}>
                {planActivo ? 'Editar plan' : 'Crear plan'} <ChevronRight size={12} />
              </Link>
            </div>

            <div className="p-4">
              {!planActivo ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400">Sin plan de atención.</p>
                  <Link href={`/pacientes/${params.id}/plan`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#1B2B4B' }}>
                    <Plus size={13} /> Construir plan
                  </Link>
                </div>
              ) : (
                <div>
                  {planActivo.notas_generales && (
                    <p className="text-sm text-gray-500 mb-3 italic">{planActivo.notas_generales}</p>
                  )}
                  {(planActivo.plan_items ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Plan sin ítems aún.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(planActivo.plan_items ?? []).filter(i => i.activo).map(item => {
                        const conf = TIPO_CONFIG[item.tipo]
                        return (
                          <div key={item.id}
                            className="flex items-center gap-2.5 p-2.5 rounded-lg border"
                            style={{ borderColor: `${conf.color}30`, backgroundColor: conf.bg }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${conf.color}20`, color: conf.color }}>
                              <TipoIcon tipo={item.tipo} size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: '#1B2B4B' }}>
                                {item.nombre}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.frecuencia.replace(/_/g, ' ')}
                                {item.horarios.length > 0 && ` · ${item.horarios.join(', ')}`}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-400">
                    <span>{(planActivo.plan_items ?? []).filter(i => i.activo).length} ítems activos</span>
                    <span>v{planActivo.version}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CRONOLOGÍA */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} style={{ color: '#1B2B4B' }} />
                <h2 className="font-semibold text-[#1B2B4B]">Cronología reciente</h2>
              </div>
              <Link href={`/pacientes/${params.id}/memoria`}
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: '#2AABBF' }}>
                Ver todo <ChevronRight size={12} />
              </Link>
            </div>
            <div className="p-4">
              {timelineData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sin eventos registrados aún.</p>
              ) : (
                <div className="space-y-1">
                  {timelineData.slice(0, 8).map((e, i) => (
                    <TimelineEvent key={i} evento={e} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA (1/3) ─────────────────────── */}
        <div className="space-y-4">

          {/* PRÓXIMA ACCIÓN */}
          {resumenNai.proxima && (
            <div className="rounded-2xl border-2 p-4"
              style={{ borderColor: '#2AABBF30', backgroundColor: '#EBF8FB' }}>
              <p className="text-xs font-semibold text-[#2AABBF] uppercase tracking-wider mb-2">Próxima acción</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: TIPO_CONFIG[resumenNai.proxima.tipo].bg, color: TIPO_CONFIG[resumenNai.proxima.tipo].color }}>
                  <TipoIcon tipo={resumenNai.proxima.tipo} size={14} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1B2B4B]">{resumenNai.proxima.nombre}</p>
                  <p className="text-xs text-gray-500">{formatHora(resumenNai.proxima.programada_para)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ALERTAS ACTIVAS */}
          {alertasActivasHoy.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-red-50 flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-500" />
                <h3 className="text-sm font-semibold text-red-700">Alertas activas</h3>
                <span className="ml-auto text-xs font-bold text-white bg-red-500 w-5 h-5 rounded-full flex items-center justify-center">
                  {alertasActivasHoy.length}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {alertasActivasHoy.map(a => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-50">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                      a.nivel === 'critico' ? 'bg-red-700 text-white' : 'bg-red-200 text-red-700'
                    }`}>
                      {a.nivel.toUpperCase()}
                    </span>
                    <p className="text-xs text-red-800">{a.tipo.replace(/_/g, ' ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PENDIENTES URGENTES */}
          {pendientesUrgentes.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-50 flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-amber-700">Pendientes urgentes</h3>
              </div>
              <div className="p-3 space-y-2">
                {pendientesUrgentes.slice(0, 4).map(p => (
                  <div key={p.id} className="p-2 rounded-lg bg-amber-50">
                    <p className="text-xs font-medium text-amber-800">{p.titulo}</p>
                    {p.descripcion && (
                      <p className="text-xs text-amber-600 mt-0.5 line-clamp-2">{p.descripcion}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EQUIPO DE CUIDADO */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: '#1B2B4B' }} />
                <h3 className="text-sm font-semibold text-[#1B2B4B]">Equipo</h3>
              </div>
              <Link href={`/pacientes/${params.id}/equipo`}
                className="text-xs hover:underline" style={{ color: '#2AABBF' }}>
                Gestionar
              </Link>
            </div>
            <div className="p-3">
              {equipo.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">Sin equipo asignado</p>
              ) : (
                <div className="space-y-2">
                  {equipo.slice(0, 4).map((asig: { enfermero?: { nombre: string; apellido: string }; rol?: string; es_principal?: boolean }, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1B2B4B] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {asig.enfermero?.nombre?.[0]}{asig.enfermero?.apellido?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#1B2B4B] truncate">
                          {asig.enfermero?.nombre} {asig.enfermero?.apellido}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{asig.rol?.replace(/_/g, ' ')}</p>
                      </div>
                      {asig.es_principal && (
                        <span className="text-xs text-[#2AABBF]">★</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COMPETENCIAS REQUERIDAS */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <ShieldAlert size={14} style={{ color: '#1B2B4B' }} />
              <h3 className="text-sm font-semibold text-[#1B2B4B]">Competencias requeridas</h3>
            </div>
            <div className="p-3">
              <CompetenciasRequeridasWidget
                pacienteId={params.id}
                requeridas={competenciasRequeridas}
                catalogo={competenciasCatalogo}
              />
            </div>
          </div>

          {/* DATOS PERSONALES */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-[#1B2B4B]">Contacto familiar</h3>
            </div>
            <div className="p-3 space-y-2 text-xs text-gray-600">
              <p className="font-medium">{paciente.contacto_familiar?.nombre}</p>
              <p className="text-gray-400">{paciente.contacto_familiar?.relacion}</p>
              {paciente.contacto_familiar?.telefono && (
                <a href={`tel:${paciente.contacto_familiar.telefono}`}
                  className="flex items-center gap-1.5 text-[#2AABBF] hover:underline">
                  📞 {paciente.contacto_familiar.telefono}
                </a>
              )}
            </div>
          </div>

          {/* INFO DEL CASO */}
          {casoActivo && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1B2B4B]">Caso activo</h3>
                <Link href={`/casos/${casoActivo.id}`}
                  className="text-xs hover:underline" style={{ color: '#2AABBF' }}>
                  Ver caso
                </Link>
              </div>
              <div className="p-3 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-[#1B2B4B]">{casoActivo.titulo}</p>
                <p>{casoActivo.contexto.replace(/_/g, ' ')}</p>
                {casoActivo.horario_inicio && (
                  <p>{casoActivo.horario_inicio} – {casoActivo.horario_fin} · {casoActivo.horas_turno}h</p>
                )}
                <p className="text-gray-400">{casoActivo.direccion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
