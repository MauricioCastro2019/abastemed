'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/actions/utils'
import type { PlanAtencion, PlanItem, TipoPlanItem, FrecuenciaPlan, PrioridadAccion } from '@/types'

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'

// ── Queries ──────────────────────────────────────────────────

export async function getPlanActivo(pacienteId: string): Promise<(PlanAtencion & { plan_items: PlanItem[] }) | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('planes_atencion')
    .select(`
      *,
      plan_items (*)
    `)
    .eq('paciente_id', pacienteId)
    .eq('estado', 'activo')
    .order('activated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  const plan = data as PlanAtencion & { plan_items: PlanItem[] }
  plan.plan_items = (plan.plan_items ?? []).sort((a, b) => a.orden - b.orden)
  return plan
}

export async function getPlanesByPaciente(pacienteId: string): Promise<PlanAtencion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('planes_atencion')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })
  return (data ?? []) as PlanAtencion[]
}

export async function getPlanById(planId: string): Promise<(PlanAtencion & { plan_items: PlanItem[] }) | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('planes_atencion')
    .select(`*, plan_items (*)`)
    .eq('id', planId)
    .maybeSingle()
  if (!data) return null
  const plan = data as PlanAtencion & { plan_items: PlanItem[] }
  plan.plan_items = (plan.plan_items ?? []).sort((a, b) => a.orden - b.orden)
  return plan
}

// ── Mutaciones ───────────────────────────────────────────────

export async function crearPlan(data: {
  paciente_id: string
  caso_id?: string | null
  nombre?: string
  notas_generales?: string
}): Promise<{ ok: boolean; plan?: PlanAtencion; error?: string }> {
  const { perfil } = await requireAuth(); requireRole(perfil, 'admin', 'coordinador')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: plan, error } = await supabase
    .from('planes_atencion')
    .insert({
      paciente_id: data.paciente_id,
      caso_id: data.caso_id ?? null,
      organization_id: DEFAULT_ORG_ID,
      nombre: data.nombre ?? null,
      notas_generales: data.notas_generales ?? null,
      estado: 'borrador',
      created_by: user?.id ?? null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${data.paciente_id}`)
  return { ok: true, plan: plan as PlanAtencion }
}

export async function activarPlan(planId: string, pacienteId: string): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await requireAuth(); requireRole(perfil, 'admin', 'coordinador')
  const supabase = await createClient()

  // Archivar cualquier plan activo previo
  await supabase
    .from('planes_atencion')
    .update({ estado: 'archivado', archived_at: new Date().toISOString() })
    .eq('paciente_id', pacienteId)
    .eq('estado', 'activo')

  const { error } = await supabase
    .from('planes_atencion')
    .update({ estado: 'activo', activated_at: new Date().toISOString() })
    .eq('id', planId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}`)
  revalidatePath(`/pacientes/${pacienteId}/plan`)
  return { ok: true }
}

export async function suspenderPlan(planId: string, pacienteId: string): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await requireAuth(); requireRole(perfil, 'admin', 'coordinador')
  const supabase = await createClient()

  const { error } = await supabase
    .from('planes_atencion')
    .update({ estado: 'suspendido', suspended_at: new Date().toISOString() })
    .eq('id', planId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}`)
  return { ok: true }
}

// ── Plan Items ───────────────────────────────────────────────

export async function agregarPlanItem(planId: string, pacienteId: string, item: {
  tipo: TipoPlanItem
  nombre: string
  descripcion?: string
  frecuencia: FrecuenciaPlan
  horarios: string[]
  configuracion?: Record<string, unknown>
  prioridad?: PrioridadAccion
  requiere_evidencia?: boolean
  orden?: number
  inicio_en?: string | null
  fin_en?: string | null
}): Promise<{ ok: boolean; item?: PlanItem; error?: string }> {
  const { perfil } = await requireAuth(); requireRole(perfil, 'admin', 'coordinador')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Determinar el siguiente orden si no se especifica
  let orden = item.orden ?? 0
  if (!item.orden) {
    const { count } = await supabase
      .from('plan_items')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', planId)
    orden = (count ?? 0)
  }

  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      plan_id: planId,
      tipo: item.tipo,
      nombre: item.nombre,
      descripcion: item.descripcion ?? null,
      frecuencia: item.frecuencia,
      horarios: item.horarios,
      configuracion: item.configuracion ?? {},
      prioridad: item.prioridad ?? 'normal',
      requiere_evidencia: item.requiere_evidencia ?? false,
      activo: true,
      orden,
      inicio_en: item.inicio_en ?? null,
      fin_en: item.fin_en ?? null,
      creado_por: user?.id ?? null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}/plan`)
  revalidatePath(`/pacientes/${pacienteId}`)
  return { ok: true, item: data as PlanItem }
}

export async function actualizarPlanItem(itemId: string, pacienteId: string, updates: {
  nombre?: string
  descripcion?: string
  frecuencia?: FrecuenciaPlan
  horarios?: string[]
  configuracion?: Record<string, unknown>
  prioridad?: PrioridadAccion
  requiere_evidencia?: boolean
  orden?: number
  inicio_en?: string | null
  fin_en?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await requireAuth(); requireRole(perfil, 'admin', 'coordinador')
  const supabase = await createClient()

  const { error } = await supabase
    .from('plan_items')
    .update(updates)
    .eq('id', itemId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}/plan`)
  revalidatePath(`/pacientes/${pacienteId}`)
  return { ok: true }
}

export async function togglePlanItem(itemId: string, pacienteId: string, activo: boolean): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await requireAuth(); requireRole(perfil, 'admin', 'coordinador')
  const supabase = await createClient()

  const { error } = await supabase
    .from('plan_items')
    .update({ activo })
    .eq('id', itemId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}/plan`)
  revalidatePath(`/pacientes/${pacienteId}`)
  return { ok: true }
}

export async function eliminarPlanItem(itemId: string, pacienteId: string): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await requireAuth(); requireRole(perfil, 'admin', 'coordinador')
  const supabase = await createClient()

  const { error } = await supabase
    .from('plan_items')
    .delete()
    .eq('id', itemId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/pacientes/${pacienteId}/plan`)
  revalidatePath(`/pacientes/${pacienteId}`)
  return { ok: true }
}
