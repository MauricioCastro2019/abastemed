'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  generarPartidas,
  marcarPeriodoEnRevision,
  marcarPeriodoValidado,
  autorizarPayrollPeriod,
  registrarPagoPeriodo,
  validarPayrollItem,
  cancelarPayrollPeriod,
} from '@/lib/actions/payroll'
import type { PayrollPeriod, ResumenPagoEnfermero, EstadoPayrollPeriod } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CheckCircle, XCircle, AlertCircle, Users, Clock,
  DollarSign, ArrowLeft, RefreshCw, Shield
} from 'lucide-react'
import Link from 'next/link'

interface Props {
  periodo: PayrollPeriod
  resumen: ResumenPagoEnfermero[]
  rol: string
}

const estadoLabels: Record<EstadoPayrollPeriod, string> = {
  borrador:           'Borrador',
  en_revision:        'En revisión',
  validado:           'Validado',
  autorizado:         'Autorizado',
  parcialmente_pagado:'Parcialmente pagado',
  pagado:             'Pagado',
  cerrado:            'Cerrado',
  cancelado:          'Cancelado',
}

const validacionLabels: Record<string, string> = {
  pendiente:     'Pendiente',
  validado:      'Validado',
  rechazado:     'Rechazado',
  en_aclaracion: 'En aclaración',
}

