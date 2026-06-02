import { getPaciente } from '@/lib/actions/pacientes'
import { getCasosByPaciente } from '@/lib/actions/casos'
import { getUltimoReporteByCaso } from '@/lib/actions/reportes-turno'
import { getKardexActivo } from '@/lib/actions/kardex'
import { getIncidenciasRecientes } from '@/lib/actions/incidencias'
import {
  ArrowLeft, Pencil, Phone, Mail, User, Pill, AlertTriangle,
  MapPin, ClipboardList, FileText, Clock, Activity, Heart,
  Zap, CheckCircle, FolderOpen, Plus, Stethoscope
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReporteTurno, KardexMedicamento, Incidencia, GravedadIncidencia, SignosVitalesReporte } from '@/types'

// ─── Helpers ────────────────────────────────────────────────
function calcEdad(fechaNac: string) {
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

function formatFechaCorta(f: string) {
  return new Date(f).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function formatFechaSolo(f: string) {
  return new Date(f).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const GRAVEDAD_STYLE: Record<GravedadIncidencia, { color: string; bg: string; border: string }> = {
  leve:     { color: '#059669', bg: '#ECFDF5', border: '#86efac' },
  moderada: { color: '#d97706', bg: '#FEF3C7', border: '#fcd34d' },
  grave:    { color: '#dc2626', bg: '#FEF2F2', border: '#fca5a5' },
  critica:  { color: '#7c2d12', bg: '#FFF1F2', border: '#f87171' },
}

const GRAVEDAD_LABEL: Record<GravedadIncidencia, string> = {
  leve: 'Leve', moderada: 'Moderada', grave: 'Grave', critica: 'Crítica',
}

// ─── Semáforo ────────────────────────────────────────────────
function calcSemaforo(
  incidenciasRecientes: Incidencia[],
  kardex: KardexMedicamento[],
  ultimoReporte: ReporteTurno | null,
): 'verde' | 'amarillo' | 'rojo' {
  const criticas = incidenciasRecientes.filter(i => i.gravedad === 'critica' || i.gravedad === 'grave')
  if (criticas.length > 0) return 'rojo'

  const moderadas = incidenciasRecientes.filter(i => i.gravedad === 'moderada')
  const sinExistencia = kardex.filter(k => !k.existencia_domicilio)

  if (moderadas.length > 0 || sinExistencia.length > 0) return 'amarillo'

  const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
  if (!ultimoReporte || new Date(ultimoReporte.created_at) < hace48h) return 'amarillo'

  return 'verde'
}

const SEMAFORO_CONFIG = {
  verde:    { color: '#059669', bg: '#ECFDF5', label: 'Estable',        pulse: false },
  amarillo: { color: '#d97706', bg: '#FEF3C7', label: 'Seguimiento',    pulse: true  },
  rojo:     { color: '#dc2626', bg: '#FEF2F2', label: 'Atención urgente', pulse: true },
}

// ─── Página ─────────────────────────────────────────────────
export default async function ExpedientePacientePage({ params }: { params: { id: string } }) {
  let paciente
  try {
    paciente = await getPaciente(params.id)
  } catch {
    notFound()
  }

  const casos = await getCasosByPaciente(params.id)
  const casoActivo = casos.find(c => c.status === 'activo') ?? casos[0] ?? null

  const [ultimoReporte, kardex, incidenciasRecientes] = await Promise.all([
    casoActivo ? getUltimoReporteByCaso(casoActivo.id) : Promise.resolve(null),
    casoActivo ? getKardexActivo(casoActivo.id)        : Promise.resolve([]),
    casoActivo ? getIncidenciasRecientes(casoActivo.id): Promise.resolve([]),
  ])

  const edad      = calcEdad(paciente.fecha_nacimiento)
  const semaforo  = calcSemaforo(incidenciasRecientes, kardex, ultimoReporte)
  const semConfig = SEMAFORO_CONFIG[semaforo]

  const sv = ultimoReporte?.signos_vitales as SignosVitalesReporte | undefined

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/pacientes" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: '#1B2B4B' }}>
                {paciente.nombre[0]}{paciente.apellido[0]}
              </div>
              {/* Semáforo dot */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${semaforo !== 'verde' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: semConfig.color }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
                {paciente.nombre} {paciente.apellido}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-gray-500">{edad} años</span>
                <span className="text-gray-300">·</span>
                <Badge variant="outline" className="text-xs"
                  style={{
                    borderColor: paciente.status === 'activo' ? '#2AABBF' : '#e5e7eb',
                    color:       paciente.status === 'activo' ? '#2AABBF' : '#6b7280',
                    backgroundColor: paciente.status === 'activo' ? '#EBF8FB' : 'transparent',
                  }}>
                  {paciente.status === 'activo' ? 'Activo' : 'Cerrado'}
                </Badge>
                {/* Semáforo badge */}
                <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: semConfig.bg, color: semConfig.color }}>
                  <span className={`w-2 h-2 rounded-full ${semaforo !== 'verde' ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: semConfig.color }} />
                  {semConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/pacientes/${paciente.id}/plan-cuidado`}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1B2B4B] border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white">
            <ClipboardList size={13} /> Plan de Cuidado
          </Link>
          <Link href={`/pacientes/${paciente.id}/editar`}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-all bg-white">
            <Pencil size={13} /> Editar
          </Link>
        </div>
      </div>

      {/* ── ALERTA SEMÁFORO ─────────────────────────────────── */}
      {semaforo === 'rojo' && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl border"
          style={{ backgroundColor: '#FEF2F2', borderColor: '#fca5a5' }}>
          <Zap size={18} style={{ color: '#dc2626' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
              Atención urgente — Incidencias graves en las últimas 48h
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>
              Revisar incidencias y coordinar con el equipo médico.
            </p>
          </div>
        </div>
      )}

      {/* ── CASOS ACTIVOS ───────────────────────────────────── */}
      {casoActivo ? (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderOpen size={15} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Caso Activo</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/casos/${casoActivo.id}/kardex`}
                className="text-xs text-[#2AABBF] hover:underline flex items-center gap-1">
                <Pill size={11} /> Kardex
              </Link>
              <span className="text-gray-200">|</span>
              <Link href={`/casos/${casoActivo.id}/incidencias`}
                className="text-xs text-[#2AABBF] hover:underline flex items-center gap-1">
                <AlertTriangle size={11} /> Incidencias
              </Link>
              <span className="text-gray-200">|</span>
              <Link href={`/casos/${casoActivo.id}`}
                className="text-xs text-[#2AABBF] hover:underline">
                Ver caso →
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>{casoActivo.titulo}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={11} /> {casoActivo.direccion}
                </span>
                <span className="text-xs text-gray-400">
                  Desde {formatFechaSolo(casoActivo.fecha_inicio)}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs flex-shrink-0"
              style={{ borderColor: '#059669', color: '#059669', backgroundColor: '#ECFDF5' }}>
              Activo
            </Badge>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-dashed border-gray-200 text-center">
          <FolderOpen size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Sin caso activo</p>
          <Link href="/casos/nuevo"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#2AABBF] hover:underline">
            <Plus size={12} /> Crear caso
          </Link>
        </div>
      )}

      {/* ── ÚLTIMOS SIGNOS VITALES ──────────────────────────── */}
      {ultimoReporte && sv && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={15} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Últimos Signos Vitales</h2>
            </div>
            <span className="text-xs text-gray-400">
              {formatFechaCorta(ultimoReporte.created_at)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sv.presion_arterial && (
              <div className="bg-[#EBF8FB] rounded-lg p-3 text-center">
                <p className="text-xs text-[#1A7A8C] font-medium mb-1">Presión</p>
                <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>{sv.presion_arterial}</p>
              </div>
            )}
            {sv.frecuencia_cardiaca && (
              <div className="bg-[#FCE4EC] rounded-lg p-3 text-center">
                <p className="text-xs text-[#C62828] font-medium mb-1">FC</p>
                <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>{sv.frecuencia_cardiaca} <span className="text-xs font-normal text-gray-500">bpm</span></p>
              </div>
            )}
            {sv.temperatura && (
              <div className="bg-[#FFF3E0] rounded-lg p-3 text-center">
                <p className="text-xs text-[#E65100] font-medium mb-1">Temperatura</p>
                <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>{sv.temperatura}<span className="text-xs font-normal text-gray-500">°C</span></p>
              </div>
            )}
            {(sv.saturacion_sin_o2 ?? sv.saturacion_con_o2) && (
              <div className="bg-[#E8F5E9] rounded-lg p-3 text-center">
                <p className="text-xs text-[#1B5E20] font-medium mb-1">SpO₂</p>
                <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>
                  {sv.saturacion_con_o2 ?? sv.saturacion_sin_o2}<span className="text-xs font-normal text-gray-500">%</span>
                </p>
              </div>
            )}
            {sv.glucosa && (
              <div className="bg-[#F3E5F5] rounded-lg p-3 text-center">
                <p className="text-xs text-[#4A148C] font-medium mb-1">Glucosa</p>
                <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>{sv.glucosa} <span className="text-xs font-normal text-gray-500">mg/dL</span></p>
              </div>
            )}
            {sv.dolor_eva != null && (
              <div className={`rounded-lg p-3 text-center ${(sv.dolor_eva ?? 0) >= 7 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className={`text-xs font-medium mb-1 ${(sv.dolor_eva ?? 0) >= 7 ? 'text-red-600' : 'text-gray-500'}`}>Dolor EVA</p>
                <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>{sv.dolor_eva}<span className="text-xs font-normal text-gray-500">/10</span></p>
              </div>
            )}
          </div>
          {ultimoReporte.enfermero && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 border-t border-gray-50 pt-3">
              <Stethoscope size={11} />
              Registrado por {(ultimoReporte.enfermero as { nombre: string; apellido: string }).nombre} {(ultimoReporte.enfermero as { nombre: string; apellido: string }).apellido}
            </div>
          )}
        </div>
      )}

      {/* ── 2 COLUMNAS: KARDEX + INCIDENCIAS ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Medicamentos activos */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pill size={15} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Kardex Activo</h2>
            </div>
            {casoActivo && (
              <Link href={`/casos/${casoActivo.id}/kardex`}
                className="text-xs text-[#2AABBF] hover:underline">
                Ver todos →
              </Link>
            )}
          </div>
          {kardex.length > 0 ? (
            <ul className="space-y-2">
              {kardex.slice(0, 5).map(k => (
                <li key={k.id} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: '#2AABBF' }} />
                  <div>
                    <span className="text-sm font-medium text-gray-700">{k.nombre}</span>
                    {k.dosis && <span className="text-xs text-gray-400"> · {k.dosis}</span>}
                    {k.horarios.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {k.horarios.map(h => (
                          <span key={h} className="text-xs bg-[#EBF8FB] text-[#1A7A8C] px-1.5 py-0.5 rounded">{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {kardex.length > 5 && (
                <li className="text-xs text-gray-400 pl-3.5">
                  +{kardex.length - 5} más...
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Sin medicamentos activos</p>
          )}
          {casoActivo && (
            <Link href={`/casos/${casoActivo.id}/kardex`}
              className="inline-flex items-center gap-1.5 mt-4 text-xs text-[#2AABBF] hover:underline border-t border-gray-50 pt-3 w-full">
              <Plus size={11} /> Agregar medicamento
            </Link>
          )}
        </div>

        {/* Incidencias recientes */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Incidencias (7 días)</h2>
            </div>
            {casoActivo && (
              <Link href={`/casos/${casoActivo.id}/incidencias`}
                className="text-xs text-[#2AABBF] hover:underline">
                Ver todas →
              </Link>
            )}
          </div>
          {incidenciasRecientes.length > 0 ? (
            <ul className="space-y-2">
              {incidenciasRecientes.map(inc => {
                const st = GRAVEDAD_STYLE[inc.gravedad]
                return (
                  <li key={inc.id} className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: st.color }} />
                    <div className="min-w-0">
                      <span className="text-xs font-medium"
                        style={{ color: st.color }}>
                        {GRAVEDAD_LABEL[inc.gravedad]}
                      </span>
                      <span className="text-xs text-gray-500"> · {inc.tipo.replace(/_/g, ' ')}</span>
                      <p className="text-xs text-gray-400 truncate">{inc.descripcion}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-gray-400">Sin incidencias en los últimos 7 días</p>
            </div>
          )}
        </div>
      </div>

      {/* ── ÚLTIMO REPORTE ──────────────────────────────────── */}
      {ultimoReporte && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={15} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Último Reporte de Turno</h2>
            </div>
            <span className="text-xs text-gray-400">
              {formatFechaCorta(ultimoReporte.created_at)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ultimoReporte.estado_general && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Estado general</p>
                <p className="text-sm text-gray-700 capitalize">{ultimoReporte.estado_general.replace(/_/g, ' ')}</p>
              </div>
            )}
            {ultimoReporte.tipo_dieta && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Dieta</p>
                <p className="text-sm text-gray-700">{ultimoReporte.tipo_dieta}</p>
              </div>
            )}
            {ultimoReporte.cuidados_realizados.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400 mb-1">Cuidados realizados</p>
                <div className="flex flex-wrap gap-1.5">
                  {ultimoReporte.cuidados_realizados.map((c, i) => (
                    <span key={i} className="text-xs bg-[#EBF8FB] text-[#1A7A8C] px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {ultimoReporte.observaciones && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400 mb-1">Observaciones</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{ultimoReporte.observaciones}</p>
              </div>
            )}
            {ultimoReporte.pendientes && (
              <div className="sm:col-span-2 bg-amber-50 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Pendientes para siguiente turno</p>
                <p className="text-sm text-amber-700 whitespace-pre-line">{ultimoReporte.pendientes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INFO CLÍNICA BASE ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Diagnóstico */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <User size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Diagnóstico</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{paciente.diagnostico}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin size={11} />
            <span className="capitalize">{paciente.contexto.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Alergias */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Alergias</h2>
          </div>
          {paciente.alergias?.length > 0 ? (
            <ul className="space-y-1.5">
              {paciente.alergias.map((a, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Sin alergias registradas</p>
          )}
        </div>
      </div>

      {/* ── CONTACTO FAMILIAR ───────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Heart size={15} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Contacto Familiar</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Nombre</p>
            <p className="text-sm font-medium text-gray-700">{paciente.contacto_familiar?.nombre}</p>
            <p className="text-xs text-gray-400">{paciente.contacto_familiar?.relacion}</p>
          </div>
          <div className="space-y-2">
            {paciente.contacto_familiar?.telefono && (
              <a href={`tel:${paciente.contacto_familiar.telefono}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
                <Phone size={13} /> {paciente.contacto_familiar.telefono}
              </a>
            )}
            {paciente.contacto_familiar?.email && (
              <a href={`mailto:${paciente.contacto_familiar.email}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
                <Mail size={13} /> {paciente.contacto_familiar.email}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── ACCESOS RÁPIDOS ─────────────────────────────────── */}
      {casoActivo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: `/casos/${casoActivo.id}/kardex`,      icon: <Pill size={18} />,         label: 'Kardex',     color: '#7c3aed' },
            { href: `/casos/${casoActivo.id}/incidencias`, icon: <AlertTriangle size={18} />, label: 'Incidencias',color: '#dc2626' },
            { href: `/pacientes/${paciente.id}/plan-cuidado`, icon: <ClipboardList size={18} />, label: 'Plan Cuidado', color: '#2AABBF' },
            { href: `/casos/${casoActivo.id}`,             icon: <FolderOpen size={18} />,    label: 'Ver Caso',   color: '#1B2B4B' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-center group">
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 transition-all"
                style={{ backgroundColor: `${item.color}15` }}>
                <span style={{ color: item.color }}>{item.icon}</span>
              </div>
              <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>{item.label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* ── HISTORIAL DE CASOS ──────────────────────────────── */}
      {casos.length > 1 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              Historial de casos · {casos.length}
            </h2>
          </div>
          <div className="space-y-2">
            {casos.map(c => (
              <Link key={c.id} href={`/casos/${c.id}`}
                className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                <div>
                  <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>{c.titulo}</p>
                  <p className="text-xs text-gray-400">Desde {formatFechaSolo(c.fecha_inicio)}</p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0"
                  style={{
                    borderColor: c.status === 'activo' ? '#059669' : '#e5e7eb',
                    color:       c.status === 'activo' ? '#059669' : '#6b7280',
                    backgroundColor: c.status === 'activo' ? '#ECFDF5' : 'transparent',
                  }}>
                  {c.status === 'activo' ? 'Activo' : c.status === 'pausado' ? 'Pausado' : 'Cerrado'}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
