'use server'

import { revalidatePath } from 'next/cache'
import type { Prospect, ProspectoStatus } from '@/types'
import { requireAuth, requireRole, fd, fdBool, zodActionError, type ActionResult } from './utils'
import { z } from 'zod'

const ProspectoSchema = z.object({
  requester_name:          z.string().min(2, 'Nombre requerido'),
  requester_phone:         z.string().min(8, 'Teléfono requerido'),
  requester_whatsapp:      z.string().optional(),
  requester_email:         z.string().email('Email inválido').optional().or(z.literal('')),
  relationship_to_patient: z.string().min(1, 'Parentesco requerido'),
  source:                  z.string().min(1, 'Medio requerido'),
  urgency:                 z.string().min(1, 'Urgencia requerida'),
  initial_observations:    z.string().optional(),
})

export async function getProspectos(search?: string, status?: string) {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false })

  if (search?.trim()) {
    query = query.or(
      `requester_name.ilike.%${search}%,payment_responsible_name.ilike.%${search}%`
    )
  }
  if (status && status !== 'todos') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Prospect[]
}

export async function getProspecto(id: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Prospect
}

export async function getProspectoConRelaciones(id: string) {
  const { supabase } = await requireAuth()

  const [prospectRes, preassessmentRes, resultRes, quoteRes] = await Promise.all([
    supabase.from('prospects').select('*').eq('id', id).single(),
    supabase.from('patient_preassessments').select('*').eq('prospect_id', id).maybeSingle(),
    supabase.from('assessment_results').select('*').eq('prospect_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('care_quotes').select('*').eq('prospect_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (prospectRes.error) throw new Error(prospectRes.error.message)

  return {
    prospect:          prospectRes.data as Prospect,
    preassessment:     preassessmentRes.data,
    assessmentResult:  resultRes.data,
    careQuote:         quoteRes.data,
  }
}

export async function crearProspecto(formData: FormData): Promise<ActionResult & { id?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = ProspectoSchema.safeParse({
    requester_name:          fd(formData, 'requester_name'),
    requester_phone:         fd(formData, 'requester_phone'),
    requester_whatsapp:      fd(formData, 'requester_whatsapp') || undefined,
    requester_email:         fd(formData, 'requester_email') || undefined,
    relationship_to_patient: fd(formData, 'relationship_to_patient'),
    source:                  fd(formData, 'source'),
    urgency:                 fd(formData, 'urgency'),
    initial_observations:    fd(formData, 'initial_observations') || undefined,
  })

  if (!parsed.success) return zodActionError(parsed.error)
  const v = parsed.data

  const isAuthorizer    = fdBool(formData, 'is_authorizer')
  const isPayer         = fdBool(formData, 'is_payer')
  const urgency         = v.urgency
  const isUrgent        = urgency === 'hoy_mismo' || urgency === 'menos_12h'

  const { data, error } = await supabase.from('prospects').insert({
    requester_name:                v.requester_name,
    requester_phone:               v.requester_phone,
    requester_whatsapp:            v.requester_whatsapp || null,
    requester_email:               v.requester_email || null,
    relationship_to_patient:       v.relationship_to_patient,
    is_authorizer:                 isAuthorizer,
    authorization_responsible_name: isAuthorizer ? null : fd(formData, 'authorization_responsible_name') || null,
    is_payer:                      isPayer,
    payment_responsible_name:      isPayer ? null : fd(formData, 'payment_responsible_name') || null,
    payment_responsible_phone:     isPayer ? null : fd(formData, 'payment_responsible_phone') || null,
    source:                        v.source,
    urgency:                       urgency,
    is_urgent:                     isUrgent,
    initial_observations:          v.initial_observations || null,
    status:                        'nuevo',
    created_by:                    perfil.id,
  }).select('id').single()

  if (error) return { error: error.message }

  revalidatePath('/prospectos')
  return { id: data.id }
}

export async function actualizarProspecto(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = ProspectoSchema.safeParse({
    requester_name:          fd(formData, 'requester_name'),
    requester_phone:         fd(formData, 'requester_phone'),
    requester_whatsapp:      fd(formData, 'requester_whatsapp') || undefined,
    requester_email:         fd(formData, 'requester_email') || undefined,
    relationship_to_patient: fd(formData, 'relationship_to_patient'),
    source:                  fd(formData, 'source'),
    urgency:                 fd(formData, 'urgency'),
    initial_observations:    fd(formData, 'initial_observations') || undefined,
  })

  if (!parsed.success) return zodActionError(parsed.error)
  const v = parsed.data

  const isAuthorizer = fdBool(formData, 'is_authorizer')
  const isPayer      = fdBool(formData, 'is_payer')
  const isUrgent     = v.urgency === 'hoy_mismo' || v.urgency === 'menos_12h'

  const { error } = await supabase.from('prospects').update({
    requester_name:                v.requester_name,
    requester_phone:               v.requester_phone,
    requester_whatsapp:            v.requester_whatsapp || null,
    requester_email:               v.requester_email || null,
    relationship_to_patient:       v.relationship_to_patient,
    is_authorizer:                 isAuthorizer,
    authorization_responsible_name: isAuthorizer ? null : fd(formData, 'authorization_responsible_name') || null,
    is_payer:                      isPayer,
    payment_responsible_name:      isPayer ? null : fd(formData, 'payment_responsible_name') || null,
    payment_responsible_phone:     isPayer ? null : fd(formData, 'payment_responsible_phone') || null,
    source:                        v.source,
    urgency:                       v.urgency,
    is_urgent:                     isUrgent,
    initial_observations:          v.initial_observations || null,
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/prospectos')
  revalidatePath(`/prospectos/${id}`)
  return {}
}

export async function cambiarStatusProspecto(
  id: string,
  status: ProspectoStatus,
): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const { error } = await supabase
    .from('prospects')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/prospectos')
  revalidatePath(`/prospectos/${id}`)
  return {}
}

export async function eliminarProspecto(id: string): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/prospectos')
  return {}
}
