import { getTurno } from '@/lib/actions/turnos'
import { getReportesByTurno } from '@/lib/actions/reportes-turno'
import { getKardexActivo } from '@/lib/actions/kardex'
import { ReporteTurnoForm } from '@/components/admin/turnos/ReporteTurnoForm'
import { ArrowLeft, FileText, Heart, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Caso, Paciente, Enfermero } from '@/types'

function formatFechaCorta(f: string) {
  return new Date(f).toLocaleString('es-MX', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatFecha(f: string) {
  return new Date(f).toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function ReporteTurnoPage({ params }: { params: { id: string } }) {
  let turno
  try {
    turno = await getTurno(params.id)
  } catch {
    notFound()
  }

  const [reportes, kardex] = await Promise.all([
    getReportesByTurno(params.id),
    turno.caso_id ? getKardexActivo(turno.caso_id) : Promise.resolve([]),
  ])

  const caso     = turno.caso as (Caso & { paciente?: Paciente }) | null
  const paciente = caso?.paciente
  const enfermero = turno.enfermero as Enfermero | null
  const yaHayReporte = reportes.length > 0

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/turnos/${params.id}`}
            className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FileText size={20} style={{ color: '#2AABBF' }} />
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
                Reporte de Turno
              </h1>
            </div>
            {paciente && (
              <p className="text-sm text-gray-500 mt-0.5">
                {paciente.nombre} {paciente.apellido} · {caso?.titulo}
              </p>
            )}
          </div>
        </div>
        <Link href={`/casos/${turno.caso_id}/incidencias`}
          className="text-xs text-[#2AABBF] hover:underline flex-shrink-0">
          Ver incidencias →
        </Link>
      </div>

      {/* Info del turno */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Clock size={11} /> Inicio
            </p>
            <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
              {formatFechaCorta(turno.fecha_inicio)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Clock size={11} /> Fin
            </p>
            <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
              {formatFechaCorta(turno.fecha_fin)}
            </p>
          </div>
          {enfermero && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Enfermero/a</p>
              <p className="text-sm font-medium" style={{ color: '#1B2B4B' }}>
                {enfermero.nombre} {enfermero.apellido}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 mb-1">Estado</p>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              turno.status === 'activo' ? 'bg-emerald-100 text-emerald-700' :
              turno.status === 'completado' ? 'bg-gray-100 text-gray-600' :
              'bg-blue-100 text-blue-700'
            }`}>
              {turno.status === 'activo' ? 'En curso' :
               turno.status === 'completado' ? 'Completado' : 'Programado'}
            </span>
          </div>
        </div>
      </div>

      {/* Reportes anteriores de este turno */}
      {yaHayReporte && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              Ya existe {reportes.length} reporte{reportes.length > 1 ? 's' : ''} para este turno
            </p>
          </div>
          <div className="space-y-2">
            {reportes.map(r => {
              const enf = r.enfermero as { nombre: string; apellido: string } | null
              return (
                <div key={r.id} className="flex items-center gap-3 text-sm">
                  <CheckCircle size={14} className="text-amber-500 flex-shrink-0" />
                  <span className="text-amber-700">
                    Registrado el {formatFecha(r.created_at)}
                    {enf && ` por ${enf.nombre} ${enf.apellido}`}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-amber-600 mt-3">
            Puedes registrar un reporte adicional si es necesario.
          </p>
        </div>
      )}

      {/* Medicamentos activos en el kardex */}
      {kardex.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={15} className="text-purple-600" />
            <p className="text-sm font-semibold text-purple-800">
              Kardex activo — {kardex.length} medicamento{kardex.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {kardex.map(k => (
              <div key={k.id} className="text-xs bg-white rounded-lg px-3 py-1.5 border border-purple-100">
                <span className="font-medium text-purple-800">{k.nombre}</span>
                {k.dosis && <span className="text-purple-500"> · {k.dosis}</span>}
                {k.horarios.length > 0 && (
                  <span className="text-purple-400"> · {k.horarios.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-purple-500 mt-2">
            Estos medicamentos aparecerán pre-cargados en el formulario para marcar su administración.
          </p>
        </div>
      )}

      {/* Formulario */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          {yaHayReporte ? 'Nuevo reporte adicional' : 'Registrar reporte de turno'}
        </h2>
        <ReporteTurnoForm
          turnoId={params.id}
          casoId={turno.caso_id}
          enfermeroId={turno.enfermero_id}
          kardex={kardex}
        />
      </div>
    </div>
  )
}
