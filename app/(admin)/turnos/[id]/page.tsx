import { getTurno } from '@/lib/actions/turnos'
import { getEntregasByTurno } from '@/lib/actions/entregas'
import { TurnoStatusBtn } from '@/components/admin/turnos/TurnoStatusBtn'
import { EditarFechasBtn } from '@/components/admin/turnos/EditarFechasBtn'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, User, MapPin, Calendar, Clock, Phone, FileText,
  Heart, AlertTriangle, Star, Briefcase, DollarSign, Pill,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Paciente, Enfermero, Caso, SignosVitales, MedicamentoAdministrado } from '@/types'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  programado: { label: 'Programado', color: '#2AABBF', bg: '#EBF8FB',   border: '#2AABBF' },
  activo:     { label: 'En curso',   color: '#059669', bg: '#ECFDF5',   border: '#059669' },
  completado: { label: 'Completado', color: '#6b7280', bg: '#f3f4f6',   border: '#e5e7eb' },
}

function formatFecha(f: string) {
  return new Date(f).toLocaleString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatFechaCorta(f: string) {
  return new Date(f).toLocaleString('es-VE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function duracion(inicio: string, fin: string) {
  const h = (new Date(fin).getTime() - new Date(inicio).getTime()) / 3600000
  return `${h.toFixed(1)}h`
}

export default async function TurnoDetailPage({ params }: { params: { id: string } }) {
  let turno
  try {
    turno = await getTurno(params.id)
  } catch {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let entrega: any = null
  try { entrega = await getEntregasByTurno(params.id) } catch { /* sin entrega */ }

  const st      = STATUS_STYLE[turno.status] ?? STATUS_STYLE.programado
  const caso     = turno.caso as (Caso & { paciente?: Paciente }) | null
  const enfermero = turno.enfermero as Enfermero | null
  const paciente  = caso?.paciente as Paciente | undefined
  const durH     = duracion(turno.fecha_inicio, turno.fecha_fin)

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/turnos" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
              {caso?.titulo ?? 'Turno'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs"
                style={{ borderColor: st.border, color: st.color, backgroundColor: st.bg }}>
                {st.label}
              </Badge>
              <span className="text-xs text-gray-400">{durH}</span>
            </div>
          </div>
        </div>

        {turno.status !== 'completado' && (
          <div className="flex items-center gap-2">
            {turno.status === 'programado' && (
              <TurnoStatusBtn
                turnoId={turno.id}
                nuevoStatus="activo"
                label="Iniciar turno"
                className="px-3 py-2 text-sm font-medium rounded-lg border border-[#059669] text-[#059669] hover:bg-[#ECFDF5] transition-all disabled:opacity-50"
              />
            )}
            <TurnoStatusBtn
              turnoId={turno.id}
              nuevoStatus="completado"
              label="Marcar completado"
              className="px-3 py-2 text-sm font-semibold rounded-lg text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: '#1B2B4B' } as React.CSSProperties}
            />
          </div>
        )}
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
            <Calendar size={12} /> Inicio
          </p>
          <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            {formatFechaCorta(turno.fecha_inicio)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5">
            <Calendar size={12} /> Fin
          </p>
          <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            {formatFechaCorta(turno.fecha_fin)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1.5">
            <Clock size={12} /> Duración
          </p>
          <p className="text-lg font-bold" style={{ color: '#2AABBF' }}>{durH}</p>
        </div>
      </div>

      {/* Editar fechas */}
      <EditarFechasBtn
        turnoId={turno.id}
        fechaInicioActual={turno.fecha_inicio}
        fechaFinActual={turno.fecha_fin}
      />

      {/* Enfermero */}
      {enfermero && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Enfermero/a</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#1B2B4B' }}>
              {enfermero.nombre[0]}{enfermero.apellido[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: '#1B2B4B' }}>
                {enfermero.nombre} {enfermero.apellido}
              </p>
              <p className="text-xs text-gray-400">{enfermero.cedula}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <Star size={11} className="fill-amber-400" />
                  {enfermero.rating?.toFixed(1) ?? '0.0'}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Briefcase size={11} />
                  {enfermero.total_casos} casos
                </span>
                <a href={`tel:${enfermero.telefono}`}
                  className="flex items-center gap-1 text-xs text-[#2AABBF] hover:underline">
                  <Phone size={11} />
                  {enfermero.telefono}
                </a>
              </div>
            </div>
            <Link href={`/enfermeros/${enfermero.id}`}
              className="text-xs text-[#2AABBF] hover:underline flex-shrink-0">
              Ver perfil →
            </Link>
          </div>

          {enfermero.especialidades?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-gray-50">
              {enfermero.especialidades.map((esp: string) => (
                <span key={esp} className="text-xs px-2 py-0.5 rounded-full bg-[#EBF8FB] text-[#1A7A8C]">
                  {esp}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Caso y paciente */}
      {caso && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={15} style={{ color: '#2AABBF' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Caso clínico</h2>
            </div>
            <Link href={`/casos/${caso.id}`} className="text-xs text-[#2AABBF] hover:underline">
              Ver caso →
            </Link>
          </div>

          {paciente && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-50">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#2AABBF' }}>
                {paciente.nombre[0]}{paciente.apellido[0]}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: '#1B2B4B' }}>
                  {paciente.nombre} {paciente.apellido}
                </p>
                <p className="text-xs text-gray-400">{paciente.diagnostico}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{caso.direccion}</p>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={13} className="text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                ${caso.tarifa_hora}/h
                {turno.status === 'completado' && (
                  <span className="text-gray-400 ml-1">
                    · Total: ${(parseFloat(durH) * caso.tarifa_hora).toFixed(2)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Medicamentos del paciente */}
          {(paciente?.medicamentos ?? []).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                <Pill size={12} /> Medicamentos del paciente
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(paciente?.medicamentos ?? []).map((m: string) => (
                  <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Alergias */}
          {(paciente?.alergias ?? []).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-500 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Alergias
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(paciente?.alergias ?? []).map((a: string) => (
                  <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notas del caso */}
          {caso.notas && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-1">Notas para el turno</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{caso.notas}</p>
            </div>
          )}
        </div>
      )}

      {/* Entrega de turno */}
      {entrega ? (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Entrega de turno</h2>
            <span className="text-xs text-gray-400 ml-auto">
              {formatFecha(entrega.created_at)}
            </span>
          </div>

          {/* Signos vitales */}
          {entrega.signos_vitales && Object.values(entrega.signos_vitales as SignosVitales).some(v => v !== undefined && v !== '') && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Signos vitales</p>
              <div className="flex flex-wrap gap-2">
                {(entrega.signos_vitales as SignosVitales).presion_arterial && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#EBF8FB] text-[#1A7A8C] font-medium">
                    PA: {(entrega.signos_vitales as SignosVitales).presion_arterial}
                  </span>
                )}
                {(entrega.signos_vitales as SignosVitales).frecuencia_cardiaca && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#FCE4EC] text-[#C62828] font-medium">
                    FC: {(entrega.signos_vitales as SignosVitales).frecuencia_cardiaca} bpm
                  </span>
                )}
                {(entrega.signos_vitales as SignosVitales).temperatura && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#FFF3E0] text-[#E65100] font-medium">
                    T°: {(entrega.signos_vitales as SignosVitales).temperatura}°C
                  </span>
                )}
                {(entrega.signos_vitales as SignosVitales).saturacion_oxigeno && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] font-medium">
                    SpO₂: {(entrega.signos_vitales as SignosVitales).saturacion_oxigeno}%
                  </span>
                )}
                {(entrega.signos_vitales as SignosVitales).frecuencia_respiratoria && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#EDE7F6] text-[#4527A0] font-medium">
                    FR: {(entrega.signos_vitales as SignosVitales).frecuencia_respiratoria} rpm
                  </span>
                )}
                {(entrega.signos_vitales as SignosVitales).glucosa && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3E5F5] text-[#4A148C] font-medium">
                    Glucosa: {(entrega.signos_vitales as SignosVitales).glucosa} mg/dL
                  </span>
                )}
                {(entrega.signos_vitales as SignosVitales).peso && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                    Peso: {(entrega.signos_vitales as SignosVitales).peso} kg
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Medicamentos administrados */}
          {(entrega.medicamentos_administrados as MedicamentoAdministrado[])?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Medicamentos administrados</p>
              <div className="space-y-2">
                {(entrega.medicamentos_administrados as MedicamentoAdministrado[]).map((m, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      m.administrado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {m.administrado ? '✓' : '✕'}
                    </span>
                    <div>
                      <span className="font-medium text-gray-700">{m.nombre}</span>
                      <span className="text-gray-400"> · {m.dosis} · {m.via} · {m.hora}</span>
                      {m.observaciones && (
                        <p className="text-gray-400 mt-0.5">{m.observaciones}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Observaciones</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{entrega.observaciones}</p>
          </div>

          {/* Incidentes */}
          {entrega.incidentes && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-1">
                <AlertTriangle size={12} /> Incidente reportado
              </p>
              <p className="text-sm text-amber-700">{entrega.incidentes}</p>
            </div>
          )}

          {/* Enfermero entrante */}
          {entrega.enfermero_entrante && (
            <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
              Entregado a: {(entrega.enfermero_entrante as { nombre: string; apellido: string }).nombre}{' '}
              {(entrega.enfermero_entrante as { nombre: string; apellido: string }).apellido}
            </div>
          )}
        </div>
      ) : turno.status === 'completado' ? (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-sm text-amber-700">
          Turno completado sin entrega registrada.
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm text-center text-gray-400 text-sm">
          <Heart size={24} className="mx-auto mb-2 opacity-20" />
          La entrega de turno aún no ha sido registrada.
        </div>
      )}

      {/* Notas de entrega del turno */}
      {turno.notas_entrega && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Notas adicionales</p>
          <p className="text-sm text-gray-600 whitespace-pre-line">{turno.notas_entrega}</p>
        </div>
      )}
    </div>
  )
}
