import { getMiCaso, getMiExpediente } from '@/lib/actions/familiar-portal'
import { FileText, AlertTriangle, Stethoscope, Pill, Clock, MapPin, User } from 'lucide-react'

function formatFecha(d: string) {
  return new Date(d).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function edad(fechaNac: string) {
  const hoy = new Date()
  const nac = new Date(fechaNac)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}

const TIPO_INDICACION: Record<string, string> = {
  medicamento_oral:       'Medicamento oral',
  aplicacion_medicamento: 'Aplicación de medicamento',
  curacion:               'Curación',
  signos_vitales:         'Signos vitales',
  terapia:                'Terapia',
  otra:                   'Otra actividad',
}

const FRECUENCIA_LABEL: Record<string, string> = {
  cada_4h:               'Cada 4 horas',
  cada_6h:               'Cada 6 horas',
  cada_8h:               'Cada 8 horas',
  cada_12h:              'Cada 12 horas',
  cada_24h:              'Cada 24 horas',
  lunes_miercoles_viernes: 'Lun/Mié/Vie',
  una_vez:               'Una sola vez',
  segun_necesidad:       'Según necesidad',
}

export default async function ExpedientePage() {
  const casoData = await getMiCaso().catch(() => ({ paciente: null, caso: null }))
  const { paciente: pacienteBasico } = casoData

  let expediente: {
    paciente: unknown; caso: unknown; indicaciones: unknown[]
  } = { paciente: null, caso: null, indicaciones: [] }

  if (pacienteBasico) {
    expediente = await getMiExpediente(pacienteBasico.id).catch(() => expediente)
  }

  type Paciente = {
    id: string; nombre: string; apellido: string; fecha_nacimiento: string
    diagnostico: string; alergias: string[]; medicamentos: string[]
    contexto: string; contacto_familiar: Record<string, string>; created_at: string
  }
  type Caso = {
    id: string; titulo: string; contexto: string; direccion: string
    fecha_inicio: string; status: string; horas_turno?: number
    horario_inicio?: string; horario_fin?: string; notas?: string
  }
  type Indicacion = {
    id: string; nombre: string; tipo: string; dosis?: string; via?: string
    frecuencia?: string; horarios?: string[]; fecha_inicio: string
    fecha_fin?: string; activa: boolean; responsable?: string; notas?: string
  }

  const p = expediente.paciente as Paciente | null
  const c = expediente.caso as Caso | null
  const indicaciones = expediente.indicaciones as Indicacion[]

  const indicacionesActivas   = indicaciones.filter(i => i.activa)

  function Sección({ titulo, icon: Icon, children }: { titulo: string; icon: React.ElementType; children: React.ReactNode }) {
    return (
      <section>
        <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
          <Icon size={14} style={{ color: '#2AABBF' }} />
          {titulo}
        </h2>
        {children}
      </section>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Expediente</h1>
        {p && <p className="text-sm text-gray-500 mt-0.5">{p.nombre} {p.apellido}</p>}
      </div>

      {!p && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <FileText size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No hay expediente disponible.</p>
        </div>
      )}

      {p && (
        <>
          {/* Ficha del paciente */}
          <Sección titulo="Ficha del paciente" icon={User}>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: '#1B2B4B' }}
                >
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div>
                  <p className="font-bold text-base leading-tight" style={{ color: '#1B2B4B' }}>
                    {p.nombre} {p.apellido}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {edad(p.fecha_nacimiento)} años · {formatFecha(p.fecha_nacimiento)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {p.contexto?.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Diagnóstico */}
              {p.diagnostico && (
                <div className="bg-blue-50 rounded-xl p-3 mb-3">
                  <p className="text-[10px] text-blue-500 font-semibold mb-1">DIAGNÓSTICO PRINCIPAL</p>
                  <p className="text-xs text-blue-800">{p.diagnostico}</p>
                </div>
              )}

              {/* Alergias */}
              {p.alergias && p.alergias.length > 0 && (
                <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
                  <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-red-500 font-semibold">ALERGIAS CONOCIDAS</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.alergias.map((a, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha de inicio del servicio */}
              {p.created_at && (
                <p className="text-[10px] text-gray-300 mt-3">
                  Registro en Abastemed: {formatFecha(p.created_at)}
                </p>
              )}
            </div>
          </Sección>

          {/* Caso activo */}
          {c && (
            <Sección titulo="Servicio activo" icon={Stethoscope}>
              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>{c.titulo}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                    <MapPin size={11} />
                    <span>{c.direccion}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {c.fecha_inicio && (
                    <div>
                      <p className="text-[10px] text-gray-400">Inicio del servicio</p>
                      <p className="text-xs font-medium" style={{ color: '#1B2B4B' }}>{formatFecha(c.fecha_inicio)}</p>
                    </div>
                  )}
                  {c.horas_turno && (
                    <div>
                      <p className="text-[10px] text-gray-400">Turno</p>
                      <p className="text-xs font-medium" style={{ color: '#1B2B4B' }}>{c.horas_turno}h
                        {c.horario_inicio && c.horario_fin ? ` · ${c.horario_inicio} – ${c.horario_fin}` : ''}
                      </p>
                    </div>
                  )}
                </div>
                {c.notas && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5">Notas del caso</p>
                    <p className="text-xs text-gray-600">{c.notas}</p>
                  </div>
                )}
              </div>
            </Sección>
          )}

          {/* Plan de cuidado */}
          {indicacionesActivas.length > 0 && (
            <Sección titulo="Plan de cuidado activo" icon={Clock}>
              <div className="space-y-2">
                {indicacionesActivas.map(ind => (
                  <div key={ind.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>{ind.nombre}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium ml-2 flex-shrink-0"
                        style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
                        {TIPO_INDICACION[ind.tipo] ?? ind.tipo}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {ind.dosis && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{ind.dosis}</span>
                      )}
                      {ind.via && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{ind.via}</span>
                      )}
                      {ind.frecuencia && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {FRECUENCIA_LABEL[ind.frecuencia] ?? ind.frecuencia}
                        </span>
                      )}
                    </div>
                    {ind.horarios && ind.horarios.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock size={10} className="text-gray-300" />
                        <span className="text-[10px] text-gray-400">{ind.horarios.join(', ')}</span>
                      </div>
                    )}
                    {ind.notas && (
                      <p className="text-[10px] text-gray-400 mt-1.5 italic">{ind.notas}</p>
                    )}
                  </div>
                ))}
              </div>
            </Sección>
          )}

          {/* Medicamentos del perfil del paciente (lista base) */}
          {p.medicamentos && p.medicamentos.length > 0 && (
            <Sección titulo="Medicamentos registrados" icon={Pill}>
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex flex-wrap gap-2">
                  {p.medicamentos.map((m, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full font-medium"
                      style={{ backgroundColor: '#EBF8FB', color: '#1A7A8C' }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </Sección>
          )}

          {/* Aviso */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700">
            <p className="font-semibold mb-1">Nota importante</p>
            <p className="leading-relaxed text-[11px]">
              Esta información es un resumen del expediente del servicio de Abastemed.
              Para información médica completa, diagnósticos actualizados o cambios en el tratamiento,
              consulta directamente con el médico tratante.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
