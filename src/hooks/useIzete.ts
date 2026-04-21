import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface IzeteEvent {
  id: string
  date: string
  paid: boolean
  amount: number
  created_at: string
}

export function useIzete(monthStr: string) {
  const qc = useQueryClient()
  const [y, m] = monthStr.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)

  const q = useQuery({
    queryKey: ['izete_events', monthStr],
    queryFn: async (): Promise<IzeteEvent[]> => {
      const { data, error } = await supabase
        .from('izete_events')
        .select('*')
        .gte('date', start)
        .lte('date', end)
      if (error) throw error
      return data ?? []
    }
  })

  useEffect(() => {
    const ch = supabase
      .channel(`izete-${monthStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'izete_events' }, () => {
        qc.invalidateQueries({ queryKey: ['izete_events'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc, monthStr])

  return q
}

export function useToggleIzeteDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      date,
      currentEvent,
      amount,
    }: {
      date: string
      currentEvent: IzeteEvent | undefined
      amount: number
    }) => {
      if (currentEvent) {
        // Toggle paid flag
        const newPaid = !currentEvent.paid
        const { error } = await supabase
          .from('izete_events')
          .update({ paid: newPaid, amount })
          .eq('id', currentEvent.id)
        if (error) throw error

        if (newPaid) {
          // Insert finance_entry
          const { error: fe } = await supabase.from('finance_entries').insert({
            type: 'expense',
            amount,
            category: 'diarista',
            source: 'izete',
            izete_event_id: currentEvent.id,
            date,
            note: 'Diária Izete'
          })
          if (fe) throw fe
        } else {
          // Delete corresponding finance_entry
          await supabase
            .from('finance_entries')
            .delete()
            .eq('izete_event_id', currentEvent.id)
        }
      } else {
        // Create new event as scheduled (unpaid)
        const { data: newEvent, error } = await supabase
          .from('izete_events')
          .insert({ date, paid: false, amount })
          .select()
          .single()
        if (error) throw error
        return newEvent
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['izete_events'] })
      qc.invalidateQueries({ queryKey: ['finance_entries'] })
    }
  })
}
