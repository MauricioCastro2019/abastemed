import { getTurno } from '@/lib/actions/turnos'
import { getEntregaGuiadaByTurno } from '@/lib/actions/entrega-guiada'
import { EntregaGuiadaWizard } from '@/components/admin/memoria/EntregaGuiadaWizard'
import { CopyButton } from '@/components/admin/memoria/CopyButton'
import { ArrowLeft, ArrowLeftRight, CheckCircle2, Users, Heart, Clock } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Paciente, Caso, EstadoPacienteEntrega } from '@/types'

function formatFecha(f: string) {
  return new Date(f).toLocaleString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

const ESTADO_BADGE: Record<EstadoPacienteEntrega, { label: string; color: string; bg: string }> = {
  mejor: { label: 'Mejor',  color: '#059669', bg: '#ECFDF5' },
  igual: { label: 'Igual',  color: '#2563eb', bg: '#EFF6FF' },
  peor:  { label: 'Peor',   color: '#dc2626', bg: '#FEF2F2' },
}

export default async function EntregaGuiadaPage({ params }: { params: { id: string } }) {
  let turno
  try {
    turno = await getTurno(params.id)
  } catch {
    notFound()
  }

  // Solo disponible para turnos activos o completados
  if (turno.status === 'programado') {
    redirect(`/turnos/${params.id}`)
  }

  const caso     = turno.caso as (Caso & { paciente?: Paciente }) | null
  const paciente = caso?.paciente as Paciente | undefined

  // Verificar si ya existe una entrega guiada
  const entregaExistente = await getEntregaGuiadaByTurno(params.id)

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Link href={`/turnos/${params.id}`}
          className="text-gray-400 hover:text-[#1B2B4B] transition-colors mt-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#1B2B4B' }}>
              <ArrowLeftRight size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>
                Entrega de turno
              </h1>
              {paciente && (
                <p className="text-sm text-gray-500">
                  {paciente.nombre} {paciente.apellido}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Info del turno ──────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> Inicio: {formatFecha(turno.fecha_inicio)}
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-1.5">
            Fin: {formatFecha(turno.fecha_fin)}
          </span>
          {caso && (
            <>
              <span className="text-gray-200">·</span>
              <span>{caso.titulo}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Si ya existe una entrega: mostrarla ─────────────── */}
      {entregaExistente ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                Entrega de turno ya registrada
              </p>
              <p className="text-xs text-green-600">
                {formatFecha(entregaExistente.created_at)}
              </p>
            </div>
            {ESTADO_BADGE[entregaExistente.estado_paciente] && (
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: ESTADO_BADGE[entregaExistente.estado_paciente].bg,
                  color:           ESTADO_BADGE[entregaExistente.estado_paciente].color,
                }}>
                Paciente {ESTADO_BADGE[entregaExistente.estado_paciente].label}
              </span>
            )}
          </div>

          {/* Resumen para siguiente enfermera */}
          {entregaExistente.resumen_turno && (
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={14} style={{ color: '#2AABBF' }} />
                  <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>
                    Resumen para siguiente turno
                  </p>
                </div>
                <CopyButton text={entregaExistente.resumen_turno} />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg px-4 py-3">
                {entregaExistente.resumen_turno}
              </p>
            </div>
          )}

          {/* Resumen familiar */}
          {entregaExistente.resumen_familiar && (
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-pink-500" />
                  <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>
                    Resumen para familiar
                  </p>
                </div>
                <CopyButton text={entregaExistente.resumen_familiar} label="Copiar para WhatsApp" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-pink-50 rounded-lg px-4 py-3">
                {entregaExistente.resumen_familiar}
              </p>
            </div>
          )}

          {/* Pendientes y vigilancia */}
          {entregaExistente.pendientes_siguiente && (
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-2">
              <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>
                Pendientes registrados
              </p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {entregaExistente.pendientes_siguiente}
              </p>
            </div>
          )}

          {entregaExistente.notificar_coordinacion && entregaExistente.notas_coordinacion && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-800">
              <p className="font-medium mb-1 text-xs">Nota para coordinación</p>
              <p>{entregaExistente.notas_coordinacion}</p>
            </div>
          )}

          <div className="text-center pt-2">
            <Link href={`/turnos/${params.id}`}
              className="text-sm text-[#2AABBF] hover:underline">
              ← Volver al turno
            </Link>
          </div>
        </div>
      ) : (
        /* ── Wizard si no existe entrega ─────────────────────── */
        caso ? (
          <EntregaGuiadaWizard
            turnoId={params.id}
            casoId={caso.id}
            pacienteNombre={paciente
              ? `${paciente.nombre} ${paciente.apellido}`
              : caso.titulo
            }
          />
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <p>Sin caso asignado a este turno.</p>
          </div>
        )
      )}
    </div>
  )
}
