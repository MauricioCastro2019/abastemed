'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from './utils'
import type { Alerta, TipoAlerta, GravedadAlerta } from '@/types'

interface CrearAlertaParams {
  tipo: TipoAlerta
  gravedad: GravedadAlerta
  titulo: string
  descripcion?: string
  entidad?: string
  entidad_id?: string
  responsable_id?: string
  accion_sugerida?: string
  url_accion?: string
  fecha_limite?: string
  dedup_key?: string
}

/**
 * Crea una alerta interna. Si ya existe una alerta activa con el mismo
 * dedup_key, no crea un duplicado.
 */
export async function crearAlerta(params: CrearAlertaParams): Promise<void> {
  try {
    const { supabase } = await requireAuth()

    if (params.dedup_key) {
      const { data: existing } = await supabase
        .from('alertas')
        .select('id')
        .eq('dedup_key', params.dedup_key)
        .in('estado', ['activa', 'en_proceso'])
        .maybeSingle()

      if (existing) return // Ya existe, no duplicar
    }

    await supabase.from('alertas').insert({
      tipo:             params.tipo,
      gravedad:         params.gravedad,
      titulo:           params.titulo,
      descripcion:      params.descripcion ?? null,
      entidad:          params.entidad ?? null,
      entidad_id:       params.entidad_id ?? null,
      responsable_id:   params.responsable_id ?? null,
      accion_sugerida:  params.accion_sugerida ?? null,
      url_accion:       params.url_accion ?? null,
      fecha_limite:     params.fecha_limite ?? null,
      dedup_key:        params.dedup_key ?? null,
      estado:           'activa',
    })
  } catch {
    // Silencioso: las alertas no deben bloquear el flujo
  }
}

export async function getAlertas(soloActivas = true): Promise<Alerta[]> {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('alertas')
    .select('*, responsable:perfiles(id, nombre, apellido)')
    .order('gravedad', { ascending: false })
    .order('created_at', { ascending: false })

  if (soloActivas) {
    query = query.in('estado', ['activa', 'en_proceso'])
  }

  const { data, error } = await query
  if (error) return []
  return (data ?? []) as Alerta[]
}

export async function getAlertasByGravedad(gravedad: GravedadAlerta): Promise<Alerta[]> {
  const { supabase } = await requireAuth()
  const { data } = await supabase
    .from('alertas')
    .select('*')
    .eq('gravedad', gravedad)
    .in('estado', ['activa', 'en_proceso'])
    .order('created_at', { ascending: false })
  return (data ?? []) as Alerta[]
}

export async function resolverAlerta(
  id: string,
  motivo?: string
): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const { error } = await supabase
    .from('alertas')
    .update({
      estado:        'resuelta',
      resuelta_por:  perfil.id,
      resuelta_at:   new Date().toISOString(),
      descripcion:   motivo ? `${motivo}` : undefined,
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

export async function ignorarAlerta(id: string): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const { error } = await supabase
    .from('alertas')
    .update({ estado: 'ignorada', resuelta_por: perfil.id, resuelta_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return {}
}

export async function getConteoAlertas(): Promise<{
  total: number
  criticas: number
  altas: number
  medias: number
}> {
  const { supabase } = await requireAuth()

  const { data } = await supabase
    .from('alertas')
    .select('gravedad')
    .in('estado', ['activa', 'en_proceso'])

  const items = data ?? []
  return {
    total:    items.length,
    criticas: items.filter(a => a.gravedad === 'critica').length,
    altas:    items.filter(a => a.gravedad === 'alta').length,
    medias:   items.filter(a => a.gravedad === 'media').length,
  }
}
