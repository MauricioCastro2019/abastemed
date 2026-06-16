'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearPayrollPeriod } from '@/lib/actions/payroll'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function NuevoCortePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hoy       = new Date()
  const lunes     = getMonday(hoy)
  const domingo   = new Date(lunes)
  domingo.setDate(domingo.getDate() + 6)
  const pagoDate  = new Date(domingo)
  pagoDate.setDate(pagoDate.getDate() + 3) // miércoles siguiente

  const [fechaInicio, setFechaInicio] = useState(toInputDate(lunes))
  const [fechaFin,    setFechaFin]    = useState(toInputDate(domingo))
  const [fechaPago,   setFechaPago]   = useState(toInputDate(pagoDate))
  const [nombre,      setNombre]      = useState('')
  const [obs,         setObs]         = useState('')

  // Nombre sugerido
  const nombreSugerido = fechaInicio && fechaFin
    ? `Semana ${new Date(fechaInicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} — ${new Date(fechaFin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.set('nombre',               nombre || nombreSugerido)
    fd.set('fecha_inicio',         fechaInicio)
    fd.set('fecha_fin',            fechaFin)
    fd.set('fecha_programada_pago', fechaPago)
    fd.set('observaciones',        obs)

    const result = await crearPayrollPeriod(fd)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push(`/cortes/${result.id}`)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/cortes" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-[#1B2B4B]">Nuevo Corte</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-gray-600 block mb-1">
                Nombre del periodo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder={nombreSugerido}
                className="border rounded px-3 py-2 text-sm w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Si no escribes nombre, se usará: &quot;{nombreSugerido}&quot;
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  required
                  className="border rounded px-3 py-2 text-sm w-full"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Fecha fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  required
                  className="border rounded px-3 py-2 text-sm w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Fecha programada de pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={e => setFechaPago(e.target.value)}
                className="border rounded px-3 py-2 text-sm w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">Observaciones</label>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                rows={2}
                className="border rounded px-3 py-2 text-sm w-full resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="bg-[#1B2B4B] hover:bg-[#253d6b]">
                {loading ? 'Creando...' : 'Crear corte'}
              </Button>
              <Link href="/cortes">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
