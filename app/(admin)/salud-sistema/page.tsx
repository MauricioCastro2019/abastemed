import { getSaludSistema } from '@/lib/actions/salud-sistema'
import { requireAuth } from '@/lib/actions/utils'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, Info, CheckCircle, ExternalLink } from 'lucide-react'
import type { GravedadProblema } from '@/types'

const gravedadConfig: Record<GravedadProblema, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  rowClass: string
  badgeClass: string
}> = {
  critico: { label: 'Crítico',  icon: AlertCircle,   rowClass: 'border-l-red-500 bg-red-50',    badgeClass: 'bg-red-100 text-red-700' },
  alto:    { label: 'Alto',     icon: AlertTriangle, rowClass: 'border-l-orange-400 bg-orange-50', badgeClass: 'bg-orange-100 text-orange-700' },
  medio:   { label: 'Medio',    icon: AlertTriangle, rowClass: 'border-l-yellow-400 bg-yellow-50', badgeClass: 'bg-yellow-100 text-yellow-700' },
  bajo:    { label: 'Bajo',     icon: Info,          rowClass: 'border-l-blue-300 bg-blue-50',  badgeClass: 'bg-blue-100 text-blue-700' },
}

export default async function SaludSistemaPage() {
  const { perfil } = await requireAuth()
  if (perfil.rol !== 'admin') {
    return <div className="p-8 text-red-600">Solo el administrador puede acceder a esta sección.</div>
  }

  const resumen = await getSaludSistema()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2B4B]">Salud del Sistema</h1>
        <p className="text-gray-500 text-sm mt-1">
          Detección automática de inconsistencias y datos problemáticos.
          Generado: {new Date(resumen.generado_at).toLocaleString('es-MX')}
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Críticos',  count: resumen.criticos, color: 'text-red-600',    bg: 'bg-red-50    border-red-200' },
          { label: 'Altos',     count: resumen.altos,    color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
          { label: 'Medios',    count: resumen.medios,   color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Bajos',     count: resumen.bajos,    color: 'text-blue-600',   bg: 'bg-blue-50   border-blue-200' },
        ].map(item => (
          <Card key={item.label} className={`border ${item.bg}`}>
            <CardContent className="pt-4">
              <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {resumen.total_problemas === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-400" />
            <p className="font-semibold text-green-700">Sistema sin problemas detectados</p>
            <p className="text-sm text-gray-400 mt-1">
              Todas las verificaciones automáticas pasaron correctamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resumen.problemas.map((p, i) => {
            const cfg = gravedadConfig[p.gravedad]
            const Icon = cfg.icon

            return (
              <div
                key={`${p.entidad_id}-${i}`}
                className={`border-l-4 rounded-r-lg p-4 ${cfg.rowClass}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                      p.gravedad === 'critico' ? 'text-red-600' :
                      p.gravedad === 'alto'    ? 'text-orange-500' :
                      p.gravedad === 'medio'   ? 'text-yellow-600' :
                      'text-blue-500'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{p.entidad}</span>
                      </div>
                      <p className="font-medium text-sm text-gray-800 mt-0.5">{p.problema}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.descripcion_entidad}</p>
                      <p className="text-xs text-gray-500 mt-1 italic">{p.posible_solucion}</p>
                    </div>
                  </div>
                  <Link
                    href={p.url_correccion}
                    className="flex items-center gap-1 text-xs text-[#2AABBF] hover:underline shrink-0"
                  >
                    Ir a corregir
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
