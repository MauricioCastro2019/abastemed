'use server'

import { revalidatePath } from 'next/cache'
import type { Paciente } from '@/types'
import { requireAuth, requireRole, fd, fdLines, zodActionError, type ActionResult } from './utils'
import { PacienteSchema } from '@/lib/validations'

export async function getPacientes(search?: string) {
  const { supabase } = await requireAuth()
  let query = supabase
    .from('pacientes')
    .select('*')
    .order('created_at', { ascending: false })

  if (search?.trim()) {
    query = query.or(
      `nombre.ilike.%${search}%,apellido.ilike.%${search}%,diagnostico.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Paciente[]
}

export async function getPaciente(id: string) {
  const { supabase } = await requireAuth()
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Paciente
}

export async function crearPaciente(formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = PacienteSchema.safeParse({
    nombre:            fd(formData, 'nombre'),
    apellido:          fd(formData, 'apellido'),
    fecha_nacimiento:  fd(formData, 'fecha_nacimiento'),
    diagnostico:       fd(formData, 'diagnostico'),
    contexto:          fd(formData, 'contexto'),
    contacto_nombre:   fd(formData, 'contacto_nombre'),
    contacto_telefono: fd(formData, 'contacto_telefono'),
    contacto_relacion: fd(formData, 'contacto_relacion'),
    contacto_email:    fd(formData, 'contacto_email'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data
  const { error } = await supabase.from('pacientes').insert({
    nombre:           v.nombre,
    apellido:         v.apellido,
    fecha_nacimiento: v.fecha_nacimiento,
    diagnostico:      v.diagnostico,
    medicamentos:     fdLines(formData, 'medicamentos'),
    alergias:         fdLines(formData, 'alergias'),
    contacto_familiar: {
      nombre:   v.contacto_nombre,
      telefono: v.contacto_telefono,
      email:    v.contacto_email || null,
      relacion: v.contacto_relacion,
    },
    contexto: v.contexto,
    status:   'activo',
  })

  if (error) return { error: error.message }

  revalidatePath('/pacientes')
  return {}
}

export async function actualizarPaciente(id: string, formData: FormData): Promise<ActionResult> {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const parsed = PacienteSchema.safeParse({
    nombre:            fd(formData, 'nombre'),
    apellido:          fd(formData, 'apellido'),
    fecha_nacimiento:  fd(formData, 'fecha_nacimiento'),
    diagnostico:       fd(formData, 'diagnostico'),
    contexto:          fd(formData, 'contexto'),
    contacto_nombre:   fd(formData, 'contacto_nombre'),
    contacto_telefono: fd(formData, 'contacto_telefono'),
    contacto_relacion: fd(formData, 'contacto_relacion'),
    contacto_email:    fd(formData, 'contacto_email'),
  })

  if (!parsed.success) return zodActionError(parsed.error)

  const v = parsed.data
  const { error } = await supabase.from('pacientes').update({
    nombre:           v.nombre,
    apellido:         v.apellido,
    fecha_nacimiento: v.fecha_nacimiento,
    diagnostico:      v.diagnostico,
    medicamentos:     fdLines(formData, 'medicamentos'),
    alergias:         fdLines(formData, 'alergias'),
    contacto_familiar: {
      nombre:   v.contacto_nombre,
      telefono: v.contacto_telefono,
      email:    v.contacto_email || null,
      relacion: v.contacto_relacion,
    },
    contexto: v.contexto,
    status:   fd(formData, 'status') || 'activo',
  }).eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/pacientes')
  revalidatePath(`/pacientes/${id}`)
  return {}
}

export async function cambiarStatusPaciente(id: string, status: 'activo' | 'cerrado') {
  const { supabase, perfil } = await requireAuth()
  requireRole(perfil, 'admin', 'jefe_enfermeros')

  const { error } = await supabase
    .from('pacientes')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/pacientes')
  revalidatePath(`/pacientes/${id}`)
}
