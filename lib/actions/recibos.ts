'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Recibo, ReciboItem } from '@/types'

// ----------------------------------------------------------------
// Tipos internos
// ----------------------------------------------------------------

type ItemInput = {
  descripcion: string
  cantidad: number
  precio_unitario: number
  importe: number
}

type ReciboConItems = Recibo & { recibo_items: ReciboItem[] }

// ----------------------------------------------------------------
// Helper: generar folio ABM-YYYYMMDD-0001
// ----------------------------------------------------------------

async function generarFolio(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fechaEmision: string
): Promise<string> {
  const dateStr = fechaEmision.replace(/-/g, '') // "20260424"
  const { count } = await supabase
    .from('recibos')
    .select('*', { count: 'exact', head: true })
    .like('folio', `ABM-${dateStr}-%`)

  const n = String((count ?? 0) + 1).padStart(4, '0')
  return `ABM-${dateStr}-${n}`
}

// ----------------------------------------------------------------
// READ: lista de recibos
// ----------------------------------------------------------------

export async function getRecibos(): Promise<Recibo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recibos')
    .select('*')
    .order('creado_en', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Recibo[]
}

// ----------------------------------------------------------------
// READ: recibo individual con items
// ----------------------------------------------------------------

export async function getRecibo(id: string): Promise<ReciboConItems> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recibos')
    .select('*, recibo_items(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)

  const result = data as ReciboConItems
  result.recibo_items?.sort((a, b) => a.orden - b.orden)
  return result
}

// ----------------------------------------------------------------
// CREATE
// ----------------------------------------------------------------

export async function crearRecibo(formData: FormData) {
  const supabase = await createClient()

  const fechaEmision = formData.get('fecha_emision') as string
  const folio = await generarFolio(supabase, fechaEmision)

  const items = JSON.parse(formData.get('items') as string) as ItemInput[]
  const subtotal = items.reduce((sum, i) => sum + i.importe, 0)

  const { data: recibo, error } = await supabase
    .from('recibos')
    .insert({
      folio,
      paciente_nombre: formData.get('paciente_nombre') as string,
      fecha_emision: fechaEmision,
      subtotal,
      total: subtotal,
      observaciones: (formData.get('observaciones') as string) || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const itemsRows = items.map((item, idx) => ({
    recibo_id: recibo.id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    importe: item.importe,
    orden: idx,
  }))

  const { error: itemsError } = await supabase.from('recibo_items').insert(itemsRows)
  if (itemsError) throw new Error(itemsError.message)

  revalidatePath('/recibos')
  redirect(`/recibos/${recibo.id}`)
}

// ----------------------------------------------------------------
// UPDATE
// ----------------------------------------------------------------

export async function actualizarRecibo(id: string, formData: FormData) {
  const supabase = await createClient()

  const items = JSON.parse(formData.get('items') as string) as ItemInput[]
  const subtotal = items.reduce((sum, i) => sum + i.importe, 0)

  const { error } = await supabase
    .from('recibos')
    .update({
      paciente_nombre: formData.get('paciente_nombre') as string,
      fecha_emision: formData.get('fecha_emision') as string,
      subtotal,
      total: subtotal,
      observaciones: (formData.get('observaciones') as string) || null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Reemplazar todos los items (delete + insert)
  const { error: delError } = await supabase
    .from('recibo_items')
    .delete()
    .eq('recibo_id', id)
  if (delError) throw new Error(delError.message)

  const itemsRows = items.map((item, idx) => ({
    recibo_id: id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    importe: item.importe,
    orden: idx,
  }))

  const { error: itemsError } = await supabase.from('recibo_items').insert(itemsRows)
  if (itemsError) throw new Error(itemsError.message)

  revalidatePath('/recibos')
  revalidatePath(`/recibos/${id}`)
  redirect(`/recibos/${id}`)
}

// ----------------------------------------------------------------
// DELETE
// ----------------------------------------------------------------

export async function eliminarRecibo(id: string) {
  const supabase = await createClient()

  // Los items se eliminan en cascada por la FK ON DELETE CASCADE
  const { error } = await supabase.from('recibos').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/recibos')
  redirect('/recibos')
}

// ----------------------------------------------------------------
// SEED: crear recibo de prueba con datos de Sra. Margarita
// ----------------------------------------------------------------

export async function crearReciboDemo() {
  const supabase = await createClient()

  const fechaEmision = '2026-04-24'
  const folio = await generarFolio(supabase, fechaEmision)

  const demoItems: ItemInput[] = [
    { descripcion: 'Pañales',           cantidad: 3, precio_unitario: 202, importe: 606  },
    { descripcion: 'Cubrecama',         cantidad: 1, precio_unitario: 130, importe: 130  },
    { descripcion: 'Quetiapina',        cantidad: 1, precio_unitario: 312, importe: 312  },
    { descripcion: 'Servicio Miércoles',cantidad: 1, precio_unitario: 960, importe: 960  },
    { descripcion: 'Servicio Jueves',   cantidad: 1, precio_unitario: 960, importe: 960  },
    { descripcion: 'Servicio Viernes',  cantidad: 1, precio_unitario: 960, importe: 960  },
  ]

  const subtotal = demoItems.reduce((sum, i) => sum + i.importe, 0) // 3928

  const { data: recibo, error } = await supabase
    .from('recibos')
    .insert({
      folio,
      paciente_nombre: 'Sra. Margarita',
      fecha_emision: fechaEmision,
      subtotal,
      total: subtotal,
      observaciones: null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const itemsRows = demoItems.map((item, idx) => ({
    recibo_id: recibo.id,
    ...item,
    orden: idx,
  }))

  const { error: itemsError } = await supabase.from('recibo_items').insert(itemsRows)
  if (itemsError) throw new Error(itemsError.message)

  revalidatePath('/recibos')
  redirect(`/recibos/${recibo.id}`)
}
