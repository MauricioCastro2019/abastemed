'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { DEFAULT_ORG_ID } from './utils'

type RegistroResult = { ok: true } | { ok: false; error: string }

export async function registrarEnfermero(formData: FormData): Promise<RegistroResult> {
  const email        = formData.get('email') as string
  const password     = formData.get('password') as string
  const nombre       = formData.get('nombre') as string
  const apellido     = formData.get('apellido') as string
  const cedula       = formData.get('cedula') as string
  const telefono     = formData.get('telefono') as string
  const rawEsp       = formData.get('especialidades') as string
  const especialidades = rawEsp
    ? rawEsp.split('\n').map(s => s.trim()).filter(Boolean)
    : []

  const admin = createServiceClient()

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido },
  })

  if (authError) {
    const msg = authError.message.toLowerCase()
    if (msg.includes('already') || msg.includes('exists')) {
      return { ok: false, error: 'Este correo ya tiene una cuenta registrada.' }
    }
    return { ok: false, error: `Error al crear la cuenta: ${authError.message}` }
  }

  const userId = authData.user.id

  // 2. Actualizar perfil (creado por el trigger handle_new_user)
  await admin
    .from('perfiles')
    .update({ rol: 'enfermero', nombre, apellido })
    .eq('id', userId)

  // 3. Crear registro de enfermero (disponible=false hasta aprobación del admin)
  const { error: enfermeroError } = await admin.from('enfermeros').insert({
    nombre,
    apellido,
    cedula,
    email,
    telefono,
    especialidades,
    disponible:      false,
    rating:          0,
    total_casos:     0,
    organization_id: DEFAULT_ORG_ID,
  })

  if (enfermeroError) {
    await admin.auth.admin.deleteUser(userId)
    if (enfermeroError.message.toLowerCase().includes('cedula') ||
        enfermeroError.message.toLowerCase().includes('unique')) {
      return { ok: false, error: 'La cédula o correo ya están registrados en el sistema.' }
    }
    return { ok: false, error: `Error al guardar datos: ${enfermeroError.message}` }
  }

  return { ok: true }
}
