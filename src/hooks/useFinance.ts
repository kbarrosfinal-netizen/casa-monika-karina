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

/**
 * Saldo do vale-refeição para o mês selecionado.
 * Receita = finance_entries com category='vale-refeicao' (income lançado no último dia do mês)
 * Gasto = receipts cujo ocr_json.forma inclui 'Ticket' (compras pagas com ticket)
 * Saldo = receita - gasto
 */
export function useTicketBalance(monthStr: string) {
  const qc = useQueryClient()
  const { start, end } = monthBounds(monthStr)

  const q = useQuery({
    queryKey: ['ticket_balance', monthStr],
    queryFn: async () => {
      const { data: incomeRows, error: eIn } = await supabase
        .from('finance_entries')
        .select('amount')
        .eq('category', 'vale-refeicao')
        .eq('type', 'income')
        .gte('date', start)
        .lte('date', end)
      if (eIn) throw eIn

      const income = (incomeRows ?? []).reduce((s, e) => s + Number(e.amount || 0), 0)

      const { data: receipts, error: eR } = await supabase
        .from('receipts')
        .select('total, ocr_json, purchased_at')
        .gte('purchased_at', `${start}T00:00:00Z`)
        .lte('purchased_at', `${end}T23:59:59Z`)
      if (eR) throw eR

      const spent = (receipts ?? [])
        .filter(r => {
          const forma = (r.ocr_json as { forma?: string } | null)?.forma ?? ''
          return /ticket/i.test(forma)
        })
        .reduce((s, r) => s + Number(r.total || 0), 0)

      return { income, spent, remaining: income - spent }
    }
  })

  useEffect(() => {
    const ch = supabase
      .channel(`ticket-${monthStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_entries' }, () => {
        qc.invalidateQueries({ queryKey: ['ticket_balance'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => {
        qc.invalidateQueries({ queryKey: ['ticket_balance'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc, monthStr])

  return q
}