function fmtMonto(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function CorteDetalleClient({ periodo, resumen, rol }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [modalPago, setModalPago] = useState(false)
  const [metodoPago, setMetodoPago] = useState('transferencia')
  const [referencia, setReferencia] = useState('')
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  async function exec(fn: () => Promise<{ error?: string } | undefined>) {
    setLoading(true)
    setErrorMsg(null)
    const result = await fn()
    setLoading(false)
    if (result?.error) {
      setErrorMsg(result.error)
    } else {
      router.refresh()
    }
  }

  async function handlePago(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('metodo_pago', metodoPago)
    fd.set('referencia_pago', referencia)
    await exec(() => registrarPagoPeriodo(periodo.id, fd))
    setModalPago(false)
  }

  const esBorrador    = periodo.estado === 'borrador'
  const esRevision    = periodo.estado === 'en_revision'
  const esValidado    = periodo.estado === 'validado'
  const esAutorizado  = periodo.estado === 'autorizado'
  const esCerrado     = ['pagado', 'cerrado', 'cancelado'].includes(periodo.estado)
  const esAdmin       = rol === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/cortes" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-[#1B2B4B]">{periodo.nombre}</h1>
            <Badge className="text-xs">{estadoLabels[periodo.estado]}</Badge>
          </div>
          <p className="text-gray-500 text-sm ml-6">
            {fmtFecha(periodo.fecha_inicio)} — {fmtFecha(periodo.fecha_fin)}
            {periodo.fecha_programada_pago && (
              <> · Pago programado: {fmtFecha(periodo.fecha_programada_pago)}</>
            )}
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex gap-2 flex-wrap">
          {esBorrador && (
            <Button
              onClick={() => exec(() => generarPartidas(periodo.id))}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-1 text-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Generar partidas
            </Button>
          )}
          {(esBorrador || esRevision) && (
            <Button
              onClick={() => exec(() => marcarPeriodoEnRevision(periodo.id))}
              disabled={loading || esRevision}
              variant="outline"
              className="text-sm"
            >
              Enviar a revisión
            </Button>
          )}
          {(esRevision || esBorrador) && (
            <Button
              onClick={() => exec(() => marcarPeriodoValidado(periodo.id))}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm"
            >
              Marcar validado
            </Button>
          )}
          {esValidado && esAdmin && (
            <Button
              onClick={() => exec(() => autorizarPayrollPeriod(periodo.id))}
              disabled={loading}
              className="bg-[#1B2B4B] hover:bg-[#253d6b] text-white flex items-center gap-1 text-sm"
            >
              <Shield className="h-3.5 w-3.5" />
              Autorizar corte
            </Button>
          )}
          {esAutorizado && esAdmin && (
            <Button
              onClick={() => setModalPago(true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 text-sm"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Registrar pago
            </Button>
          )}
          {!esCerrado && esAdmin && (
            <Button
              onClick={() => setShowCancel(true)}
              disabled={loading}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 text-sm"
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded">
          {errorMsg}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xl font-bold text-[#1B2B4B]">{periodo.total_turnos}</p>
                <p className="text-xs text-gray-500">Turnos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xl font-bold text-[#1B2B4B]">{periodo.total_horas.toFixed(1)}h</p>
                <p className="text-xs text-gray-500">Horas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xl font-bold text-[#1B2B4B]">{fmtMonto(periodo.total_bruto)}</p>
            <p className="text-xs text-gray-500">Importe bruto</p>
          </CardContent>
        </Card>
        <Card className="border-[#2AABBF]/30 bg-[#2AABBF]/5">
          <CardContent className="pt-4">
            <p className="text-xl font-bold text-[#1B2B4B]">{fmtMonto(periodo.total_pagar)}</p>
            <p className="text-xs text-gray-500 font-medium">Total a pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por enfermero */}
      {resumen.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-400 text-sm">
            No hay partidas generadas. Usa &quot;Generar partidas&quot; para calcular los pagos.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {resumen.map(enf => (
            <Card key={enf.enfermero_id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-[#1B2B4B]">
                    {enf.enfermero_nombre} {enf.enfermero_apellido}
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#1B2B4B]">{fmtMonto(enf.total_pagar)}</p>
                    <p className="text-xs text-gray-400">{enf.total_turnos} turnos · {enf.total_horas.toFixed(1)}h</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {enf.items.map(item => {
                    const turno   = item.turno as { id: string; fecha_inicio: string; fecha_fin?: string } | null
                    const caso    = item.caso  as { id: string; titulo: string } | null
                    const pac     = item.paciente as { nombre: string; apellido: string } | null

                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-700">
                              {pac ? `${pac.nombre} ${pac.apellido}` : caso?.titulo ?? '—'}
                            </span>
                            {turno && (
                              <span className="text-xs text-gray-400">
                                {new Date(turno.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                {turno.fecha_fin && ` · ${fmtHora(turno.fecha_inicio)}–${fmtHora(turno.fecha_fin)}`}
                              </span>
                            )}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                              item.estado_validacion === 'validado'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : item.estado_validacion === 'en_aclaracion'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : item.estado_validacion === 'rechazado'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {validacionLabels[item.estado_validacion]}
                            </span>
                          </div>
                          {item.motivo_ajuste && (
                            <p className="text-xs text-orange-600 mt-0.5">{item.motivo_ajuste}</p>
                          )}
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <div className="text-gray-700">{item.horas_pagables.toFixed(1)}h × {fmtMonto(item.tarifa_hora)}</div>
                          <div className="font-semibold">{fmtMonto(item.total_pagar)}</div>
                        </div>
                        {/* Acciones de validación para jefatura */}
                        {!esCerrado && item.estado_validacion === 'pendiente' && (
                          <div className="flex gap-1 ml-3">
                            <button
                              onClick={() => exec(() => validarPayrollItem(item.id, { estado: 'validado' }))}
                              disabled={loading}
                              title="Validar"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => exec(() => validarPayrollItem(item.id, { estado: 'en_aclaracion', motivo_ajuste: 'Requiere aclaración' }))}
                              disabled={loading}
                              title="Solicitar aclaración"
                              className="text-orange-500 hover:text-orange-600"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => exec(() => validarPayrollItem(item.id, { estado: 'rechazado', motivo_ajuste: 'Rechazado por jefatura' }))}
                              disabled={loading}
                              title="Rechazar"
                              className="text-red-500 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de pago */}
      {modalPago && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle>Registrar Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePago} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Método de pago</label>
                  <select
                    value={metodoPago}
                    onChange={e => setMetodoPago(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-full"
                  >
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="deposito">Depósito</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Referencia / Folio</label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={e => setReferencia(e.target.value)}
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="Número de transferencia, folio..."
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Total a pagar: <strong>{fmtMonto(periodo.total_pagar)}</strong>
                </p>
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                    Confirmar pago
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setModalPago(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal cancelación */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle className="text-red-600">Cancelar Periodo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Esta acción no se puede deshacer. El periodo pasará a estado cancelado.
              </p>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Motivo de cancelación</label>
                <textarea
                  value={cancelMotivo}
                  onChange={e => setCancelMotivo(e.target.value)}
                  rows={2}
                  required
                  className="border rounded px-3 py-2 text-sm w-full resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (!cancelMotivo.trim()) return
                    exec(() => cancelarPayrollPeriod(periodo.id, cancelMotivo))
                    setShowCancel(false)
                  }}
                  disabled={!cancelMotivo.trim() || loading}
                  variant="destructive"
                >
                  Cancelar corte
                </Button>
                <Button variant="outline" onClick={() => setShowCancel(false)}>
                  Volver
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
