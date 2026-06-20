import { getMiCaso, getMiCobranza } from '@/lib/actions/familiar-portal'
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Receipt, DollarSign, ArrowUpRight } from 'lucide-react'

function formatFecha(d: string) {
  return new Date(d).toLocaleString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatMonto(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ESTATUS_INGRESO: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  pendiente:   { label: 'Pendiente',   bg: '#FFFBEB', text: '#92400E', icon: Clock },
  parcial:     { label: 'Parcial',     bg: '#EFF6FF', text: '#1E40AF', icon: AlertTriangle },
  confirmado:  { label: 'Confirmado',  bg: '#ECFDF5', text: '#065F46', icon: CheckCircle2 },
  en_revision: { label: 'En revisión', bg: '#F8FAFC', text: '#475569', icon: Clock },
}

const METODO_PAGO: Record<string, string> = {
  efectivo:     'Efectivo',
  transferencia: 'Transferencia',
  tarjeta:      'Tarjeta',
  deposito:     'Depósito',
  otro:         'Otro',
}

const TIPO_INGRESO: Record<string, string> = {
  anticipo:       'Anticipo',
  pago_servicio:  'Pago de servicio',
  pago_semanal:   'Pago semanal',
  pago_mensual:   'Pago mensual',
  pago_parcial:   'Pago parcial',
  regularizacion: 'Regularización',
  otro_ingreso:   'Otro',
}

export default async function CobranzaPage() {
  const casoData = await getMiCaso().catch(() => ({ paciente: null, caso: null }))
  const { paciente } = casoData

  let cobranzaData: {
    ingresos: unknown[]
    recibos: unknown[]
    resumen: { totalGenerado: number; totalPagado: number; saldoPendiente: number }
  } = { ingresos: [], recibos: [], resumen: { totalGenerado: 0, totalPagado: 0, saldoPendiente: 0 } }

  if (paciente) {
    cobranzaData = await getMiCobranza(paciente.id).catch(() => cobranzaData)
  }

  type Ingreso = {
    id: string; folio?: string; fecha_pago?: string; concepto: string
    tipo_ingreso?: string; monto_total: number; monto_recibido: number
    metodo_pago?: string; estatus: string; referencia_pago?: string
    periodo_cubierto_inicio?: string; periodo_cubierto_fin?: string
    created_at: string
  }
  type Recibo = {
    id: string; folio?: string; paciente_nombre: string
    fecha_emision: string; total: number; estado: string
    metodo_pago?: string; fecha_pago?: string
  }

  const ingresos = cobranzaData.ingresos as Ingreso[]
  const recibos  = cobranzaData.recibos as Recibo[]
  const resumen  = cobranzaData.resumen

  const porcentajePagado = resumen.totalGenerado > 0
    ? Math.min(100, (resumen.totalPagado / resumen.totalGenerado) * 100)
    : 0

  const alCorriente = resumen.saldoPendiente <= 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Estado de cuenta</h1>
        {paciente && (
          <p className="text-sm text-gray-500 mt-0.5">{paciente.nombre} {paciente.apellido}</p>
        )}
      </div>

      {/* Sin datos */}
      {!paciente && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CreditCard size={32} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">No hay información financiera disponible.</p>
        </div>
      )}

      {/* Resumen general */}
      {paciente && (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            {/* Estado */}
            <div className="flex items-center gap-2 mb-4">
              {alCorriente ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600">Al corriente</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} className="text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600">Saldo pendiente</span>
                </>
              )}
            </div>

            {/* Montos */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 mb-1">Servicio generado</p>
                <p className="text-base font-bold" style={{ color: '#1B2B4B' }}>
                  ${formatMonto(resumen.totalGenerado)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 mb-1">Total pagado</p>
                <p className="text-base font-bold text-emerald-600">
                  ${formatMonto(resumen.totalPagado)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 mb-1">Pendiente</p>
                <p className="text-base font-bold" style={{ color: resumen.saldoPendiente > 0 ? '#DC2626' : '#059669' }}>
                  ${formatMonto(resumen.saldoPendiente)}
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            {resumen.totalGenerado > 0 && (
              <div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${porcentajePagado}%`, backgroundColor: alCorriente ? '#059669' : '#2AABBF' }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-right">
                  {porcentajePagado.toFixed(0)}% pagado
                </p>
              </div>
            )}

            {resumen.totalGenerado === 0 && (
              <p className="text-xs text-gray-400 text-center">No hay cargos registrados en este momento.</p>
            )}
          </div>

          {/* Datos de pago */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 mb-2">Datos para transferencia</p>
            <div className="space-y-1 text-xs text-blue-700">
              <p>Banco: <span className="font-medium">BBVA</span></p>
              <p>Número de cuenta: <span className="font-medium">4321 1234 5678</span></p>
              <p>CLABE: <span className="font-medium">012 345 678 901 23 45 6</span></p>
              <p>A nombre de: <span className="font-medium">Abastemed SA de CV</span></p>
            </div>
            <p className="text-[10px] text-blue-500 mt-2">
              Al realizar un pago, comunícate con nosotros para confirmarlo.
            </p>
          </div>

          {/* Historial de pagos */}
          {ingresos.length > 0 && (
            <section>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
                <DollarSign size={14} style={{ color: '#2AABBF' }} />
                Historial de cargos y pagos
              </h2>
              <div className="space-y-2">
                {ingresos.map(ing => {
                  const st = ESTATUS_INGRESO[ing.estatus] ?? ESTATUS_INGRESO.pendiente
                  const pendiente = ing.monto_total - ing.monto_recibido

                  return (
                    <div key={ing.id} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold truncate" style={{ color: '#1B2B4B' }}>
                            {ing.concepto}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {ing.tipo_ingreso ? (TIPO_INGRESO[ing.tipo_ingreso] ?? ing.tipo_ingreso) : ''}
                            {ing.fecha_pago ? ` · ${formatFecha(ing.fecha_pago)}` : ''}
                          </p>
                          {ing.folio && (
                            <p className="text-[10px] text-gray-300 mt-0.5">#{ing.folio}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-bold" style={{ color: '#1B2B4B' }}>
                            ${formatMonto(ing.monto_total)}
                          </p>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                            style={{ backgroundColor: st.bg, color: st.text }}>
                            {st.label}
                          </span>
                        </div>
                      </div>

                      {/* Desglose */}
                      {ing.monto_recibido > 0 && (
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-50">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={9} className="text-emerald-500" />
                            Recibido: ${formatMonto(ing.monto_recibido)}
                          </span>
                          {pendiente > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Clock size={9} />
                              Pendiente: ${formatMonto(pendiente)}
                            </span>
                          )}
                          {ing.metodo_pago && (
                            <span>{METODO_PAGO[ing.metodo_pago] ?? ing.metodo_pago}</span>
                          )}
                        </div>
                      )}

                      {/* Período cubierto */}
                      {ing.periodo_cubierto_inicio && ing.periodo_cubierto_fin && (
                        <p className="text-[9px] text-gray-300 mt-1.5">
                          Período: {formatFecha(ing.periodo_cubierto_inicio)} — {formatFecha(ing.periodo_cubierto_fin)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {ingresos.length === 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <CreditCard size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No hay cargos pendientes en este momento.</p>
            </div>
          )}

          {/* Recibos */}
          {recibos.length > 0 && (
            <section>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
                <Receipt size={14} style={{ color: '#2AABBF' }} />
                Recibos
              </h2>
              <div className="space-y-2">
                {recibos.map(rec => (
                  <div key={rec.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#EBF8FB' }}>
                      <Receipt size={14} style={{ color: '#2AABBF' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1B2B4B' }}>
                        Recibo {rec.folio ?? rec.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {rec.fecha_emision ? formatFecha(rec.fecha_emision) : '—'}
                        {rec.estado === 'pagado' ? ' · Pagado' : rec.estado === 'pendiente' ? ' · Pendiente' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-bold flex-shrink-0" style={{ color: '#1B2B4B' }}>
                      ${formatMonto(rec.total)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reportar pago */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-bold mb-1" style={{ color: '#1B2B4B' }}>¿Realizaste un pago?</h2>
            <p className="text-xs text-gray-500 mb-4">
              Si realizaste una transferencia o depósito, comunícanos para registrarlo correctamente.
              Un representante revisará y confirmará tu pago.
            </p>
            <a
              href="https://wa.me/4791054012?text=Hola%2C+realic%C3%A9+un+pago+y+quiero+confirmarlo."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all"
              style={{ backgroundColor: '#25D366' }}
            >
              <ArrowUpRight size={14} />
              Reportar pago por WhatsApp
            </a>
          </div>

          {/* Aviso */}
          <div className="text-[10px] text-gray-400 text-center px-4">
            Los montos mostrados son de referencia. El saldo final puede variar según validación interna.
            Para aclaraciones, contacta directamente al equipo de Abastemed.
          </div>
        </>
      )}
    </div>
  )
}
