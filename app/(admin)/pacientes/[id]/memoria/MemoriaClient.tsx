'use client'

import { useState } from 'react'
import {
  Brain, ScanLine, ListTodo, ShieldAlert, Eye, Clock,
} from 'lucide-react'
import { HallazgosPanel }    from '@/components/admin/memoria/HallazgosPanel'
import { PendientesPanel }   from '@/components/admin/memoria/PendientesPanel'
import { AlertasActivasPanel } from '@/components/admin/memoria/AlertasActivasPanel'
import { VigilanciaPanel }   from '@/components/admin/memoria/VigilanciaPanel'
import { TimelinePanel }     from '@/components/admin/memoria/TimelinePanel'
import type {
  HallazgoClinico, PendienteCaso, AlertaActiva,
  VigilanciaEspecial, EventoTimeline,
} from '@/types'

type TabId = 'resumen' | 'hallazgos' | 'pendientes' | 'vigilancias' | 'timeline'

interface MemoriaClientProps {
  casoId: string
  hallazgos: HallazgoClinico[]
  pendientes: PendienteCaso[]
  alertas: AlertaActiva[]
  vigilancias: VigilanciaEspecial[]
  timeline: EventoTimeline[]
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'resumen',     label: 'Resumen',    icon: <Brain size={14} /> },
  { id: 'hallazgos',   label: 'Hallazgos',  icon: <ScanLine size={14} /> },
  { id: 'pendientes',  label: 'Pendientes', icon: <ListTodo size={14} /> },
  { id: 'vigilancias', label: 'Vigilancias', icon: <Eye size={14} /> },
  { id: 'timeline',    label: 'Cronología', icon: <Clock size={14} /> },
]

// ─── Tab Resumen operativo ────────────────────────────────────
function TabResumen({
  casoId, hallazgos, pendientes, alertas, vigilancias,
}: Omit<MemoriaClientProps, 'timeline'>) {
  const hallazgosAbiertos = hallazgos.filter(h => h.estado !== 'resuelto')
  const pendientesActivos = pendientes.filter(p => p.estado === 'pendiente' || p.estado === 'en_proceso')
  const urgentes          = pendientesActivos.filter(p => p.prioridad === 'urgente')
  const alertasCriticas   = alertas.filter(a => a.nivel === 'critico' || a.nivel === 'alto')

  return (
    <div className="space-y-6">
      {/* Estado general */}
      {(alertasCriticas.length > 0 || urgentes.length > 0) && (
        <div className="rounded-xl border p-4 space-y-2"
          style={{ backgroundColor: '#FEF2F2', borderColor: '#fca5a5' }}>
          <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
            Requiere atención inmediata
          </p>
          {alertasCriticas.length > 0 && (
            <p className="text-xs" style={{ color: '#b91c1c' }}>
              · {alertasCriticas.length} alerta{alertasCriticas.length > 1 ? 's' : ''} de nivel alto/crítico activa{alertasCriticas.length > 1 ? 's' : ''}
            </p>
          )}
          {urgentes.length > 0 && (
            <p className="text-xs" style={{ color: '#b91c1c' }}>
              · {urgentes.length} pendiente{urgentes.length > 1 ? 's' : ''} urgente{urgentes.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Alertas activas */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <AlertasActivasPanel alertas={alertas} casoId={casoId} compact />
        </div>
      )}

      {/* 2 columnas: hallazgos + pendientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <HallazgosPanel
            hallazgos={hallazgosAbiertos}
            casoId={casoId}
            compact
          />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <PendientesPanel
            pendientes={pendientesActivos}
            casoId={casoId}
            compact
          />
        </div>
      </div>

      {/* Vigilancias */}
      {vigilancias.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <VigilanciaPanel vigilancias={vigilancias} casoId={casoId} compact />
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Hallazgos abiertos', value: hallazgosAbiertos.length, color: '#dc2626' },
          { label: 'Pendientes activos', value: pendientesActivos.length, color: '#d97706' },
          { label: 'Alertas activas',    value: alertas.length,           color: '#7c3aed' },
          { label: 'Vigilancias activas', value: vigilancias.length,      color: '#2AABBF' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold mb-1" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-400 leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────
export function MemoriaClient({
  casoId, hallazgos, pendientes, alertas, vigilancias, timeline,
}: MemoriaClientProps) {
  const [tab, setTab] = useState<TabId>('resumen')

  const badgeCount: Partial<Record<TabId, number>> = {
    hallazgos:   hallazgos.filter(h => h.estado !== 'resuelto').length,
    pendientes:  pendientes.filter(p => p.estado === 'pendiente' || p.estado === 'en_proceso').length,
    vigilancias: vigilancias.length,
  }
  if (alertas.length > 0) badgeCount.resumen = alertas.length

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <div className="flex border-b border-gray-100 min-w-max">
          {TABS.map(t => {
            const count = badgeCount[t.id]
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
                  tab === t.id
                    ? 'border-[#2AABBF] text-[#1B2B4B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span style={{ color: tab === t.id ? '#2AABBF' : undefined }}>{t.icon}</span>
                {t.label}
                {count != null && count > 0 && (
                  <span className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                    style={{ backgroundColor: t.id === 'resumen' ? '#dc2626' : '#1B2B4B', fontSize: 9 }}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenido del tab */}
      <div>
        {tab === 'resumen' && (
          <TabResumen
            casoId={casoId}
            hallazgos={hallazgos}
            pendientes={pendientes}
            alertas={alertas}
            vigilancias={vigilancias}
          />
        )}
        {tab === 'hallazgos' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <HallazgosPanel hallazgos={hallazgos} casoId={casoId} />
          </div>
        )}
        {tab === 'pendientes' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <PendientesPanel pendientes={pendientes} casoId={casoId} />
          </div>
        )}
        {tab === 'vigilancias' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <VigilanciaPanel vigilancias={vigilancias} casoId={casoId} />
            </div>
            {alertas.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <AlertasActivasPanel alertas={alertas} casoId={casoId} />
              </div>
            )}
          </div>
        )}
        {tab === 'timeline' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <TimelinePanel eventos={timeline} />
          </div>
        )}
      </div>
    </div>
  )
}
