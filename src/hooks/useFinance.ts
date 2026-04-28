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
 * Saldo do vale-refeição do mês selecionado.
 * Orçamento = settings.ticket_value (fixo por mês, independente de quando o auto-ticket lança)
 * Gasto = receipts cujo ocr_json.forma inclui 'Ticket' no mês selecionado
 * Saldo = orçamento - gasto
 *
 * Obs: o auto-ticket ainda lança a entrada no último dia do mês em finance_entries
 * (pra bater com o extrato do banco), mas o card de saldo não depende disso.
 */
export function useTicketBalance(monthStr: string) {
  const qc = useQueryClient()
  const { start, end } = monthBounds(monthStr)

  const q = useQuery({
    queryKey: ['ticket_balance', monthStr],
    queryFn: async () => {
      const { data: settings, error: eS } = await supabase
        .from('settings')
        .select('ticket_value')
        .eq('id', 'household')
        .maybeSingle()
      if (eS) throw eS

      const budget = Number(settings?.ticket_value ?? 3000)

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

      return { income: budget, spent, remaining: budget - spent }
    }
  })

  useEffect(() => {
    const ch = supabase
      .channel(`ticket-${monthStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
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
