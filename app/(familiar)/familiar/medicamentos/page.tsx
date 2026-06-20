import { getMiCaso, getMisKardex } from '@/lib/actions/familiar-portal'
import { Pill, Clock, CheckCircle2, XCircle, AlertTriangle, PauseCircle } from 'lucide-react'

function formatHora(d: string) {
  return new Date(d).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatFecha(d: string) {
  return new Date(d).toLocaleString('es-MX', { day: 'numeric', month: 'short' })
}

const ESTATUS_MAP: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  activo:     { label: 'Activo',     bg: '#ECFDF5', text: '#065F46', icon: CheckCircle2 },
  suspendido: { label: 'Suspendido', bg: '#F8FAFC', text: '#64748B', icon: PauseCircle },
  temporal:   { label: 'Temporal',   bg: '#EFF6FF', text: '#1E40AF', icon: Clock },
  prn:        { label: 'PRN (si necesario)', bg: '#FFFBEB', text: '#92400E', icon: AlertTriangle },
}

const STATUS_ADM: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  administrado:   { label: 'Administrado',     color: '#059669', icon: CheckCircle2 },
  omitido:        { label: 'Omitido',          color: '#EF4444', icon: XCircle },
  suspendido:     { label: 'Suspendido',       color: '#94A3B8', icon: PauseCircle },
  sin_existencia: { label: 'Sin existencia',   color: '#F59E0B', icon: AlertTriangle },
  rechazado:      { label: 'Rechazado',        color: '#DC2626', icon: XCircle },
  retrasado:      { label: 'Retrasado',        color: '#F59E0B', icon: Clock },
}

const VIA_LABEL: Record<string, string> = {
  oral: 'Oral', iv: 'IV', im: 'IM', sc: 'SC', topica: 'Tópica',
  inhalada: 'Inhalada', sublingual: 'Sublingual', nasal: 'Nasal',
}

