import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen,
  Stethoscope,
  Calendar,
  Receipt,
  TrendingUp,
  Clock,
} from 'lucide-react'
import type { MetricasDashboard } from '@/types'

async function getMetricas(): Promise<MetricasDashboard> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const isConfigured = supabaseUrl && !supabaseUrl.includes('placeholder')

  if (!isConfigured) {
    // Datos demo mientras se configura Supabase
    return {
      casos_activos: 1,
      enfermeros_disponibles: 3,
      turnos_hoy: 2,
      cobranza_pendiente: 0,
    }
  }

  try {
    const supabase = await createClient()

    const [casosRes, enfermerosRes, turnosRes, cobranzaRes] = await Promise.all([
      supabase.from('casos').select('id', { count: 'exact' }).eq('status', 'activo'),
      supabase.from('enfermeros').select('id', { count: 'exact' }).eq('disponible', true),
      supabase
        .from('turnos')
        .select('id', { count: 'exact' })
        .gte('fecha_inicio', new Date().toISOString().split('T')[0])
        .lte('fecha_inicio', new Date().toISOString().split('T')[0] + 'T23:59:59'),
      supabase
        .from('cobranza_items')
        .select('subtotal')
        .eq('status', 'pendiente'),
    ])

    const cobranza_pendiente = (cobranzaRes.data ?? []).reduce(
      (acc, item) => acc + (item.subtotal ?? 0),
      0
    )

    return {
      casos_activos: casosRes.count ?? 0,
      enfermeros_disponibles: enfermerosRes.count ?? 0,
      turnos_hoy: turnosRes.count ?? 0,
      cobranza_pendiente,
    }
  } catch {
    return { casos_activos: 0, enfermeros_disponibles: 0, turnos_hoy: 0, cobranza_pendiente: 0 }
  }
}

const METRICAS_CONFIG = [
  {
    key: 'casos_activos' as const,
    label: 'Casos Activos',
    icon: FolderOpen,
    color: '#2AABBF',
    bgColor: '#EBF8FB',
    suffix: '',
    descripcion: 'pacientes en tratamiento',
  },
  {
    key: 'enfermeros_disponibles' as const,
    label: 'Enfermeros Disponibles',
    icon: Stethoscope,
    color: '#1B2B4B',
    bgColor: '#EEF1F7',
    suffix: '',
    descripcion: 'listos para asignar',
  },
  {
    key: 'turnos_hoy' as const,
    label: 'Turnos Hoy',
    icon: Calendar,
    color: '#059669',
    bgColor: '#ECFDF5',
    suffix: '',
    descripcion: 'programados para hoy',
  },
  {
    key: 'cobranza_pendiente' as const,
    label: 'Cobranza Pendiente',
    icon: Receipt,
    color: '#D97706',
    bgColor: '#FFFBEB',
    suffix: '',
    prefix: '$',
    descripcion: 'por cobrar',
    format: 'currency',
  },
]

function formatValue(value: number, format?: string) {
  if (format === 'currency') {
    return value.toLocaleString('es-VE', { minimumFractionDigits: 2 })
  }
  return value.toString()
}

export default async function DashboardPage() {
  const metricas = await getMetricas()
  const now = new Date()
  const fechaFormateada = now.toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: '#1B2B4B' }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{fechaFormateada}</p>
        </div>
        <Badge
          variant="outline"
          className="text-xs px-3 py-1.5"
          style={{ borderColor: '#2AABBF', color: '#2AABBF' }}
        >
          <TrendingUp size={12} className="mr-1.5" />
          Operativo
        </Badge>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {METRICAS_CONFIG.map(({ key, label, icon: Icon, color, bgColor, descripcion, prefix, format }) => (
          <Card key={key} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {label}
                </CardTitle>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  <Icon size={18} style={{ color }} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p
                className="text-3xl font-bold"
                style={{ color: '#1B2B4B' }}
              >
                {prefix ?? ''}{formatValue(metricas[key], format)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{descripcion}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secciones secundarias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad reciente */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle
              className="text-base font-semibold flex items-center gap-2"
              style={{ color: '#1B2B4B' }}
            >
              <Clock size={16} style={{ color: '#2AABBF' }} />
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { texto: 'Sistema inicializado correctamente', tiempo: 'Ahora', tipo: 'success' },
                { texto: 'Base de datos conectada', tiempo: 'Ahora', tipo: 'info' },
                { texto: 'Módulos cargados', tiempo: 'Ahora', tipo: 'info' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.tipo === 'success' ? '#059669' : '#2AABBF' }}
                  />
                  <span className="flex-1 text-gray-600">{item.texto}</span>
                  <span className="text-xs text-gray-400">{item.tiempo}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accesos rápidos */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle
              className="text-base font-semibold"
              style={{ color: '#1B2B4B' }}
            >
              Acciones rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Nuevo caso', href: '/casos/nuevo', icon: FolderOpen },
                { label: 'Asignar turno', href: '/turnos/nuevo', icon: Calendar },
                { label: 'Ver enfermeros', href: '/enfermeros', icon: Stethoscope },
                { label: 'Ver cobranza', href: '/cobranza', icon: Receipt },
              ].map(({ label, href, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-100 hover:border-[#2AABBF] hover:bg-[#EBF8FB] transition-all group"
                >
                  <Icon
                    size={16}
                    className="text-gray-400 group-hover:text-[#2AABBF] transition-colors"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-[#1B2B4B] font-medium">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
