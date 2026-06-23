'use client'

import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

interface Props {
  tables: string[]
}

export function RealtimeRefresh({ tables }: Props) {
  useRealtimeRefresh(tables)
  return null
}
