import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface MonthlySummary {
  month: string
  expense_total: number
  income_total: number
  by_category: { category: string; total: number }[]
  by_store: { store: string; total: number }[]
}

export function useMonthlySummary(monthStr: string) {
  const qc = useQueryClient()

  const q = useQuery<MonthlySummary>({
    queryKey: ['monthly_summary', monthStr],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_summary', { month_str: monthStr })
      if (error) throw error
      return data as MonthlySummary
    }
  })

  useEffect(() => {
    const ch = supabase
      .channel(`monthly-summary-${monthStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_entries' }, () => {
        qc.invalidateQueries({ queryKey: ['monthly_summary'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => {
        qc.invalidateQueries({ queryKey: ['monthly_summary'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc, monthStr])

  return q
}
