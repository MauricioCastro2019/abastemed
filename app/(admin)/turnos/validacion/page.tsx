import { getTurnosPendientesValidacion } from '@/lib/actions/turnos'
import { requireAuth } from '@/lib/actions/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react'

function validacionBadge(status: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pendiente:      { label: 'Pendiente',      variant: 'secondary' },
    en_revision:    { label: 'En revisión',    variant: 'default' },
    en_aclaracion:  { label: 'En aclaración',  variant: 'destructive' },
  }
  const cfg = map[status] ?? { label: status, variant: 'outline' }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default async function ValidacionTurnosPage() {
  const { perfil } = await requireAuth()
  if (!['admin', 'coordinador'].includes(perfil.rol)) {
    return <div className="p-8 text-red-600">Acceso no autorizado.</div>
  }

  const turnos = await getTurnosPendientesValidacion()

  const pendientes    = turnos.filter(t => t.validacion_status === 'pendiente')
  const en_revision   = turnos.filter(t => t.validacion_status === 'en_revision')
  const en_aclaracion = turnos.filter(t => t.validacion_status === 'en_aclaracion')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2B4B]">Validación de Turnos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Revisa y valida los turnos completados antes de incluirlos en el corte de nómina.
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-700">{pendientes.length}</p>
                <p className="text-xs text-orange-600">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{en_revision.length}</p>
                <p className="text-xs text-blue-600">En revisión</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{en_aclaracion.length}</p>
                <p className="text-xs text-red-600">En aclaración</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de turnos */}
      {turnos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
            <p className="font-medium">No hay turnos pendientes de validación</p>
            <p className="text-sm mt-1">Todos los turnos completados han sido procesados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {turnos.map(turno => {
            const caso = turno.caso as {
              id: string; titulo: string; direccion?: string
              paciente?: { nombre: string; apellido: string } | null
            } | null
            const enfermero = turno.enfermero as { nombre: string; apellido: string; telefono?: string } | null
            const reporte   = Array.isArray(turno.reporte) ? turno.reporte[0] : turno.reporte
            const entrega   = Array.isArray(turno.entrega) ? turno.entrega[0] : turno.entrega
            const paciente  = Array.isArray(caso?.paciente) ? caso.paciente[0] : caso?.paciente

            const horasDuracion = turno.fecha_fin
              ? ((new Date(turno.fecha_fin).getTime() - new Date(turno.fecha_inicio).getTime()) / 3600000).toFixed(1)
              : '—'

            return (
              <Card
                key={turno.id}
                className={`border-l-4 ${
                  turno.validacion_status === 'en_aclaracion'
                    ? 'border-l-red-500'
                    : turno.validacion_status === 'en_revision'
                    ? 'border-l-blue-500'
                    : 'border-l-orange-400'
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#1B2B4B] text-sm">
                          {paciente ? `${paciente.nombre} ${paciente.apellido}` : caso?.titulo ?? 'Caso sin nombre'}
                        </span>
                        {validacionBadge(turno.validacion_status)}
                        {!reporte && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                            Sin reporte
                          </Badge>
                        )}
                        {!entrega && (
                          <Badge variant="outline" className="text-gray-500 text-xs">
                            Sin entrega
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>
                          {formatFecha(turno.fecha_inicio)} · {formatHora(turno.fecha_inicio)}–{turno.fecha_fin ? formatHora(turno.fecha_fin) : '—'}
                        </span>
                        <span className="font-medium">{horasDuracion}h</span>
                        {enfermero && <span>{enfermero.nombre} {enfermero.apellido}</span>}
                      </div>

                      {turno.motivo_validacion && (
                        <p className="mt-1 text-xs text-red-600 italic">{turno.motivo_validacion}</p>
                      )}
                    </div>

                    <Link
                      href={`/turnos/${turno.id}/validar`}
                      className="flex items-center gap-1 text-sm text-[#2AABBF] hover:underline shrink-0"
                    >
                      Revisar
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
