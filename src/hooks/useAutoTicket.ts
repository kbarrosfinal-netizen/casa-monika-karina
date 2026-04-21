import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSettings } from './useSettings'

// Checa se o último dia do mês passado já tem o ticket R$3000 lançado.
// Se não, insere (só uma vez por sessão por mês).
export function useAutoTicket() {
  const { data: settings } = useSettings()

  useEffect(() => {
    if (!settings) return
    const ticketValue = Number(settings.ticket_value || 3000)
    if (ticketValue <= 0) return

    async function ensureTicket() {
      const today = new Date()
      const year = today.getFullYear()
      const month = today.getMonth() + 1
      const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)

      // Só roda se hoje >= último dia (o ticket "entra" no último dia do mês)
      if (today.toISOString().slice(0, 10) < lastDay) return

      const { data: existing } = await supabase
        .from('finance_entries')
        .select('id')
        .eq('date', lastDay)
        .eq('category', 'vale-refeicao')
        .eq('source', 'manual')
        .maybeSingle()

      if (existing) return

      await supabase.from('finance_entries').insert({
        type: 'income',
        amount: ticketValue,
        category: 'vale-refeicao',
        source: 'manual',
        date: lastDay,
        note: `Vale-refeição ${today.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`
      })
    }

    ensureTicket().catch(err => console.warn('auto-ticket:', err))
  }, [settings])
}
