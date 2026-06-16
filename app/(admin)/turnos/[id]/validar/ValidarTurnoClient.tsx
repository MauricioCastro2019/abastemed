'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validarTurno } from '@/lib/actions/turnos'
import type { TurnoConValidacion } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, AlertCircle, Clock, User, FileText, Activity } from 'lucide-react'

interface Props {
  turno: TurnoConValidacion
  rol: string
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ValidarTurnoClient({ turno }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [horasPagables, setHorasPagables] = useState<string>(
    (turno.horas_pagables ?? turno.horas_trabajadas ?? 0).toString()
  )

  const caso     = turno.caso as {
    id: string; titulo: string; direccion?: string; tarifa_hora?: number; tarifa_costo_hora?: number
    paciente?: { nombre: string; apellido: string; diagnostico: string } | null
  } | null
  const enfermero = turno.enfermero as { nombre: string; apellido: string; cedula?: string; telefono?: string } | null
  const reporte   = Array.isArray(turno.reporte) ? turno.reporte[0] : turno.reporte as {
    id: string; signos_vitales?: Record<string, string>; estado_general?: string
    medicamentos_administrados?: unknown[]; observaciones?: string; pendientes?: string
  } | null
  const entrega   = Array.isArray(turno.entrega) ? turno.entrega[0] : turno.entrega as {
    id: string; observaciones?: string; incidentes?: string
  } | null
  const paciente  = Array.isArray(caso?.paciente) ? caso?.paciente[0] : caso?.paciente

  const duracionHoras = turno.fecha_fin
    ? ((new Date(turno.fecha_fin).getTime() - new Date(turno.fecha_inicio).getTime()) / 3600000).toFixed(1)
    : '—'

  async function accion(status: 'validado' | 'rechazado' | 'en_aclaracion') {
    if ((status === 'rechazado' || status === 'en_aclaracion') && !motivo.trim()) {
      setError('Debes indicar el motivo para rechazar o enviar a aclaración.')
      return
    }

    setLoading(true)
    setError(null)

    const result = await validarTurno(turno.id, {
      validacion_status: status,
      horas_pagables:   status === 'validado' ? parseFloat(horasPagables) || undefined : undefined,
      motivo:           motivo.trim() || undefined,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push('/turnos/validacion')
    router.refresh()
  }

  const yaValidado = turno.validacion_status === 'validado' || turno.validacion_status === 'rechazado'

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#1B2B4B]">Validar Turno</h1>
          {turno.validacion_status === 'validado' && (
            <Badge className="bg-green-100 text-green-700 border-green-300">Validado</Badge>
          )}
          {turno.validacion_status === 'rechazado' && (
            <Badge variant="destructive">Rechazado</Badge>
          )}
          {turno.validacion_status === 'en_aclaracion' && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-300">En aclaración</Badge>
          )}
          {turno.validacion_status === 'pendiente' && (
            <Badge variant="secondary">Pendiente</Badge>
          )}
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Revisa la información del turno antes de aprobar su pago.
        </p>
      </div>

      {/* Datos del turno */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#2AABBF]" />
            Datos del Turno
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 block">Paciente</span>
            <span className="font-medium">
              {paciente ? `${paciente.nombre} ${paciente.apellido}` : caso?.titulo ?? '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Enfermero</span>
            <span className="font-medium">
              {enfermero ? `${enfermero.nombre} ${enfermero.apellido}` : '—'}
            </span>
            {enfermero?.cedula && <span className="text-xs text-gray-400"> (Cédula: {enfermero.cedula})</span>}
          </div>
          <div>
            <span className="text-gray-500 block">Inicio</span>
            <span>{fmt(turno.fecha_inicio)}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Fin</span>
            <span>{turno.fecha_fin ? fmt(turno.fecha_fin) : '—'}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Duración</span>
            <span className="font-semibold text-[#1B2B4B]">{duracionHoras}h</span>
          </div>
          <div>
            <span className="text-gray-500 block">Tarifa de cobro</span>
            <span>${(caso?.tarifa_hora ?? 0).toFixed(2)}/h</span>
          </div>
          {paciente?.diagnostico && (
            <div className="col-span-2">
              <span className="text-gray-500 block">Diagnóstico</span>
              <span>{paciente.diagnostico}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reporte */}
      <Card className={reporte ? 'border-green-200' : 'border-orange-200 bg-orange-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className={`h-4 w-4 ${reporte ? 'text-green-600' : 'text-orange-500'}`} />
            Reporte Clínico
            {reporte
              ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Registrado</Badge>
              : <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Sin reporte</Badge>
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {reporte ? (
            <div className="space-y-2">
              {reporte.estado_general && (
                <div>
                  <span className="text-gray-500">Estado general: </span>
                  <span className="capitalize">{reporte.estado_general}</span>
                </div>
              )}
              {reporte.signos_vitales && Object.keys(reporte.signos_vitales).length > 0 && (
                <div>
                  <span className="text-gray-500 block mb-1">Signos vitales:</span>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(reporte.signos_vitales) as [string, string][]).map(([k, v]) => v && (
                      <span key={k} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {k.replace(/_/g, ' ')}: {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {reporte.medicamentos_administrados && Array.isArray(reporte.medicamentos_administrados) && (
                <div>
                  <span className="text-gray-500">Medicamentos: </span>
                  <span>{reporte.medicamentos_administrados.length} registrados</span>
                </div>
              )}
              {reporte.observaciones && (
                <div>
                  <span className="text-gray-500 block">Observaciones:</span>
                  <p className="text-gray-700">{reporte.observaciones}</p>
                </div>
              )}
              {reporte.pendientes && (
                <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                  <span className="text-yellow-700 font-medium text-xs">Pendientes:</span>
                  <p className="text-yellow-800 text-xs mt-0.5">{reporte.pendientes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-orange-700">Este turno no tiene reporte clínico. Considera solicitar aclaración.</p>
          )}
        </CardContent>
      </Card>

      {/* Entrega */}
      {entrega && (
        <Card className="border-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Entrega de Turno
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {entrega.incidentes && (
              <div className="bg-red-50 border border-red-200 p-2 rounded mb-2">
                <span className="text-red-700 font-medium text-xs">Incidentes:</span>
                <p className="text-red-800 text-xs mt-0.5">{entrega.incidentes}</p>
              </div>
            )}
            {entrega.observaciones && (
              <p className="text-gray-700">{entrega.observaciones}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Acciones de validación */}
      {!yaValidado && (
        <Card className="border-[#2AABBF]/30 bg-[#2AABBF]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#2AABBF]" />
              Validación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Horas pagables */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">
                Horas pagables
                <span className="text-xs text-gray-400 ml-1">(duración del turno: {duracionHoras}h)</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={horasPagables}
                onChange={e => setHorasPagables(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-32"
              />
            </div>

            {/* Motivo */}
            <div>
              <label className="text-sm text-gray-600 block mb-1">
                Motivo / Observación
                <span className="text-xs text-red-400 ml-1">(requerido para rechazar o enviar a aclaración)</span>
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={2}
                placeholder="Escribe aquí si rechazas o solicitas aclaración..."
                className="border rounded px-3 py-2 text-sm w-full resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => accion('validado')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Validar turno
              </Button>

              <Button
                onClick={() => accion('en_aclaracion')}
                disabled={loading}
                variant="outline"
                className="border-orange-400 text-orange-600 hover:bg-orange-50 flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                Solicitar aclaración
              </Button>

              <Button
                onClick={() => accion('rechazado')}
                disabled={loading}
                variant="outline"
                className="border-red-400 text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {yaValidado && turno.validado_at && (
        <div className="text-sm text-gray-500">
          {turno.validacion_status === 'validado' ? 'Validado' : 'Rechazado'} el{' '}
          {new Date(turno.validado_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}
