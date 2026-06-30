import { getResumenCobertura } from '@/lib/actions/equipo-cuidado'
import {
  CheckCircle2, AlertTriangle, XCircle, Calendar,
  Users, Plus, Filter, Layers
} from 'lucide-react'
import Link from 'next/link'

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

const ESTADO_CONFIG = {
  cubierta: {
    label: 'Cubierta',
    color: '#059669',
    bg: '#ECFDF5',
    icon: CheckCircle2,
  },
  incompleta: {
    label: 'Incompleta',
    color: '#d97706',
    bg: '#FEF3C7',
    icon: AlertTriangle,
  },
  sin_titular: {
    label: 'Sin titular',
    color: '#dc2626',
    bg: '#FEF2F2',
    icon: XCircle,
  },
}

export default async function CoberturaPage() {
  let resumen: Awaited<ReturnType<typeof getResumenCobertura>> = []

  try {
    resumen = await getResumenCobertura()
  } catch {
    // sin datos
  }

  const total       = resumen.length
  const cubiertas   = resumen.filter(r => r.estado_cobertura === 'cubierta').length
  const incompletas = resumen.filter(r => r.estado_cobertura === 'incompleta').length
  const sinTitular  = resumen.filter(r => r.estado_cobertura === 'sin_titular').length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={18} style={{ color: '#2AABBF' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Cobertura de pacientes</h1>
          </div>
          <p className="text-sm text-gray-500">
            Vista global del estado de equipo para cada paciente activo
          </p>
        </div>
        <Link
          href="/pacientes"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white text-gray-600">
          <Users size={14} /> Ver pacientes
        </Link>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pacientes activos', value: total, color: '#1B2B4B', bg: '#F0F4FF', icon: Users },
          { label: 'Cobertura completa', value: cubiertas, color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
          { label: 'Equipo incompleto', value: incompletas, color: '#d97706', bg: '#FEF3C7', icon: AlertTriangle },
          { label: 'Sin titular', value: sinTitular, color: '#dc2626', bg: '#FEF2F2', icon: XCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
              style={{ backgroundColor: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabla de cobertura */}
      {resumen.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Users size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Sin pacientes activos</p>
          <p className="text-xs text-gray-400 mt-1">Los pacientes activos aparecerán aquí con el estado de su equipo de cuidado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Próxima guardia</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {resumen.map(row => {
                  const estadoCfg = ESTADO_CONFIG[row.estado_cobertura]
                  const Icon = estadoCfg.icon
                  return (
                    <tr key={row.paciente_id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: '#1B2B4B' }}>
                            {row.paciente_nombre[0]}{row.paciente_apellido[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {row.paciente_nombre} {row.paciente_apellido}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-gray-400" />
                          <span className="text-sm text-gray-700 font-medium">{row.total_activos}</span>
                          <span className="text-xs text-gray-400">
                            miembro{row.total_activos !== 1 ? 's' : ''}
                          </span>
                          {!row.tiene_titular && row.total_activos > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full ml-1"
                              style={{ backgroundColor: '#FEF3C7', color: '#92400e' }}>
                              sin titular
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {row.proxima_guardia ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="text-xs">{formatFecha(row.proxima_guardia)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">Sin guardia programada</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: estadoCfg.bg, color: estadoCfg.color }}>
                          <Icon size={11} />
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/pacientes/${row.paciente_id}/equipo`}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white">
                          Equipo
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={12} style={{ color: '#059669' }} />
          Cubierta: tiene titular + 2 o más miembros
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={12} style={{ color: '#d97706' }} />
          Incompleta: tiene titular pero menos de 2 miembros
        </span>
        <span className="flex items-center gap-1.5">
          <XCircle size={12} style={{ color: '#dc2626' }} />
          Sin titular: ningún miembro marcado como titular
        </span>
      </div>
    </div>
  )
}