export default async function MedicamentosPage() {
  const casoData = await getMiCaso().catch(() => ({ perfil: null, paciente: null, caso: null, turnos: [] }))
  const { paciente, caso } = casoData

  let kardexData: { kardex: unknown[]; administraciones: unknown[] } = { kardex: [], administraciones: [] }
  if (caso) {
    kardexData = await getMisKardex(caso.id).catch(() => ({ kardex: [], administraciones: [] }))
  }

  type KardexItem = {
    id: string; nombre: string; presentacion?: string; dosis?: string
    via?: string; frecuencia?: string; horarios?: string[]; fecha_inicio?: string
    medico?: string; motivo?: string; estatus: string; existencia_domicilio: boolean
    observaciones?: string
  }
  type AdminItem = {
    id: string; kardex_id: string; fecha_hora_programada?: string
    fecha_hora_administrada?: string; status: string; observaciones?: string
  }

  const kardex = kardexData.kardex as KardexItem[]
  const admins = kardexData.administraciones as AdminItem[]

  const activos    = kardex.filter(k => k.estatus === 'activo')
  const suspendidos = kardex.filter(k => k.estatus === 'suspendido')
  const otrosMeds  = kardex.filter(k => !['activo', 'suspendido'].includes(k.estatus))

  function admsPorKardex(kardexId: string) {
    return admins.filter(a => a.kardex_id === kardexId).slice(0, 3)
  }

  function proximaToma(horarios: string[] = []) {
    if (!horarios.length) return null
    const ahora = new Date()
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes()
    const sortedHorarios = [...horarios].sort()
    for (const h of sortedHorarios) {
      const [hrs, mins] = h.split(':').map(Number)
      if (hrs * 60 + mins > horaActual) return h
    }
    return sortedHorarios[0] // próximo día
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Medicamentos</h1>
        {paciente && (
          <p className="text-sm text-gray-500 mt-0.5">{paciente.nombre} {paciente.apellido}</p>
        )}
      </div>

      {!caso && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Pill size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">La agenda de medicamentos se mostrará cuando exista un plan activo.</p>
        </div>
      )}

      {caso && kardex.length === 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Pill size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No hay medicamentos registrados en el kardex.</p>
        </div>
      )}

      {/* Medicamentos activos */}
      {activos.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
            <CheckCircle2 size={14} className="text-emerald-500" />
            Medicamentos activos ({activos.length})
          </h2>
          <div className="space-y-3">
            {activos.map(med => {
              const admsDelMed = admsPorKardex(med.id)
              const proximaTom = proximaToma(med.horarios)
              const conExistencia = med.existencia_domicilio

              return (
                <div key={med.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Cabecera */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: conExistencia ? '#EBF8FB' : '#FEF2F2' }}
                      >
                        <Pill size={16} style={{ color: conExistencia ? '#2AABBF' : '#ef4444' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold" style={{ color: '#1B2B4B' }}>{med.nombre}</p>
                            {med.presentacion && (
                              <p className="text-xs text-gray-400">{med.presentacion}</p>
                            )}
                          </div>
                          {!conExistencia && (
                            <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#FEF2F2', color: '#991B1B' }}>
                              Sin existencia
                            </span>
                          )}
                        </div>

                        {/* Detalles */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {med.dosis && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                              {med.dosis}
                            </span>
                          )}
                          {med.via && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                              {VIA_LABEL[med.via.toLowerCase()] ?? med.via}
                            </span>
                          )}
                          {med.frecuencia && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                              {med.frecuencia}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Horarios */}
                    {med.horarios && med.horarios.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <Clock size={11} className="text-gray-400 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {med.horarios.map((h, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: h === proximaTom ? '#1B2B4B' : '#EBF8FB',
                                color: h === proximaTom ? 'white' : '#2AABBF',
                              }}
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                        {proximaTom && (
                          <span className="text-[10px] text-gray-400">Próxima: {proximaTom}</span>
                        )}
                      </div>
                    )}

                    {/* Médico prescriptor */}
                    {med.medico && (
                      <p className="text-[10px] text-gray-400 mt-2">Prescrito por: {med.medico}</p>
                    )}

                    {/* Observaciones */}
                    {med.observaciones && (
                      <p className="text-[10px] text-gray-500 mt-2 italic">{med.observaciones}</p>
                    )}
                  </div>

                  {/* Últimas administraciones */}
                  {admsDelMed.length > 0 && (
                    <div className="border-t border-gray-50 px-4 py-3">
                      <p className="text-[9px] text-gray-400 font-semibold mb-2">ÚLTIMAS ADMINISTRACIONES</p>
                      <div className="space-y-1.5">
                        {admsDelMed.map(adm => {
                          const st = STATUS_ADM[adm.status] ?? STATUS_ADM.administrado
                          const Icon = st.icon
                          return (
                            <div key={adm.id} className="flex items-center gap-2 text-[10px] text-gray-500">
                              <Icon size={10} style={{ color: st.color }} className="flex-shrink-0" />
                              <span>{adm.fecha_hora_administrada
                                ? `${formatFecha(adm.fecha_hora_administrada)} ${formatHora(adm.fecha_hora_administrada)}`
                                : adm.fecha_hora_programada
                                  ? `Programada: ${formatFecha(adm.fecha_hora_programada)}`
                                  : '—'
                              }</span>
                              <span style={{ color: st.color }} className="font-medium">{st.label}</span>
                              {adm.observaciones && (
                                <span className="text-gray-400 truncate">{adm.observaciones}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Medicamentos suspendidos */}
      {suspendidos.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#64748B' }}>
            <PauseCircle size={14} className="text-gray-400" />
            Suspendidos ({suspendidos.length})
          </h2>
          <div className="space-y-2">
            {suspendidos.map(med => (
              <div key={med.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 opacity-60">
                <Pill size={16} className="text-gray-300 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-500">{med.nombre}</p>
                  <p className="text-[10px] text-gray-400">
                    {med.dosis}{med.via ? ` · ${med.via}` : ''}
                    {med.motivo ? ` · Motivo: ${med.motivo}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Otros (PRN, temporal) */}
      {otrosMeds.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#1B2B4B' }}>Otros</h2>
          <div className="space-y-2">
            {otrosMeds.map(med => {
              const st = ESTATUS_MAP[med.estatus] ?? ESTATUS_MAP.activo
              const Icon = st.icon
              return (
                <div key={med.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                  <Icon size={16} style={{ color: st.text }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#1B2B4B' }}>{med.nombre}</p>
                    <p className="text-[10px] text-gray-400">
                      {med.dosis}{med.via ? ` · ${med.via}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.bg, color: st.text }}>
                    {st.label}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Nota informativa */}
      {kardex.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 border border-blue-100">
          <p className="font-medium mb-1">Nota importante</p>
          <p className="text-[11px] leading-relaxed">
            Esta información refleja el kardex registrado por el equipo de enfermería.
            Para cualquier duda sobre medicamentos, contacta directamente al coordinador del caso o al médico tratante.
            No modifiques ningún medicamento sin indicación médica.
          </p>
        </div>
      )}
    </div>
  )
}
