import { getMisTurnos } from '@/lib/actions/enfermero-portal'
import { getEntregaGuiadaByTurno } from '@/lib/actions/entrega-guiada'
import { EntregaGuiadaWizard } from '@/components/admin/memoria/EntregaGuiadaWizard'
import { CopyButton } from '@/components/admin/memoria/CopyButton'
import {
  ArrowLeft, ArrowLeftRight, CheckCircle2,
  Users, Heart, Clock, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Turno, Paciente, Caso, EstadoPacienteEntrega } from '@/types'

function fmtFecha(f: string) {
  return new Date(f).toLocaleString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

const ESTADO_CFG: Record<EstadoPacienteEntrega, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  mejor: { label: 'Mejorando', color: '#059669', bg: '#ECFDF5', Icon: TrendingUp   },
  igual: { label: 'Estable',   color: '#2563eb', bg: '#EFF6FF', Icon: Minus        },
  peor:  { label: 'Deterioro', color: '#dc2626', bg: '#FEF2F2', Icon: TrendingDown },
}

export default async function EntregaGuiadaEnfermeroPage({ params }: { params: { turnoId: string } }) {
  let turnos: Turno[] = []
  try { turnos = await getMisTurnos() } catch { notFound() }

  const turno = turnos.find(t => t.id === params.turnoId)
  if (!turno) notFound()

  if (turno.status === 'programado') redirect('/enfermero/turnos')

  const caso     = turno.caso as (Caso & { paciente?: Paciente }) | null
  const paciente = caso?.paciente as Paciente | undefined

  const entregaExistente = await getEntregaGuiadaByTurno(params.turnoId)

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Link href="/enfermero/turnos"
          className="text-gray-400 hover:text-[#1B2B4B] transition-colors mt-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#1B2B4B' }}>
              <ArrowLeftRight size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>
                Registro clínico del turno
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
            <Clock size={12} /> {fmtFecha(turno.fecha_inicio)}
          </span>
          <span className="text-gray-200">·</span>
          <span>{fmtFecha(turno.fecha_fin)}</span>
          {caso && <><span className="text-gray-200">·</span><span>{caso.titulo}</span></>}
        </div>
      </div>

      {/* ── Si ya existe ─────────────────────────────────────── */}
      {entregaExistente ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ backgroundColor: '#ECFDF5', border: '1px solid #a7f3d0' }}>
            <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">Registro clínico registrado</p>
              <p className="text-xs text-green-600">{fmtFecha(entregaExistente.created_at)}</p>
            </div>
            {ESTADO_CFG[entregaExistente.estado_paciente] && (() => {
              const cfg = ESTADO_CFG[entregaExistente.estado_paciente]
              const Icon = cfg.Icon
              return (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                  <Icon size={10} />
                  {cfg.label}
                </span>
              )
            })()}
          </div>

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

          {entregaExistente.pendientes_siguiente && (
            <div className="bg-white rounded-xl p-5 shadow-sm space-y-2">
              <p className="text-xs font-semibold" style={{ color: '#1B2B4B' }}>Pendientes registrados</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {entregaExistente.pendientes_siguiente}
              </p>
            </div>
          )}

          <div className="text-center pt-2">
            <Link href="/enfermero/turnos" className="text-sm text-[#2AABBF] hover:underline">
              ← Volver a mis turnos
            </Link>
          </div>
        </div>
      ) : caso ? (
        /* ── Wizard ──────────────────────────────────────────── */
        <EntregaGuiadaWizard
          turnoId={params.turnoId}
          casoId={caso.id}
          pacienteNombre={paciente
            ? `${paciente.nombre} ${paciente.apellido}`
            : caso.titulo
          }
          redirectOnSuccess="/enfermero/turnos"
        />
      ) : (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">
          <p>Sin caso asignado a este turno.</p>
        </div>
      )}
    </div>
  )
}
