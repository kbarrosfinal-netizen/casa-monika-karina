// src/hooks/useReceipts.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ReceiptRow {
  id: string
  photo_url: string
  total: number | null
  purchased_at: string | null
  status: 'processing' | 'done' | 'failed'
  created_at: string
  store: { id: string; name: string; color: string } | null
}

export function useReceipts() {
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['receipts'],
    queryFn: async (): Promise<ReceiptRow[]> => {
      const { data, error } = await supabase
        .from('receipts')
        .select('id, photo_url, total, purchased_at, status, created_at, store:stores(id,name,color)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(r => ({
        ...r,
        store: Array.isArray(r.store) ? r.store[0] ?? null : r.store as { id: string; name: string; color: string } | null
      }))
    }
  })

  useEffect(() => {
    const channel = supabase
      .channel('receipts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => {
        qc.invalidateQueries({ queryKey: ['receipts'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return q
}
