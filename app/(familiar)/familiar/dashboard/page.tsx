import { getDashboardFamiliar, getMisPacientes } from '@/lib/actions/familiar-portal'
import {
  Heart, Clock, Pill, CreditCard, AlertTriangle, Activity,
  CalendarDays, ChevronRight, CheckCircle2, Phone, Stethoscope,
  Utensils, Droplets, Thermometer, Wind,
} from 'lucide-react'
import Link from 'next/link'

// ─── Helpers ─────────────────────────────────────────────────
function saludo() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaLarga(d: string | Date) {
  return new Date(d).toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

function fechaCorta(d: string | Date) {
  return new Date(d).toLocaleString('es-MX', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function fechaSolo(d: string | Date) {
  return new Date(d).toLocaleString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function edad(fechaNac: string) {
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}

const GRAVEDAD_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  alta:   { bg: '#FEF2F2', text: '#991B1B', border: '#FCA5A5' },
  media:  { bg: '#FFFBEB', text: '#92400E', border: '#FCD34D' },
  baja:   { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
}

const ESTADO_TURNO: Record<string, { label: string; color: string }> = {
  programado: { label: 'Programado', color: '#2AABBF' },
  activo:     { label: 'En curso',   color: '#059669' },
  completado: { label: 'Completado', color: '#94a3b8' },
}

const ESTADO_CITA: Record<string, { label: string; color: string }> = {
  programada:  { label: 'Programada',  color: '#2AABBF' },
  confirmada:  { label: 'Confirmada',  color: '#059669' },
  realizada:   { label: 'Realizada',   color: '#94a3b8' },
  cancelada:   { label: 'Cancelada',   color: '#ef4444' },
}

// ─── Componentes pequeños ────────────────────────────────────

function Chip({ label, bg = '#EBF8FB', text = '#1A7A8C' }: { label: string; bg?: string; text?: string }) {
  return (
    <span className="inline-block text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: bg, color: text }}>
      {label}
    </span>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function SeccionHeader({ titulo, href, icon: Icon }: { titulo: string; href?: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
        {Icon && <Icon size={14} style={{ color: '#2AABBF' }} />}
        {titulo}
      </h2>
      {href && (
        <Link href={href} className="text-xs flex items-center gap-0.5 hover:underline" style={{ color: '#2AABBF' }}>
          Ver todo <ChevronRight size={12} />
        </Link>
      )}
    </div>
  )
}

function EmptyState({ mensaje, icon: Icon = Heart }: { mensaje: string; icon?: React.ElementType }) {
  return (
    <div className="text-center py-8">
      <Icon size={28} className="mx-auto mb-2 text-gray-200" />
      <p className="text-xs text-gray-400">{mensaje}</p>
    </div>
  )
}

// ─── Tipo del reporte para el dashboard ──────────────────────

type ReporteDashboard = {
  id: string; created_at: string; estado_general?: string
  signos_vitales?: Record<string, string | number | null>
  tipo_dieta?: string; porcentaje_ingesta?: number
  resumen_para_familia?: string; observaciones?: string
  pendientes?: string; nausea?: boolean; vomito?: boolean
  enfermero?: { nombre: string; apellido: string } | null
}

function UltimoReporteCard({ reporte }: { reporte: unknown }) {
  const rep = reporte as ReporteDashboard
  const sv = rep.signos_vitales ?? {}
  const tieneSV = Object.values(sv).some(v => v !== null && v !== undefined && v !== '')

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>
              {rep.enfermero
                ? `${rep.enfermero.nombre} ${rep.enfermero.apellido}`
                : 'Equipo de enfermería'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{fechaLarga(rep.created_at)}</p>
          </div>
          {rep.estado_general && <Chip label={rep.estado_general} />}
        </div>

        {tieneSV && (
          <div className="mb-4">
            <p className="text-[10px] text-gray-400 font-medium mb-2">Signos vitales</p>
            <div className="grid grid-cols-2 gap-2">
              {sv.presion_arterial && (
                <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                  <Heart size={12} className="text-blue-500" />
                  <div><p className="text-[9px] text-gray-400">Presión</p><p className="text-xs font-semibold text-blue-700">{sv.presion_arterial}</p></div>
                </div>
              )}
              {sv.frecuencia_cardiaca && (
                <div className="flex items-center gap-2 bg-rose-50 rounded-lg px-3 py-2">
                  <Activity size={12} className="text-rose-500" />
                  <div><p className="text-[9px] text-gray-400">FC</p><p className="text-xs font-semibold text-rose-700">{sv.frecuencia_cardiaca} bpm</p></div>
                </div>
              )}
              {sv.temperatura && (
                <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2">
                  <Thermometer size={12} className="text-orange-500" />
                  <div><p className="text-[9px] text-gray-400">Temperatura</p><p className="text-xs font-semibold text-orange-700">{sv.temperatura}°C</p></div>
                </div>
              )}
              {sv.saturacion_oxigeno && (
                <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                  <Wind size={12} className="text-emerald-500" />
                  <div><p className="text-[9px] text-gray-400">SpO₂</p><p className="text-xs font-semibold text-emerald-700">{sv.saturacion_oxigeno}%</p></div>
                </div>
              )}
              {sv.glucosa && (
                <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2">
                  <Droplets size={12} className="text-purple-500" />
                  <div><p className="text-[9px] text-gray-400">Glucosa</p><p className="text-xs font-semibold text-purple-700">{sv.glucosa} mg/dL</p></div>
                </div>
              )}
            </div>
          </div>
        )}

        {rep.tipo_dieta && (
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
            <Utensils size={12} className="text-gray-400 flex-shrink-0" />
            <span>{rep.tipo_dieta}{rep.porcentaje_ingesta !== undefined ? ` · Ingesta ${rep.porcentaje_ingesta}%` : ''}</span>
          </div>
        )}

        {rep.resumen_para_familia
          ? <div className="bg-teal-50 rounded-xl p-3">
              <p className="text-[10px] text-teal-600 font-medium mb-1">Nota del equipo</p>
              <p className="text-xs text-teal-800 leading-relaxed">{rep.resumen_para_familia}</p>
            </div>
          : rep.observaciones
            ? <p className="text-xs text-gray-600 leading-relaxed">{rep.observaciones}</p>
            : null
        }

        <Link
          href="/familiar/evolucion"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-xl border transition-all hover:bg-gray-50"
          style={{ color: '#2AABBF', borderColor: '#2AABBF' }}
        >
          Ver evolución completa <ChevronRight size={12} />
        </Link>
      </div>
    </Card>
  )
}

// ─── Página principal ─────────────────────────────────────────

export default async function FamiliarDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string }>
}) {
  const sp = await searchParams
  const pacienteIdParam = sp?.paciente

  const [data, pacientes] = await Promise.all([
    getDashboardFamiliar(pacienteIdParam).catch(() => null),
    getMisPacientes().catch(() => []),
  ])

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Si no hay datos (sin paciente vinculado)
  if (!data) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{saludo()}</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{hoy}</p>
        </div>
        <Card>
          <div className="p-6 text-center">
            <Heart size={40} className="mx-auto mb-3" style={{ color: '#2AABBF' }} />
            <h2 className="font-semibold mb-1" style={{ color: '#1B2B4B' }}>Tu cuenta está lista</h2>
            <p className="text-sm text-gray-500">
              Aún no estás vinculado a un paciente. Contacta al equipo de Abastemed para completar tu acceso.
            </p>
            <a
              href="https://wa.me/4791054012"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all"
              style={{ backgroundColor: '#25D366' }}
            >
              <Phone size={14} />
              Contactar a Abastemed
            </a>
          </div>
        </Card>
      </div>
    )
  }

  const { perfil, parentesco, paciente, caso, ultimoReporte, medicamentosActivos, proximosTurnos, proximasCitas, resumenCobranza, alertas, permisos } = data

  const casoId = caso?.id

  return (
    <div className="space-y-5">

      {/* ─── Selector de paciente (si tiene más de uno) ─── */}
      {pacientes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {pacientes.map(r => (
            <Link
              key={r.paciente.id}
              href={`/familiar/dashboard?paciente=${r.paciente.id}`}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                backgroundColor: r.paciente.id === paciente?.id ? '#1B2B4B' : 'white',
                color: r.paciente.id === paciente?.id ? 'white' : '#1B2B4B',
                border: '1px solid',
                borderColor: r.paciente.id === paciente?.id ? '#1B2B4B' : '#E5E7EB',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  backgroundColor: r.paciente.id === paciente?.id ? 'rgba(255,255,255,0.2)' : '#EBF8FB',
                  color: r.paciente.id === paciente?.id ? 'white' : '#2AABBF',
                }}
              >
                {r.paciente.nombre[0]}{r.paciente.apellido[0]}
              </div>
              {r.paciente.nombre} {r.paciente.apellido}
            </Link>
          ))}
        </div>
      )}

      {/* ─── Saludo y encabezado ─── */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>
          {saludo()}, {perfil?.nombre}.
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{hoy}</p>
      </div>

      {/* ─── Tarjeta principal del paciente ─── */}
      {paciente && (
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#1B2B4B' }}
              >
                {paciente.nombre[0]}{paciente.apellido[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base leading-tight" style={{ color: '#1B2B4B' }}>
                  {paciente.nombre} {paciente.apellido}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {edad(paciente.fecha_nacimiento)} años · {paciente.contexto?.replace('_', ' ')}
                </p>
                {parentesco && (
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                    style={{ backgroundColor: '#EBF8FB', color: '#1A7A8C' }}>
                    {parentesco}
                  </span>
                )}
              </div>
              <div className="flex-shrink-0">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: caso ? '#ECFDF5' : '#FEF9C3',
                    color: caso ? '#065F46' : '#713F12',
                  }}
                >
                  {caso ? 'Servicio activo' : 'Sin caso activo'}
                </span>
              </div>
            </div>

            {/* Diagnóstico */}
            {permisos.puede_ver_resumen_salud && paciente.diagnostico && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 font-medium mb-0.5">Diagnóstico principal</p>
                <p className="text-xs text-gray-700">{paciente.diagnostico}</p>
              </div>
            )}

            {/* Alergias */}
            {paciente.alergias && paciente.alergias.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                <p className="text-[10px] text-amber-700">
                  Alergias: {paciente.alergias.join(', ')}
                </p>
              </div>
            )}

            {/* Estado del caso */}
            {caso && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <p className="text-xs text-gray-500 truncate">{caso.titulo}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ─── Alertas ─── */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => {
            const colors = GRAVEDAD_COLOR[a.gravedad] ?? GRAVEDAD_COLOR.baja
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 rounded-xl border text-xs"
                style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
              >
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{a.mensaje}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Último reporte (Estado en las últimas horas) ─── */}
      {permisos.puede_ver_resumen_salud && (
        <section>
          <SeccionHeader titulo="Estado reciente" href={casoId ? '/familiar/evolucion' : undefined} icon={Activity} />
          {ultimoReporte
            ? <UltimoReporteCard reporte={ultimoReporte} />
            : <Card><EmptyState mensaje="Aún no hay reportes disponibles." icon={Activity} /></Card>
          }
        </section>
      )}

      {/* ─── Próximos turnos ─── */}
      {caso && (
        <section>
          <SeccionHeader titulo="Próximos turnos" icon={Clock} />
          {proximosTurnos.length === 0 ? (
            <Card><EmptyState mensaje="No hay turnos programados próximamente." icon={Clock} /></Card>
          ) : (
            <div className="space-y-2">
              {(proximosTurnos as Array<{
                id: string; status: string; fecha_inicio: string; fecha_fin: string
                enfermero?: { nombre: string; apellido: string; telefono: string }
              }>).map(t => {
                const st = ESTADO_TURNO[t.status] ?? ESTADO_TURNO.programado
                const hs = ((new Date(t.fecha_fin).getTime() - new Date(t.fecha_inicio).getTime()) / 3600000).toFixed(0)
                return (
                  <Card key={t.id}>
                    <div className="p-4 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#EBF8FB' }}
                      >
                        <Clock size={16} style={{ color: '#2AABBF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>
                          {fechaCorta(t.fecha_inicio)}
                          <span className="text-gray-400 font-normal"> · {hs}h</span>
                        </p>
                        {t.enfermero && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {t.enfermero.nombre} {t.enfermero.apellido}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `${st.color}18`, color: st.color }}
                      >
                        {st.label}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── Medicamentos ─── */}
      {permisos.puede_ver_medicamentos && casoId && (
        <section>
          <SeccionHeader titulo="Medicamentos activos" href="/familiar/medicamentos" icon={Pill} />
          {medicamentosActivos.length === 0 ? (
            <Card>
              <EmptyState mensaje="La agenda de medicamentos se mostrará cuando exista un plan activo." icon={Pill} />
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-gray-50">
                {(medicamentosActivos as Array<{
                  id: string; nombre: string; dosis: string; via: string
                  frecuencia: string; horarios: string[]; existencia_domicilio: boolean
                }>).slice(0, 4).map(m => (
                  <div key={m.id} className="p-4 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: m.existencia_domicilio ? '#EBF8FB' : '#FEF2F2' }}
                    >
                      <Pill size={14} style={{ color: m.existencia_domicilio ? '#2AABBF' : '#ef4444' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1B2B4B' }}>{m.nombre}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {m.dosis} · {m.via} · {m.frecuencia}
                      </p>
                    </div>
                    {!m.existencia_domicilio && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: '#FEF2F2', color: '#991B1B' }}>
                        Agotado
                      </span>
                    )}
                    {m.horarios && m.horarios.length > 0 && m.existencia_domicilio && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {m.horarios[0]}
                      </span>
                    )}
                  </div>
                ))}
                {medicamentosActivos.length > 4 && (
                  <div className="px-4 py-3 text-center">
                    <Link href="/familiar/medicamentos"
                      className="text-xs font-medium" style={{ color: '#2AABBF' }}>
                      Ver {medicamentosActivos.length - 4} medicamento{medicamentosActivos.length - 4 !== 1 ? 's' : ''} más →
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          )}
        </section>
      )}

      {/* ─── Próximas citas ─── */}
      {permisos.puede_ver_citas && proximasCitas.length > 0 && (
        <section>
          <SeccionHeader titulo="Próximas citas" href="/familiar/agenda" icon={Stethoscope} />
          <div className="space-y-2">
            {(proximasCitas as Array<{
              id: string; medico_nombre?: string; especialidad?: string
              fecha: string; hora?: string; estado: string; modalidad: string
            }>).map(c => {
              const st = ESTADO_CITA[c.estado] ?? ESTADO_CITA.programada
              return (
                <Card key={c.id}>
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#F0FDF4' }}
                    >
                      <Stethoscope size={16} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>
                        {c.medico_nombre ?? 'Cita médica'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {c.especialidad && `${c.especialidad} · `}
                        {fechaSolo(c.fecha)}{c.hora ? ` · ${c.hora}` : ''}
                      </p>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${st.color}18`, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── Estado de cuenta ─── */}
      {permisos.puede_ver_cobranza && resumenCobranza && (
        <section>
          <SeccionHeader titulo="Estado de cuenta" href="/familiar/cobranza" icon={CreditCard} />
          <Card>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-1">Generado</p>
                  <p className="text-sm font-bold" style={{ color: '#1B2B4B' }}>
                    ${resumenCobranza.totalGenerado.toFixed(0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-1">Pagado</p>
                  <p className="text-sm font-bold text-emerald-600">
                    ${resumenCobranza.totalPagado.toFixed(0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 mb-1">Pendiente</p>
                  <p className="text-sm font-bold" style={{
                    color: resumenCobranza.saldoPendiente > 0 ? '#DC2626' : '#059669',
                  }}>
                    ${resumenCobranza.saldoPendiente.toFixed(0)}
                  </p>
                </div>
              </div>

              {resumenCobranza.totalGenerado > 0 && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (resumenCobranza.totalPagado / resumenCobranza.totalGenerado) * 100)}%`,
                      backgroundColor: '#2AABBF',
                    }}
                  />
                </div>
              )}

              {resumenCobranza.saldoPendiente <= 0 && (
                <div className="flex items-center gap-2 mt-3 text-xs text-emerald-600">
                  <CheckCircle2 size={12} />
                  <span>Al corriente</span>
                </div>
              )}
            </div>
          </Card>
        </section>
      )}

      {/* ─── Accesos rápidos ─── */}
      <section>
        <h2 className="text-sm font-bold mb-3" style={{ color: '#1B2B4B' }}>Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: '/familiar/evolucion',   label: 'Ver evolución',     icon: Activity,     color: '#2AABBF' },
            { href: '/familiar/medicamentos', label: 'Medicamentos',      icon: Pill,         color: '#7C3AED' },
            { href: '/familiar/agenda',       label: 'Agenda',            icon: CalendarDays, color: '#059669' },
            { href: '/familiar/contacto',     label: 'Contactar equipo',  icon: Phone,        color: '#DC2626' },
          ].map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}18` }}
                >
                  <Icon size={16} style={{ color: item.color }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ─── Datos de contacto Abastemed ─── */}
      <section>
        <Card>
          <div className="p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#1B2B4B' }}
            >
              <Phone size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>Abastemed</p>
              <p className="text-[10px] text-gray-400">¿Tienes dudas? Estamos disponibles</p>
            </div>
            <a
              href="tel:4791054012"
              className="text-xs font-semibold px-3 py-2 rounded-xl text-white transition-all flex-shrink-0"
              style={{ backgroundColor: '#2AABBF' }}
            >
              Llamar
            </a>
          </div>
        </Card>
      </section>

    </div>
  )
}
