import { getPayrollPeriods } from '@/lib/actions/payroll'
import { requireAuth } from '@/lib/actions/utils'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, ChevronRight, DollarSign, Users, Clock } from 'lucide-react'
import type { EstadoPayrollPeriod } from '@/types'

const estadoConfig: Record<EstadoPayrollPeriod, { label: string; color: string }> = {
  borrador:           { label: 'Borrador',          color: 'bg-gray-100 text-gray-600 border-gray-200' },
  en_revision:        { label: 'En revisión',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  validado:           { label: 'Validado',          color: 'bg-purple-100 text-purple-700 border-purple-200' },
  autorizado:         { label: 'Autorizado',        color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  parcialmente_pagado:{ label: 'Parcial',           color: 'bg-orange-100 text-orange-700 border-orange-200' },
  pagado:             { label: 'Pagado',            color: 'bg-green-100 text-green-700 border-green-200' },
  cerrado:            { label: 'Cerrado',           color: 'bg-gray-200 text-gray-500 border-gray-300' },
  cancelado:          { label: 'Cancelado',         color: 'bg-red-100 text-red-600 border-red-200' },
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMonto(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function CortesPage() {
  const { perfil } = await requireAuth()
  if (!['admin', 'jefe_enfermeros'].includes(perfil.rol)) {
    return <div className="p-8 text-red-600">Acceso no autorizado.</div>
  }

  const periodos = await getPayrollPeriods()

  const activos  = periodos.filter(p => !['pagado', 'cerrado', 'cancelado'].includes(p.estado))
  const cerrados = periodos.filter(p =>  ['pagado', 'cerrado', 'cancelado'].includes(p.estado))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B]">Cortes y Pagos de Personal</h1>
          <p className="text-gray-500 text-sm mt-1">
            Genera cortes semanales, valida turnos y administra pagos al equipo.
          </p>
        </div>
        {perfil.rol === 'admin' && (
          <Link
            href="/cortes/nuevo"
            className="flex items-center gap-2 bg-[#1B2B4B] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#253d6b] transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo corte
          </Link>
        )}
      </div>

      {periodos.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay periodos de corte</p>
            <p className="text-sm mt-1">Crea el primer corte para comenzar.</p>
          </CardContent>
        </Card>
      )}

      {activos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Activos</h2>
          <div className="space-y-3">
            {activos.map(p => {
              const cfg = estadoConfig[p.estado]
              return (
                <Link key={p.id} href={`/cortes/${p.id}`}>
                  <Card className="hover:border-[#2AABBF] transition cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#1B2B4B]">{p.nombre}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500 flex gap-4 flex-wrap">
                            <span>{fmtFecha(p.fecha_inicio)} — {fmtFecha(p.fecha_fin)}</span>
                            {p.fecha_programada_pago && (
                              <span>Pago programado: {fmtFecha(p.fecha_programada_pago)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {p.total_turnos} turnos
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {p.total_horas.toFixed(1)}h
                            </span>
                            <span className="font-bold text-[#1B2B4B] text-base">
                              {fmtMonto(p.total_pagar)}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 ml-auto mt-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {cerrados.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial</h2>
          <div className="space-y-2">
            {cerrados.map(p => {
              const cfg = estadoConfig[p.estado]
              return (
                <Link key={p.id} href={`/cortes/${p.id}`}>
                  <Card className="opacity-80 hover:opacity-100 transition cursor-pointer">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">{p.nombre}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
                          <span>{p.total_turnos} turnos</span>
                          <span className="font-medium text-gray-700">{fmtMonto(p.total_pagar)}</span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
