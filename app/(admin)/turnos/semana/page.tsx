import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { PrintButton } from '@/components/print/PrintButton'

// Paleta de colores por enfermero (asignada por orden de aparición)
const PALETA = [
  { bg: '#EBF8FB', text: '#1A7A8C', border: '#2AABBF' },
  { bg: '#FDE8F7', text: '#7B1FA2', border: '#AB47BC' },
  { bg: '#E8F5E9', text: '#1B5E20', border: '#4CAF50' },
  { bg: '#FFF3E0', text: '#E65100', border: '#FF9800' },
  { bg: '#E3F2FD', text: '#0D47A1', border: '#2196F3' },
  { bg: '#FCE4EC', text: '#B71C1C', border: '#EF5350' },
  { bg: '#F3E5F5', text: '#4A148C', border: '#9C27B0' },
  { bg: '#E0F2F1', text: '#004D40', border: '#26A69A' },
]

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const TURNOS_DEF = [
  { key: 'matutino',   label: 'Matutino',   horario: '7:00 am – 1:00 pm',  horas: '6hrs' },
  { key: 'vespertino', label: 'Vespertino', horario: '1:00 pm – 7:00 pm',  horas: '6hrs' },
  { key: 'nocturno',   label: 'Nocturno',   horario: '7:00 pm – 7:00 am',  horas: '12hrs' },
]

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function getShift(fecha: string): string {
  const hour = new Date(fecha).getHours()
  if (hour >= 7 && hour < 13) return 'matutino'
  if (hour >= 13 && hour < 19) return 'vespertino'
  return 'nocturno'
}

async function getTurnosSemana(inicio: Date) {
  const supabase = await createClient()
  const fin = addDays(inicio, 7)

  const { data } = await supabase
    .from('turnos')
    .select('id, fecha_inicio, fecha_fin, status, enfermero:enfermeros(id, nombre, apellido), caso:casos(id, titulo)')
    .gte('fecha_inicio', inicio.toISOString())
    .lt('fecha_inicio', fin.toISOString())
    .order('fecha_inicio', { ascending: true })

  return data ?? []
}

export default async function SemanaPage({
  searchParams,
}: {
  searchParams: { inicio?: string }
}) {
  // Determinar lunes de la semana
  const hoy = new Date()
  const inicioParam = searchParams.inicio
  const lunes = inicioParam
    ? getMondayOf(new Date(inicioParam + 'T12:00:00'))
    : getMondayOf(hoy)

  const lunesPrev = addDays(lunes, -7)
  const lunesNext = addDays(lunes, 7)
  const domingo = addDays(lunes, 6)

  const turnosSemana = await getTurnosSemana(lunes)

  // Asignar colores por enfermero
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type EnfRow = { id: string; nombre: string; apellido: string }
  function getEnf(t: unknown): EnfRow | null {
    // Supabase puede retornar objeto o array según versión
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (t as any).enfermero
    if (!raw) return null
    const obj = Array.isArray(raw) ? raw[0] : raw
    return obj ?? null
  }

  const colorMap = new Map<string, typeof PALETA[0]>()
  let palIdx = 0
  for (const t of turnosSemana) {
    const enf = getEnf(t)
    if (enf?.id && !colorMap.has(enf.id)) {
      colorMap.set(enf.id, PALETA[palIdx % PALETA.length])
      palIdx++
    }
  }

  // Construir grid: grid[dia][turno] = list of enfermeros
  type Cell = { nombre: string; color: typeof PALETA[0] }
  const grid: Record<number, Record<string, Cell[]>> = {}
  for (let d = 0; d < 7; d++) {
    grid[d] = { matutino: [], vespertino: [], nocturno: [] }
  }

  for (const t of turnosSemana) {
    const enf = getEnf(t)
    if (!enf) continue
    const fecha = new Date(t.fecha_inicio)
    const diaSemana = fecha.getDay()
    const diaIdx = diaSemana === 0 ? 6 : diaSemana - 1 // 0=Lunes
    const shift = getShift(t.fecha_inicio)
    const color = colorMap.get(enf.id) ?? PALETA[0]
    grid[diaIdx]?.[shift]?.push({ nombre: enf.nombre, color })
  }

  // Formatear fechas header
  const formatDia = (d: Date) => d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })

  const pacienteNombre = turnosSemana.length > 0
    ? (turnosSemana[0].caso as { titulo?: string } | null)?.titulo ?? ''
    : ''

  const semanaStr = `${lunes.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${domingo.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Horario Semanal</h1>
          <p className="text-sm text-gray-500 mt-1">{semanaStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/turnos/semana?inicio=${lunesPrev.toISOString().split('T')[0]}`}
            className="p-2 rounded-lg border border-gray-200 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
            <ChevronLeft size={18} />
          </Link>
          <Link href={`/turnos/semana?inicio=${getMondayOf(hoy).toISOString().split('T')[0]}`}
            className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] text-gray-600 transition-all">
            Hoy
          </Link>
          <Link href={`/turnos/semana?inicio=${lunesNext.toISOString().split('T')[0]}`}
            className="p-2 rounded-lg border border-gray-200 hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all">
            <ChevronRight size={18} />
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header del documento (visible en impresión) */}
        <div className="hidden print:block text-center py-4 border-b">
          <p className="text-lg font-bold" style={{ color: '#1B2B4B' }}>
            {pacienteNombre ? `Pt: ${pacienteNombre}` : 'Horario Semanal'}
          </p>
          <p className="text-sm text-gray-500 mt-1">{semanaStr}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ backgroundColor: '#1B2B4B' }}>
                <th className="px-3 py-3 text-left text-xs font-bold text-white/70 w-36">
                  Turno
                </th>
                {DIAS.map((dia, i) => (
                  <th key={dia} className="px-2 py-3 text-center text-xs font-bold text-white">
                    <span className="hidden sm:block">{dia}</span>
                    <span className="sm:hidden">{DIAS_SHORT[i]}</span>
                    <p className="font-normal text-white/60 mt-0.5">
                      {formatDia(addDays(lunes, i))}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TURNOS_DEF.map((turno, ti) => (
                <tr key={turno.key} className={ti % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-3 border-r border-gray-100">
                    <p className="text-xs font-bold" style={{ color: '#1B2B4B' }}>{turno.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{turno.horario}</p>
                    <p className="text-xs text-gray-300">{turno.horas}</p>
                  </td>
                  {DIAS.map((_, diaIdx) => {
                    const enfermeros = grid[diaIdx]?.[turno.key] ?? []
                    return (
                      <td key={diaIdx} className="px-2 py-2 border-r border-gray-50 align-top">
                        {enfermeros.length === 0 ? (
                          <div className="h-10" />
                        ) : (
                          <div className="space-y-1">
                            {enfermeros.map((e, ei) => (
                              <div key={ei} className="px-2 py-1.5 rounded-lg text-center text-xs font-semibold"
                                style={{ backgroundColor: e.color.bg, color: e.color.text, border: `1px solid ${e.color.border}20` }}>
                                {e.nombre.toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda de enfermeros */}
      {colorMap.size > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Enfermeros esta semana</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(colorMap.entries()).map(([id, color]) => {
              const t = turnosSemana.find(t => getEnf(t)?.id === id)
              const enf = t ? getEnf(t) : null
              const count = turnosSemana.filter(t => getEnf(t)?.id === id).length
              return (
                <div key={id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}40` }}>
                  {enf?.nombre} {enf?.apellido}
                  <span className="opacity-60">({count} turno{count !== 1 ? 's' : ''})</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
