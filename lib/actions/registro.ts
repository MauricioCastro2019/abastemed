'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export async function registrarEnfermero(formData: FormData) {
  const email      = formData.get('email') as string
  const password   = formData.get('password') as string
  const nombre     = formData.get('nombre') as string
  const apellido   = formData.get('apellido') as string
  const cedula     = formData.get('cedula') as string
  const telefono   = formData.get('telefono') as string
  const rawEsp     = formData.get('especialidades') as string
  const especialidades = rawEsp
    ? rawEsp.split('\n').map(s => s.trim()).filter(Boolean)
    : []

  const admin = createServiceClient()

  // 1. Crear usuario en Supabase Auth (sin requerir confirmación de email)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido },
  })

  if (authError) {
    if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
      throw new Error('Este correo ya tiene una cuenta registrada.')
    }
    throw new Error(`Error al crear la cuenta: ${authError.message}`)
  }

  const userId = authData.user.id

  // 2. Actualizar perfil (creado por el trigger handle_new_user)
  await admin
    .from('perfiles')
    .update({ rol: 'enfermero', nombre, apellido })
    .eq('id', userId)

  // 3. Crear registro de enfermero (disponible=false hasta que el admin lo apruebe)
  const { error: enfermeroError } = await admin.from('enfermeros').insert({
    nombre,
    apellido,
    cedula,
    email,
    telefono,
    especialidades,
    disponible:   false,
    rating:       0,
    total_casos:  0,
  })

  if (enfermeroError) {
    // Si falla, eliminar el usuario creado para no dejar basura
    await admin.auth.admin.deleteUser(userId)
    throw new Error(`Error al guardar datos: ${enfermeroError.message}`)
  }

  redirect('/login?registered=1')
}
