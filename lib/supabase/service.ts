import { createClient } from '@supabase/supabase-js'

// Cliente con Service Role Key — solo para acciones de servidor (nunca exponer al cliente)
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurado')

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
