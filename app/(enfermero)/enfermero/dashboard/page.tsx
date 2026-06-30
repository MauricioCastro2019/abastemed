import { getCentroProfesionalData } from '@/lib/actions/centro-profesional'
import { getEquipoCuidadoByEnfermero } from '@/lib/actions/equipo-cuidado'
import { getConteoNoLeidas } from '@/lib/actions/notificaciones'
import { RealtimeRefresh } from '@/components/RealtimeRefresh'
import Link from 'next/link'
import {
  Calendar, Clock, MapPin, Star, TrendingUp, Award,
  BookOpen, AlertTriangle, ChevronRight, Zap, CheckCircle2,
  ArrowRight, Shield, Heart, Users, Bell
} from 'lucide-react'

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

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

const ESTADO_MODULO_CONFIG = {
  no_iniciado:  { label: 'Pendiente',    color: '#94A3B8', bg: '#F1F5F9' },
  en_progreso:  { label: 'En progreso',  color: '#D97706', bg: '#FFFBEB' },
  completado:   { label: 'Completado',   color: '#0284C7', bg: '#E0F2FE' },
  aprobado:     { label: 'Aprobado',     color: '#059669', bg: '#ECFDF5' },
}

export default async function EnfermeroDashboardPage() {
  const [data, equipoData, notifCount] = await Promise.all([
    getCentroProfesionalData(),
    getEquipoCuidadoByEnfermero().catch(() => ({ activos: [], pendientes: [], historial: [] })),
    getConteoNoLeidas().catch(() => 0),
  ])

  if (!data) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="text-amber-500" size={28} />
          </div>
          <h2 className="font-semibold text-[#1B2B4B]">Perfil no vinculado</h2>
          <p className="text-sm text-gray-500">
            Tu cuenta aún no está vinculada a un perfil de enfermero. Contacta al administrador para completar tu registro.
          </p>
        </div>
      </div>
    )
  }

  const {
    enfermero,
    nivel_actual,
    siguiente_nivel,
    progreso_nivel_pct,
    estadisticas,
    proxima_guardia,
    guardia_activa,
    modulos_obligatorios_pendientes,
    modulos_sugeridos,
    mensaje_cultural,
  } = data

  const guardiaDestacada = guardia_activa ?? proxima_guardia
  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      <RealtimeRefresh tables={['turnos']} />

      {/* ── SALUDO ──────────────────────────────────────────── */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
          Hola, {enfermero.nombre}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{hoy}</p>
        <p className="text-sm italic text-gray-400 mt-2 leading-relaxed border-l-2 pl-3" style={{ borderColor: '#2AABBF' }}>
          &ldquo;{mensaje_cultural}&rdquo;
        </p>
      </div>

      {/* ── BANNER NOTIFICACIONES NO LEÍDAS ─────────────────── */}
      {notifCount > 0 && (
        <Link href="/enfermero/notificaciones"
          className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm"
          style={{ backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }}>
          <div className="relative flex-shrink-0">
            <Bell size={18} style={{ color: '#4F46E5' }} />
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full text-white text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: '#EF4444', fontSize: 9 }}>
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          </div>
          <p className="text-sm font-semibold flex-1" style={{ color: '#3730A3' }}>
            Tienes {notifCount} notificación{notifCount !== 1 ? 'es' : ''} sin leer
          </p>
          <ChevronRight size={14} style={{ color: '#6366F1' }} />
        </Link>
      )}

      {/* ── BANNER PENDIENTE DE APROBACIÓN ──────────────────── */}
      {!enfermero.disponible && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Cuenta pendiente de aprobación</p>
            <p className="text-xs text-amber-600 mt-0.5">
              El administrador revisará tu perfil pronto. Una vez aprobado, comenzarás a recibir guardias asignadas.
            </p>
          </div>
        </div>
      )}

      {/* ── GUARDIA DESTACADA ───────────────────────────────── */}
      {guardiaDestacada ? (
        <div className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #0D3B5E 100%)' }}>
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: '#2AABBF' }}>
                  {guardia_activa ? '● Guardia en curso' : 'Próxima guardia'}
                </span>
                <h2 className="text-white font-bold text-lg mt-1 leading-tight">
                  {(guardiaDestacada.caso as { paciente?: { nombre: string; apellido: string }; titulo?: string })?.paciente
                    ? `${(guardiaDestacada.caso as { paciente?: { nombre: string; apellido: string } })?.paciente?.nombre} ${(guardiaDestacada.caso as { paciente?: { nombre: string; apellido: string } })?.paciente?.apellido}`
                    : (guardiaDestacada.caso as { titulo?: string })?.titulo ?? 'Guardia asignada'}
                </h2>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(42,171,191,0.2)' }}>
                <Calendar size={20} style={{ color: '#2AABBF' }} />
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Clock size={14} className="flex-shrink-0" />
                <span>{formatFecha(guardiaDestacada.fecha_inicio)}</span>
                <span className="text-white/40">—</span>
                <span>{new Date(guardiaDestacada.fecha_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {(guardiaDestacada.caso as { direccion?: string })?.direccion && (
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <MapPin size={14} className="flex-shrink-0" />
                  <span className="truncate">{(guardiaDestacada.caso as { direccion?: string })?.direccion}</span>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href={`/enfermero/turnos/${guardiaDestacada.id}/preparacion`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: '#2AABBF', color: 'white' }}
              >
                <Shield size={15} />
                Prepararme para esta guardia
              </Link>
              {guardia_activa && (
                <Link
                  href={`/enfermero/turnos/${guardia_activa.id}/entrega`}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-white/80 hover:text-white transition-all sm:flex-shrink-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <CheckCircle2 size={15} />
                  Registrar reporte
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center border-2 border-dashed border-gray-100">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Calendar size={22} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-600 text-sm">Sin guardias asignadas</p>
          <p className="text-xs text-gray-400 mt-1">
            Mientras tanto, avanza en tus capacitaciones para desbloquear oportunidades.
          </p>
          {modulos_obligatorios_pendientes.length > 0 && (
            <Link
              href="/enfermero/capacitaciones"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium"
              style={{ color: '#2AABBF' }}
            >
              Comenzar inducción <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* ── MIS PACIENTES ───────────────────────────────────── */}
      {(equipoData.activos.length > 0 || equipoData.pendientes.length > 0) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart size={15} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                Mis pacientes
              </h2>
            </div>
            <Link href="/enfermero/mis-pacientes"
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: '#2AABBF' }}>
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>

          {equipoData.pendientes.length > 0 && (
            <Link href="/enfermero/mis-pacientes"
              className="flex items-center gap-3 p-3 rounded-xl mb-3 border-2"
              style={{ backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }}>
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-700 flex-1">
                {equipoData.pendientes.length} invitación{equipoData.pendientes.length !== 1 ? 'es' : ''} pendiente{equipoData.pendientes.length !== 1 ? 's' : ''} de aceptar
              </p>
              <ChevronRight size={14} className="text-amber-500" />
            </Link>
          )}

          <div className="space-y-2">
            {equipoData.activos.slice(0, 3).map(a => {
              const p = a.paciente
              if (!p) return null
              return (
                <Link key={a.id} href={`/pacientes/${p.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-[#2AABBF] transition-all group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: '#1B2B4B' }}>
                    {p.nombre[0]}{p.apellido[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate group-hover:text-[#1B2B4B]">
                      {p.nombre} {p.apellido}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{a.rol}</p>
                  </div>
                  <ChevronRight size={13} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors" />
                </Link>
              )
            })}
          </div>

          {equipoData.activos.length > 3 && (
            <Link href="/enfermero/mis-pacientes"
              className="mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl border border-gray-100 text-gray-500 hover:text-[#2AABBF] hover:border-[#2AABBF] transition-all">
              <Users size={11} /> Ver {equipoData.activos.length - 3} más
            </Link>
          )}
        </div>
      )}

      {/* ── ESTADÍSTICAS ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Nivel actual',
            value: `N${nivel_actual.orden}`,
            sub: nivel_actual.nombre.split(' ')[0],
            color: nivel_actual.color,
            bg: nivel_actual.color + '18',
            icon: Award,
          },
          {
            label: 'Horas acumuladas',
            value: `${estadisticas.horas_acumuladas}h`,
            sub: 'en servicio',
            color: '#2AABBF',
            bg: '#EBF8FB',
            icon: Clock,
          },
          {
            label: 'Guardias',
            value: estadisticas.guardias_completadas,
            sub: 'completadas',
            color: '#059669',
            bg: '#ECFDF5',
            icon: Calendar,
          },
          {
            label: 'Rating',
            value: estadisticas.promedio_rating > 0 ? estadisticas.promedio_rating.toFixed(1) : '—',
            sub: '/ 5.0',
            color: '#D97706',
            bg: '#FFFBEB',
            icon: Star,
          },
        ].map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{ backgroundColor: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-xl font-bold leading-none" style={{ color: '#1B2B4B' }}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
            <p className="text-xs text-gray-300 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── PROGRESO DE NIVEL ───────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: nivel_actual.color }} />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Nivel {nivel_actual.orden}
              </span>
            </div>
            <h3 className="font-bold mt-0.5" style={{ color: '#1B2B4B' }}>
              {nivel_actual.nombre}
            </h3>
            {nivel_actual.descripcion && (
              <p className="text-xs text-gray-400 mt-0.5">{nivel_actual.descripcion}</p>
            )}
          </div>
          <Link href="/enfermero/competencias"
            className="flex items-center gap-1 text-xs font-medium flex-shrink-0"
            style={{ color: '#2AABBF' }}>
            Ver competencias <ChevronRight size={13} />
          </Link>
        </div>

        {/* Barra de progreso */}
        {siguiente_nivel && (
          <>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>Progreso al {siguiente_nivel.nombre}</span>
              <span className="font-semibold" style={{ color: nivel_actual.color }}>
                {progreso_nivel_pct}%
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progreso_nivel_pct}%`,
                  backgroundColor: nivel_actual.color,
                }}
              />
            </div>

            {/* Requisitos del siguiente nivel */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {siguiente_nivel.guardias_minimas > 0 && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Guardias</p>
                  <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                    {estadisticas.guardias_completadas}
                    <span className="text-gray-400 font-normal"> / {siguiente_nivel.guardias_minimas}</span>
                  </p>
                </div>
              )}
              {siguiente_nivel.horas_minimas > 0 && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Horas en servicio</p>
                  <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                    {estadisticas.horas_acumuladas}h
                    <span className="text-gray-400 font-normal"> / {siguiente_nivel.horas_minimas}h</span>
                  </p>
                </div>
              )}
              {siguiente_nivel.competencias_minimas > 0 && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Competencias</p>
                  <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                    {estadisticas.competencias_verificadas}
                    <span className="text-gray-400 font-normal"> / {siguiente_nivel.competencias_minimas}</span>
                  </p>
                </div>
              )}
              {siguiente_nivel.evaluacion_minima > 0 && (
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400">Rating mínimo</p>
                  <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                    {estadisticas.promedio_rating > 0 ? estadisticas.promedio_rating.toFixed(1) : '—'}
                    <span className="text-gray-400 font-normal"> / {siguiente_nivel.evaluacion_minima}</span>
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {!siguiente_nivel && (
          <div className="text-center py-2">
            <p className="text-sm font-semibold" style={{ color: '#059669' }}>
              ¡Has alcanzado el nivel más alto! 🎖
            </p>
          </div>
        )}
      </div>

      {/* ── PENDIENTES URGENTES ─────────────────────────────── */}
      {modulos_obligatorios_pendientes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} style={{ color: '#D97706' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              Pendientes para desbloquear guardias
            </h2>
          </div>
          <div className="space-y-2">
            {modulos_obligatorios_pendientes.slice(0, 3).map(modulo => (
              <Link
                key={modulo.id}
                href={`/enfermero/capacitaciones/${modulo.id}`}
                className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 hover:bg-amber-100 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={15} className="text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900 truncate">{modulo.titulo}</p>
                  <p className="text-xs text-amber-600">{modulo.duracion_minutos} min · Obligatorio</p>
                </div>
                <ChevronRight size={15} className="text-amber-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── CAPACITACIONES SUGERIDAS ────────────────────────── */}
      {modulos_sugeridos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
                Capacitaciones disponibles
              </h2>
            </div>
            <Link
              href="/enfermero/capacitaciones"
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: '#2AABBF' }}
            >
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {modulos_sugeridos.map(modulo => {
              const progresoMod = modulo.progreso
              const estadoCfg = ESTADO_MODULO_CONFIG[progresoMod?.estado ?? 'no_iniciado']
              return (
                <Link
                  key={modulo.id}
                  href={`/enfermero/capacitaciones/${modulo.id}`}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group border border-transparent hover:border-gray-100"
                >
                  {/* Categoría */}
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
                    {CATEGORIA_LABELS[modulo.competencia?.categoria ?? ''] ?? modulo.competencia?.categoria ?? 'General'}
                  </span>

                  {/* Título */}
                  <h3 className="text-sm font-semibold mt-2 mb-1 leading-snug" style={{ color: '#1B2B4B' }}>
                    {modulo.titulo}
                  </h3>

                  {/* Duración */}
                  <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <Clock size={11} />
                    <span>{modulo.duracion_minutos} min</span>
                    {modulo.obligatorio && (
                      <span className="ml-1 font-medium text-amber-500">· Obligatorio</span>
                    )}
                  </div>

                  {/* Estado */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: estadoCfg.bg, color: estadoCfg.color }}>
                      {estadoCfg.label}
                    </span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
                  </div>

                  {/* Barra de progreso si está en curso */}
                  {progresoMod && progresoMod.progreso_pct > 0 && progresoMod.estado !== 'aprobado' && (
                    <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${progresoMod.progreso_pct}%`, backgroundColor: '#2AABBF' }}
                      />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ESTADO VACÍO: SIN MÓDULOS ────────────────────────── */}
      {modulos_sugeridos.length === 0 && modulos_obligatorios_pendientes.length === 0 && (
        <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100">
          <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
          <p className="font-semibold text-emerald-800 text-sm">¡Todas las capacitaciones al día!</p>
          <p className="text-xs text-emerald-600 mt-1">
            Mantén el ritmo. Nuevas capacitaciones se agregan periódicamente.
          </p>
        </div>
      )}
    </div>
  )
}
