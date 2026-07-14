'use server'

import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, fd, zodActionError } from './utils'

// ─── Schemas ────────────────────────────────────────────────

const InvitarFamiliarSchema = z.object({
  email:               z.string().email('Correo inválido'),
  nombre:              z.string().min(1, 'Nombre requerido').max(100),
  apellido:            z.string().min(1, 'Apellido requerido').max(100),
  telefono:            z.string().max(20).optional().or(z.literal('')),
  telefono_whatsapp:   z.string().max(20).optional().or(z.literal('')),
  whatsapp_igual_tel:  z.boolean().default(false),
  parentesco:          z.string().max(60).optional().or(z.literal('')),
  es_contacto_principal:  z.boolean().default(false),
  es_contacto_emergencia: z.boolean().default(false),
  es_responsable_pagos:   z.boolean().default(false),
  paciente_id:         z.string().uuid('ID de paciente inválido').optional().or(z.literal('')),
  observaciones_familiar: z.string().max(500).optional().or(z.literal('')),
})

// ─── Queries ────────────────────────────────────────────────

export async function getFamiliares() {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('perfiles')
    .select(`
      id, nombre, apellido, email, paciente_id, parentesco,
      telefono, telefono_whatsapp, activo_familiar, estado_invitacion,
      es_contacto_principal, es_responsable_pagos, ultimo_acceso_familiar,
      paciente:pacientes(id, nombre, apellido)
    `)
    .eq('rol', 'familiar')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getFamiliar(id: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('perfiles')
    .select(`
      id, nombre, apellido, email, paciente_id, parentesco,
      telefono, telefono_whatsapp, whatsapp_igual_tel, activo_familiar,
      es_contacto_principal, es_contacto_emergencia, es_responsable_pagos,
      estado_invitacion, fecha_invitacion, ultimo_acceso_familiar,
      observaciones_familiar,
      paciente:pacientes(id, nombre, apellido)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getFamiliaresDelPaciente(pacienteId: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('familiar_paciente')
    .select(`
      id, parentesco, paciente_principal, permisos, activo,
      familiar:perfiles!familiar_id(id, nombre, apellido, email, telefono, telefono_whatsapp, activo_familiar, ultimo_acceso_familiar)
    `)
    .eq('paciente_id', pacienteId)
    .order('paciente_principal', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Mutations ───────────────────────────────────────────────

export async function invitarFamiliar(formData: FormData): Promise<{ error?: string; fieldErrors?: Record<string, string> }> {
  const { perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const raw = {
    email:               fd(formData, 'email'),
    nombre:              fd(formData, 'nombre'),
    apellido:            fd(formData, 'apellido'),
    telefono:            fd(formData, 'telefono') || undefined,
    telefono_whatsapp:   fd(formData, 'telefono_whatsapp') || undefined,
    whatsapp_igual_tel:  formData.get('whatsapp_igual_tel') === 'true',
    parentesco:          fd(formData, 'parentesco') || undefined,
    es_contacto_principal:  formData.get('es_contacto_principal') === 'on',
    es_contacto_emergencia: formData.get('es_contacto_emergencia') === 'on',
    es_responsable_pagos:   formData.get('es_responsable_pagos') === 'on',
    paciente_id:         fd(formData, 'paciente_id') || undefined,
    observaciones_familiar: fd(formData, 'observaciones_familiar') || undefined,
  }

  const parsed = InvitarFamiliarSchema.safeParse(raw)
  if (!parsed.success) return zodActionError(parsed.error)
  const d = parsed.data

  // Si hay paciente_id, verificar que existe
  if (d.paciente_id) {
    const { supabase } = await requireAuth()
    const { data: pac } = await supabase.from('pacientes').select('id').eq('id', d.paciente_id).single()
    if (!pac) return { error: 'El paciente seleccionado no existe' }
  }

  const admin = createServiceClient()
  const whatsapp = d.whatsapp_igual_tel ? (d.telefono ?? null) : (d.telefono_whatsapp ?? null)

  // Un mismo correo puede ser familiar de varios pacientes: si ya existe una
  // cuenta con ese email, no se crea otra, solo se vincula el paciente nuevo.
  const { data: existente } = await admin
    .from('perfiles')
    .select('id, rol')
    .eq('email', d.email)
    .maybeSingle()

  if (existente) {
    if (existente.rol !== 'familiar') {
      return { error: 'Este correo ya está registrado con otro rol (enfermero/admin/coordinador) y no puede usarse como familiar.' }
    }
    if (!d.paciente_id) {
      return { error: 'Este familiar ya existe. Selecciona un paciente para vincularlo.' }
    }

    const { error: relError } = await admin
      .from('familiar_paciente')
      .upsert({
        familiar_id: existente.id,
        paciente_id: d.paciente_id,
        paciente_principal: false,
        parentesco: d.parentesco ?? null,
        activo: true,
      }, { onConflict: 'familiar_id,paciente_id' })

    if (relError) return { error: `Error vinculando paciente: ${relError.message}` }

    await admin
      .from('perfiles')
      .update({
        telefono: d.telefono ?? null,
        telefono_whatsapp: whatsapp,
        whatsapp_igual_tel: d.whatsapp_igual_tel,
        es_contacto_principal: d.es_contacto_principal,
        es_contacto_emergencia: d.es_contacto_emergencia,
        es_responsable_pagos: d.es_responsable_pagos,
        observaciones_familiar: d.observaciones_familiar ?? null,
        activo_familiar: true,
      })
      .eq('id', existente.id)

    revalidatePath('/familiares')
    return {}
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(d.email, {
    data: { nombre: d.nombre, apellido: d.apellido },
  })
  if (inviteError) return { error: `Error al enviar invitación: ${inviteError.message}` }

  const userId = inviteData.user.id

  const { error: perfilError } = await admin
    .from('perfiles')
    .update({
      rol: 'familiar',
      nombre: d.nombre,
      apellido: d.apellido,
      telefono: d.telefono ?? null,
      telefono_whatsapp: whatsapp,
      whatsapp_igual_tel: d.whatsapp_igual_tel,
      parentesco: d.parentesco ?? null,
      es_contacto_principal: d.es_contacto_principal,
      es_contacto_emergencia: d.es_contacto_emergencia,
      es_responsable_pagos: d.es_responsable_pagos,
      paciente_id: d.paciente_id ?? null,
      estado_invitacion: 'enviada',
      fecha_invitacion: new Date().toISOString(),
      observaciones_familiar: d.observaciones_familiar ?? null,
      activo_familiar: true,
    })
    .eq('id', userId)

  if (perfilError) return { error: `Error actualizando perfil: ${perfilError.message}` }

  // Si hay paciente, crear relación en familiar_paciente
  if (d.paciente_id) {
    await admin
      .from('familiar_paciente')
      .upsert({
        familiar_id: userId,
        paciente_id: d.paciente_id,
        paciente_principal: true,
        parentesco: d.parentesco ?? null,
        activo: true,
      }, { onConflict: 'familiar_id,paciente_id' })
  }

  revalidatePath('/familiares')
  return {}
}

export async function actualizarFamiliar(
  familiarId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  const whatsappIgual = formData.get('whatsapp_igual_tel') === 'on'
  const telefono      = fd(formData, 'telefono') || null
  const whatsapp      = whatsappIgual ? telefono : (fd(formData, 'telefono_whatsapp') || null)

  const { error } = await supabase
    .from('perfiles')
    .update({
      nombre:              fd(formData, 'nombre'),
      apellido:            fd(formData, 'apellido'),
      telefono,
      telefono_whatsapp:   whatsapp,
      whatsapp_igual_tel:  whatsappIgual,
      parentesco:          fd(formData, 'parentesco') || null,
      es_contacto_principal:  formData.get('es_contacto_principal') === 'on',
      es_contacto_emergencia: formData.get('es_contacto_emergencia') === 'on',
      es_responsable_pagos:   formData.get('es_responsable_pagos') === 'on',
      activo_familiar:     formData.get('activo_familiar') !== 'false',
      observaciones_familiar: fd(formData, 'observaciones_familiar') || null,
    })
    .eq('id', familiarId)

  if (error) return { error: error.message }

  revalidatePath('/familiares')
  revalidatePath(`/familiares/${familiarId}`)
  return {}
}

export async function vincularPaciente(
  familiarId: string,
  pacienteId: string | null,
  parentesco?: string,
): Promise<void> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'coordinador')

  // Actualizar perfiles.paciente_id (compatibilidad)
  await supabase
    .from('perfiles')
    .update({ paciente_id: pacienteId, parentesco: parentesco ?? null })
    .eq('id', familiarId)

  // Actualizar/crear en familiar_paciente
  if (pacienteId) {
    await supabase
      .from('familiar_paciente')
      .upsert({
        familiar_id: familiarId,
        paciente_id: pacienteId,
        paciente_principal: true,
        parentesco: parentesco ?? null,
        activo: true,
      }, { onConflict: 'familiar_id,paciente_id' })
  }

  revalidatePath('/familiares')
  revalidatePath(`/familiares/${familiarId}`)
}

export async function suspenderAccesoFamiliar(familiarId: string): Promise<void> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  await supabase
    .from('perfiles')
    .update({ activo_familiar: false })
    .eq('id', familiarId)

  // También desactivar en familiar_paciente
  await supabase
    .from('familiar_paciente')
    .update({ activo: false })
    .eq('familiar_id', familiarId)

  revalidatePath('/familiares')
}

export async function removerFamiliar(id: string) {
  const { perfil } = await requireAuth()
  requireRole(perfil, 'admin')

  const admin = createServiceClient()
  await admin
    .from('perfiles')
    .update({ rol: 'familiar', paciente_id: null, activo_familiar: false })
    .eq('id', id)

  revalidatePath('/familiares')
}
