'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeRefresh(tables: string[]) {
  const router = useRouter()
  const key = tables.join(',')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`realtime-refresh-${key}`)
    let timeout: ReturnType<typeof setTimeout> | null = null

    const scheduleRefresh = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => { router.refresh() }, 300)
    }

    tables.forEach(table => {
      channel.on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        scheduleRefresh
      )
    })

    channel.subscribe()

    return () => {
      if (timeout) clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
