import { getMisPagos } from '@/lib/actions/payroll'
import { requireAuth } from '@/lib/actions/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import type { PayrollItem } from '@/types'

function estadoPagoBadge(estado: string) {
  const map: Record<string, { label: string; className: string }> = {
    pendiente:  { label: 'Pendiente',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
    autorizado: { label: 'Autorizado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    pagado:     { label: 'Pagado',     className: 'bg-green-100 text-green-700 border-green-200' },
    cancelado:  { label: 'Cancelado',  className: 'bg-red-100 text-red-600 border-red-200' },
  }
  const cfg = map[estado] ?? { label: estado, className: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function fmtMonto(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MisPagosPage() {
  const { perfil } = await requireAuth()
  if (perfil.rol !== 'enfermero') {
    return <div className="p-8 text-red-600">Acceso no autorizado.</div>
  }

  const items = await getMisPagos()

  // Agrupar por periodo
  const porPeriodo = new Map<string, { nombre: string; estado: string; fecha_pago?: string; items: PayrollItem[] }>()
  for (const item of items) {
    const itemAny = item as typeof item & { periodo?: { id: string; nombre: string; estado: string; fecha_programada_pago?: string } | null }
    const periodo = itemAny.periodo ?? null
    if (!periodo) continue
    const existing = porPeriodo.get(periodo.id) ?? { nombre: periodo.nombre, estado: periodo.estado, fecha_pago: periodo.fecha_programada_pago, items: [] }
    existing.items.push(item)
    porPeriodo.set(periodo.id, existing)
  }

  const totalPendiente = items.filter(i => i.estado_pago !== 'pagado' && i.estado_pago !== 'cancelado').reduce((a, b) => a + b.total_pagar, 0)
  const totalPagado    = items.filter(i => i.estado_pago === 'pagado').reduce((a, b) => a + b.total_pagar, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2B4B]">Mis Pagos</h1>
        <p className="text-gray-500 text-sm mt-1">Historial de pagos y estado de cada periodo.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xl font-bold text-orange-700">{fmtMonto(totalPendiente)}</p>
                <p className="text-xs text-orange-600">Por recibir</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xl font-bold text-green-700">{fmtMonto(totalPagado)}</p>
                <p className="text-xs text-green-600">Recibido total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No hay registros de pago aún.</p>
          </CardContent>
        </Card>
      ) : (
        Array.from(porPeriodo.entries()).map(([periodoId, grupo]) => {
          const totalGrupo = grupo.items.reduce((a, b) => a + b.total_pagar, 0)
          const enAclaracion = grupo.items.some(i => i.estado_validacion === 'en_aclaracion')

          return (
            <Card key={periodoId} className={enAclaracion ? 'border-orange-300' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-semibold text-[#1B2B4B]">
                    {grupo.nombre}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {enAclaracion && (
                      <span className="flex items-center gap-1 text-xs text-orange-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Tiene aclaraciones pendientes
                      </span>
                    )}
                    {estadoPagoBadge(grupo.estado)}
                    {grupo.fecha_pago && (
                      <span className="text-xs text-gray-400">
                        Pago programado: {fmtFecha(grupo.fecha_pago)}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {grupo.items.map(item => {
                    const turno = item.turno as { id: string; fecha_inicio: string; fecha_fin?: string } | null
                    const caso  = item.caso  as { titulo: string } | null
                    const pac   = item.paciente as { nombre: string; apellido: string } | null

                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="text-gray-700">
                            {pac ? `${pac.nombre} ${pac.apellido}` : caso?.titulo ?? '—'}
                          </span>
                          {turno && (
                            <span className="text-xs text-gray-400 ml-2">
                              {new Date(turno.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {item.estado_validacion === 'en_aclaracion' && (
                            <span className="ml-2 text-xs text-orange-600">{item.motivo_ajuste}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-gray-500 text-xs">
                            {item.horas_pagables.toFixed(1)}h × {fmtMonto(item.tarifa_hora)}
                          </div>
                          <div className="font-semibold">{fmtMonto(item.total_pagar)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <div>
                    {grupo.items[0]?.comprobante_url && (
                      <a
                        href={grupo.items[0].comprobante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#2AABBF] hover:underline"
                      >
                        Ver comprobante
                      </a>
                    )}
                    {grupo.items[0]?.referencia_pago && (
                      <span className="text-xs text-gray-400 ml-3">
                        Ref: {grupo.items[0].referencia_pago}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-[#1B2B4B]">
                    Total: {fmtMonto(totalGrupo)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
