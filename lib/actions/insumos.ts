'use server'

import { revalidatePath } from 'next/cache'
import type { InsumoCatalogo, InsumoUsado } from '@/types'
import { requireAuth, requireRole, fd, fdNum } from './utils'
import type { ActionResult } from './utils'

// ── Catálogo ──────────────────────────────────────────────────

export async function getCatalogo(search?: string): Promise<InsumoCatalogo[]> {
  const { supabase } = await requireAuth()
  let query = supabase
    .from('insumos_catalogo')
    .select('*')
    .eq('activo', true)
    .order('categoria')
    .order('nombre')

  if (search?.trim()) {
    query = query.ilike('nombre', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as InsumoCatalogo[]
}

export async function crearInsumo(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const nombre = fd(formData, 'nombre')
  if (!nombre) return { error: 'Nombre requerido' }

  const { error } = await supabase.from('insumos_catalogo').insert({
    nombre,
    categoria:   fd(formData, 'categoria'),
    unidad:      fd(formData, 'unidad'),
    costo:       fdNum(formData, 'costo'),
    precio:      fdNum(formData, 'precio') || null,
    descripcion: fd(formData, 'descripcion') || null,
    activo:      true,
  })

  if (error) return { error: error.message }
  revalidatePath('/insumos')
  return {}
}

export async function actualizarInsumo(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { error } = await supabase.from('insumos_catalogo').update({
    nombre:      fd(formData, 'nombre'),
    categoria:   fd(formData, 'categoria'),
    unidad:      fd(formData, 'unidad'),
    costo:       fdNum(formData, 'costo'),
    precio:      fdNum(formData, 'precio') || null,
    descripcion: fd(formData, 'descripcion') || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/insumos')
  return {}
}

export async function eliminarInsumo(id: string) {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  // Soft delete
  const { error } = await supabase
    .from('insumos_catalogo')
    .update({ activo: false })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/insumos')
}

// ── Registro de uso ────────────────────────────────────────────

export async function getInsumosByCaso(casoId: string): Promise<InsumoUsado[]> {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('insumos_usados')
    .select(`
      *,
      insumo:insumos_catalogo(id, nombre, unidad, categoria),
      enfermero:enfermeros(id, nombre, apellido)
    `)
    .eq('caso_id', casoId)
    .order('fecha', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as InsumoUsado[]
}

export async function getResumenCostosPorCaso() {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('insumos_usados')
    .select(`
      caso_id, cantidad, costo_unitario,
      caso:casos(id, titulo)
    `)

  if (error) throw new Error(error.message)

  // Agrupar por caso y sumar costos
  const map = new Map<string, { titulo: string; total: number; items: number }>()
  for (const row of data ?? []) {
    const rawCaso = row.caso
    const caso = Array.isArray(rawCaso) ? rawCaso[0] : rawCaso as { id: string; titulo: string } | null
    if (!caso) continue
    const subtotal = (row.cantidad ?? 0) * (row.costo_unitario ?? 0)
    const existing = map.get(caso.id)
    if (existing) {
      existing.total += subtotal
      existing.items += 1
    } else {
      map.set(caso.id, { titulo: caso.titulo, total: subtotal, items: 1 })
    }
  }

  return Array.from(map.entries()).map(([id, v]) => ({ caso_id: id, ...v }))
}

export async function registrarUso(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil, user } = await requireAuth()

  const casoId     = fd(formData, 'caso_id')
  const insumoId   = fd(formData, 'insumo_id')
  const cantidad   = fdNum(formData, 'cantidad')
  const turnoId    = fd(formData, 'turno_id') || null

  if (!casoId || !insumoId || cantidad <= 0) {
    return { error: 'Completa todos los campos' }
  }

  // Obtener costo actual del insumo
  const { data: insumo } = await supabase
    .from('insumos_catalogo')
    .select('costo')
    .eq('id', insumoId)
    .single()

  // Obtener enfermero_id del perfil
  let enfermeroId = fd(formData, 'enfermero_id') || null
  if (!enfermeroId && perfil.rol === 'enfermero') {
    const { data: p } = await supabase
      .from('perfiles')
      .select('enfermero_id')
      .eq('id', user.id)
      .single()
    enfermeroId = p?.enfermero_id ?? null
  }

  if (!enfermeroId) return { error: 'Enfermero no identificado' }

  const { error } = await supabase.from('insumos_usados').insert({
    caso_id:        casoId,
    turno_id:       turnoId,
    enfermero_id:   enfermeroId,
    insumo_id:      insumoId,
    cantidad,
    costo_unitario: insumo?.costo ?? 0,
    notas:          fd(formData, 'notas') || null,
    fecha:          new Date().toISOString(),
  })

  if (error) return { error: error.message }

  revalidatePath('/insumos')
  revalidatePath(`/casos/${casoId}`)
  revalidatePath('/enfermero/insumos')
  return {}
}

export async function eliminarUso(id: string) {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const { error } = await supabase.from('insumos_usados').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/insumos')
}
