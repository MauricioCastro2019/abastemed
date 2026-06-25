import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, ChevronRight, User } from 'lucide-react'
import Link from 'next/link'
import { PrintButton } from '@/components/print/PrintButton'

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

const DIAS      = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DIAS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const TURNOS_DEF = [
  { key: 'matutino',   label: 'Matutino',   horario: '7:00 am – 1:00 pm',  horas: '6hrs' },
  { key: 'vespertino', label: 'Vespertino', horario: '1:00 pm – 7:00 pm',  horas: '6hrs' },
  { key: 'nocturno',   label: 'Nocturno',   horario: '7:00 pm – 7:00 am',  horas: '12hrs' },
]

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEnf(t: any): { id: string; nombre: string; apellido: string } | null {
  const raw = t.enfermero
  if (!raw) return null
  const obj = Array.isArray(raw) ? raw[0] : raw
  return obj ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCaso(t: any): { id: string; titulo: string; paciente?: { nombre: string; apellido: string } } | null {
  const raw = t.caso
  if (!raw) return null
  const obj = Array.isArray(raw) ? raw[0] : raw
  return obj ?? null
}

async function getTurnosSemana(inicio: Date) {
  const supabase = await createClient()
  const fin = addDays(inicio, 7)

  const { data } = await supabase
    .from('turnos')
    .select(`
      id, fecha_inicio, fecha_fin, status,
      enfermero:enfermeros(id, nombre, apellido),
      caso:casos(id, titulo, paciente:pacientes(nombre, apellido))
    `)
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
  const hoy = new Date()
  const lunes = searchParams.inicio
    ? getMondayOf(new Date(searchParams.inicio + 'T12:00:00'))
    : getMondayOf(hoy)

  const lunesPrev = addDays(lunes, -7)
  const lunesNext = addDays(lunes, 7)
  const domingo   = addDays(lunes, 6)

  const turnosSemana = await getTurnosSemana(lunes)

  // Color global por enfermero (mismo enfermero = mismo color en todos los casos)
  const colorMap = new Map<string, typeof PALETA[0]>()
  let palIdx = 0
  for (const t of turnosSemana) {
    const enf = getEnf(t)
    if (enf?.id && !colorMap.has(enf.id)) {
      colorMap.set(enf.id, PALETA[palIdx % PALETA.length])
      palIdx++
    }
  }

  // Agrupar turnos por caso
  const casoMap = new Map<string, {
    titulo: string
    paciente: string
    turnos: typeof turnosSemana
  }>()

  for (const t of turnosSemana) {
    const caso = getCaso(t)
    if (!caso) continue
    if (!casoMap.has(caso.id)) {
      const px = caso.paciente
      const pacienteNombre = px ? `${px.nombre} ${px.apellido}` : caso.titulo
      casoMap.set(caso.id, { titulo: caso.titulo, paciente: pacienteNombre, turnos: [] })
    }
    casoMap.get(caso.id)!.turnos.push(t)
  }

  const semanaStr = `${lunes.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${domingo.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  const formatDia = (d: Date) => d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })

  return (
    <div className="space-y-6">
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

      {/* Sin turnos */}
      {casoMap.size === 0 && (
        <div className="bg-white rounded-xl p-10 shadow-sm text-center text-gray-400 text-sm">
          No hay turnos programados esta semana.
        </div>
      )}

      {/* Una sección por paciente */}
      {Array.from(casoMap.entries()).map(([casoId, { paciente, turnos: turnosCaso }]) => {
        // Grid por día/turno para este caso
        type Cell = { enfId: string; nombre: string; turnoId: string; color: typeof PALETA[0] }
        const grid: Record<number, Record<string, Cell[]>> = {}
        for (let d = 0; d < 7; d++) grid[d] = { matutino: [], vespertino: [], nocturno: [] }

        for (const t of turnosCaso) {
          const enf = getEnf(t)
          if (!enf) continue
          const fecha = new Date(t.fecha_inicio)
          const day   = fecha.getDay()
          const diaIdx = day === 0 ? 6 : day - 1
          const shift  = getShift(t.fecha_inicio)
          const color  = colorMap.get(enf.id) ?? PALETA[0]
          grid[diaIdx]?.[shift]?.push({ enfId: enf.id, nombre: enf.nombre, turnoId: t.id, color })
        }

        // Enfermeros únicos en este caso esta semana
        const enfsCaso = new Map<string, { nombre: string; apellido: string; count: number }>()
        for (const t of turnosCaso) {
          const enf = getEnf(t)
          if (!enf) continue
          if (!enfsCaso.has(enf.id)) enfsCaso.set(enf.id, { nombre: enf.nombre, apellido: enf.apellido, count: 0 })
          enfsCaso.get(enf.id)!.count++
        }

        return (
          <div key={casoId} className="space-y-0">
            {/* Header del paciente */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-t-xl"
              style={{ backgroundColor: '#1B2B4B' }}>
              <User size={14} className="text-white/60" />
              <span className="text-sm font-bold text-white">{paciente}</span>
              <span className="ml-auto text-xs text-white/40">{turnosCaso.length} turno{turnosCaso.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-b-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 w-36 bg-gray-50">
                        Turno
                      </th>
                      {DIAS.map((dia, i) => (
                        <th key={dia} className="px-2 py-2.5 text-center text-xs font-semibold text-gray-500 bg-gray-50">
                          <span className="hidden sm:block">{dia}</span>
                          <span className="sm:hidden">{DIAS_SHORT[i]}</span>
                          <p className="font-normal text-gray-400 mt-0.5">
                            {formatDia(addDays(lunes, i))}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TURNOS_DEF.map((turno, ti) => (
                      <tr key={turno.key} className={ti % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                        <td className="px-3 py-2.5 border-r border-gray-100">
                          <p className="text-xs font-bold" style={{ color: '#1B2B4B' }}>{turno.label}</p>
                          <p className="text-xs text-gray-400">{turno.horario}</p>
                          <p className="text-xs text-gray-300">{turno.horas}</p>
                        </td>
                        {DIAS.map((_, diaIdx) => {
                          const cells = grid[diaIdx]?.[turno.key] ?? []
                          return (
                            <td key={diaIdx} className="px-2 py-2 border-r border-gray-50 align-top">
                              {cells.length === 0 ? (
                                <div className="h-8" />
                              ) : (
                                <div className="space-y-1">
                                  {cells.map((cell, ei) => (
                                    <Link key={ei} href={`/turnos/${cell.turnoId}`}
                                      className="block px-2 py-1.5 rounded-lg text-center text-xs font-semibold transition-opacity hover:opacity-80"
                                      style={{
                                        backgroundColor: cell.color.bg,
                                        color: cell.color.text,
                                        border: `1px solid ${cell.color.border}25`,
                                      }}>
                                      {cell.nombre.toUpperCase()}
                                    </Link>
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

              {/* Mini leyenda por caso */}
              {enfsCaso.size > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 py-3 border-t border-gray-50">
                  {Array.from(enfsCaso.entries()).map(([id, enf]) => {
                    const color = colorMap.get(id) ?? PALETA[0]
                    return (
                      <span key={id} className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}40` }}>
                        {enf.nombre} {enf.apellido}
                        <span className="opacity-50 ml-1">({enf.count})</span>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
