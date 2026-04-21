import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface FinanceEntry {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string | null
  source: 'receipt' | 'izete' | 'manual'
  receipt_id: string | null
  date: string
  note: string | null
}

function monthBounds(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  return { start, end }
}

export function useFinance(monthStr: string) {
  const qc = useQueryClient()
  const { start, end } = monthBounds(monthStr)

  const q = useQuery({
    queryKey: ['finance_entries', monthStr],
    queryFn: async (): Promise<FinanceEntry[]> => {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    }
  })

  useEffect(() => {
    const ch = supabase
      .channel(`finance-${monthStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_entries' }, () => {
        qc.invalidateQueries({ queryKey: ['finance_entries'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc, monthStr])

  return q
}

export function useAddFinanceEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Omit<FinanceEntry, 'id'>) => {
      const { error } = await supabase.from('finance_entries').insert(entry)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance_entries'] })
  })
}
