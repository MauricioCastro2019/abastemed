import { createClient } from '@/lib/supabase/server'
import type { PerfilUsuario } from '@/types'
import type { ZodError } from 'zod'

export type ActionResult = {
  error?: string
  fieldErrors?: Record<string, string>
}

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!perfil) throw new Error('Perfil no encontrado')

  return { supabase, user, perfil: perfil as PerfilUsuario }
}

export function requireRole(perfil: PerfilUsuario, ...roles: PerfilUsuario['rol'][]) {
  if (!roles.includes(perfil.rol)) {
    throw new Error('No tienes permiso para realizar esta acción')
  }
}

// Helpers null-safe para FormData
export function fd(formData: FormData, key: string): string {
  return (formData.get(key) as string | null) ?? ''
}

export function fdNum(formData: FormData, key: string): number {
  return parseFloat(fd(formData, key)) || 0
}

export function fdBool(formData: FormData, key: string): boolean {
  return formData.get(key) === 'true'
}

export function fdLines(formData: FormData, key: string): string[] {
  return fd(formData, key).split('\n').map(s => s.trim()).filter(Boolean)
}

export function zodActionError(err: ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {}
  for (const issue of err.issues) {
    const field = issue.path[0]?.toString() ?? '_'
    if (!fieldErrors[field]) fieldErrors[field] = issue.message
  }
  const first = Object.values(fieldErrors)[0] ?? 'Error de validación'
  return { error: first, fieldErrors }
}
