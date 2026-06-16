import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Sin credenciales reales, dejar pasar (entorno de desarrollo)
  if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseKey || supabaseKey.includes('placeholder')) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas que requieren auth
  const protectedPrefixes = [
    '/dashboard',
    '/prospectos',
    '/pacientes',
    '/enfermeros',
    '/casos',
    '/turnos',
    '/cobranza',
    '/familiares',
    '/recibos',
    '/finanzas',
    '/cortes',
    '/bitacora',
    '/levantamientos',
    '/insumos',
    '/agenda-cuidado',
    '/salud-sistema',
    '/imprimir',
    '/enfermero',
    '/familiar',
  ]

  const isProtected = protectedPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirigir desde /login si ya está autenticado
  if (user && pathname === '/login') {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if (perfil?.rol === 'enfermero') {
      url.pathname = '/enfermero/dashboard'
    } else if (perfil?.rol === 'familiar') {
      url.pathname = '/familiar/dashboard'
    } else {
      // admin y jefe_enfermeros van al dashboard
      url.pathname = '/dashboard'
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
