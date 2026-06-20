import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Key, LogOut, Phone, Mail } from 'lucide-react'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, apellido, email, telefono, parentesco, estado_invitacion')
    .eq('id', user.id)
    .single()

  async function handleLogout() {
    'use server'
    const s = await createClient()
    await s.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>Mi cuenta</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configuración y preferencias</p>
      </div>

      {/* Perfil */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ backgroundColor: '#1B2B4B' }}
          >
            {perfil?.nombre?.[0] ?? '?'}{perfil?.apellido?.[0] ?? ''}
          </div>
          <div>
            <p className="font-bold text-base leading-tight" style={{ color: '#1B2B4B' }}>
              {perfil?.nombre} {perfil?.apellido}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{perfil?.email}</p>
            {perfil?.parentesco && (
              <p className="text-[10px] text-gray-300 mt-0.5 capitalize">{perfil.parentesco}</p>
            )}
          </div>
        </div>

        {perfil?.telefono && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
            <Phone size={13} className="text-gray-400" />
            <p className="text-xs text-gray-500">{perfil.telefono}</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        <Link
          href="/actualizar-contrasena"
          className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Key size={16} className="text-gray-400" />
            <span className="text-sm text-gray-700">Cambiar contraseña</span>
          </div>
          <span className="text-gray-300 text-lg leading-none">›</span>
        </Link>

        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-1">
            <Mail size={16} className="text-gray-400" />
            <span className="text-sm text-gray-700">Correo de acceso</span>
          </div>
          <p className="text-xs text-gray-400 ml-7">{perfil?.email}</p>
        </div>
      </div>

      {/* Cerrar sesión */}
      <div className="bg-white rounded-2xl shadow-sm">
        <form action={handleLogout}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-5 py-4 text-red-500 hover:bg-red-50 transition-colors rounded-2xl"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </form>
      </div>

      <p className="text-[10px] text-gray-300 text-center">
        Para actualizar tus datos de contacto, comunícate con el equipo de Abastemed.
      </p>
    </div>
  )
}
