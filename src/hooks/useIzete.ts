import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface IzeteEventFull {
  id: string
  event_date: string
  description: string | null
  paid: boolean
  paid_amount: number | null
  created_at: string
}

export function useIzete() {
  const qc = useQueryClient()

  const query = useQuery<IzeteEventFull[]>({
    queryKey: ['izete_events_full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('izete_events')
        .select('*')
        .order('event_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as IzeteEventFull[]
    }
  })

  useEffect(() => {
    const ch = supabase
      .channel('izete_events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'izete_events' }, () => {
        qc.invalidateQueries({ queryKey: ['izete_events_full'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])

  return query
}

/** Marca "veio" num dia — cria evento com paid=false */
export function useMarkCame() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (date: string) => {
      const { data, error } = await supabase
        .from('izete_events')
        .insert({
          event_date: date,
          description: 'Zazá veio',
          paid: false,
          paid_amount: 0
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['izete_events_full'] })
    }
  })
}

/** Desmarca "veio" — apaga evento e finance entry (se houver) */
export function useUnmarkCame() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (eventId: string) => {
      await supabase.from('finance_entries').delete().eq('izete_event_id', eventId)
      const { error } = await supabase.from('izete_events').delete().eq('id', eventId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['izete_events_full'] })
      qc.invalidateQueries({ queryKey: ['finance_entries'] })
    }
  })
}

/** Alterna pago/não pago num evento existente */
export function useTogglePaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      paid,
      amount,
      eventDate
    }: {
      id: string
      paid: boolean
      amount: number
      eventDate: string
    }) => {
      const { error } = await supabase
        .from('izete_events')
        .update({ paid, paid_amount: paid ? amount : 0 })
        .eq('id', id)
      if (error) throw error

      if (paid) {
        const { error: fe } = await supabase.from('finance_entries').insert({
          type: 'expense',
          amount,
          category: 'diarista',
          source: 'izete',
          izete_event_id: id,
          date: eventDate,
          note: 'Diária Zazá'
        })
        if (fe) throw fe
      } else {
        await supabase.from('finance_entries').delete().eq('izete_event_id', id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['izete_events_full'] })
      qc.invalidateQueries({ queryKey: ['finance_entries'] })
    }
  })
}

// Aliases pra compatibilidade com imports antigos
export const useToggleIzetePaid = useTogglePaid
