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

// Shape from migrated izete_events table (legacy data import)
export interface IzeteEventFull {
  id: string
  event_date: string
  paid: boolean
  paid_amount: number | null
  created_at: string
}

// Overload: no args → returns all events (IzeteEventFull[]) for the Zazá page
export function useIzete(): ReturnType<typeof useQuery<IzeteEventFull[]>>
// Overload: monthStr → returns month-filtered events (IzeteEvent[]) for the old calendar
export function useIzete(monthStr: string): ReturnType<typeof useQuery<IzeteEvent[]>>
export function useIzete(monthStr?: string): unknown {
  const qc = useQueryClient()

  const fullQuery = useQuery<IzeteEventFull[]>({
    queryKey: ['izete_events_full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('izete_events')
        .select('*')
        .order('event_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as IzeteEventFull[]
    },
    enabled: monthStr === undefined
  })

  const [y, m] = monthStr ? monthStr.split('-').map(Number) : [0, 0]
  const start = monthStr ? new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10) : ''
  const end = monthStr ? new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) : ''

  const monthQuery = useQuery<IzeteEvent[]>({
    queryKey: ['izete_events', monthStr ?? ''],
    queryFn: async (): Promise<IzeteEvent[]> => {
      const { data, error } = await supabase
        .from('izete_events')
        .select('*')
        .gte('date', start)
        .lte('date', end)
      if (error) throw error
      return data ?? []
    },
    enabled: monthStr !== undefined
  })

  useEffect(() => {
    if (monthStr === undefined) return
    const ch = supabase
      .channel(`izete-${monthStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'izete_events' }, () => {
        qc.invalidateQueries({ queryKey: ['izete_events'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc, monthStr])

  return monthStr === undefined ? fullQuery : monthQuery
}

export function useToggleIzetePaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      paid,
      amount,
    }: {
      id: string
      paid: boolean
      amount: number
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
          note: 'Diária Zazá'
        })
        if (fe) throw fe
      } else {
        await supabase.from('finance_entries').delete().eq('izete_event_id', id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['izete_events_full'] })
      qc.invalidateQueries({ queryKey: ['izete_events'] })
      qc.invalidateQueries({ queryKey: ['finance_entries'] })
    }
  })
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
        const newPaid = !currentEvent.paid
        const { error } = await supabase
          .from('izete_events')
          .update({ paid: newPaid, amount })
          .eq('id', currentEvent.id)
        if (error) throw error

        if (newPaid) {
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
          await supabase
            .from('finance_entries')
            .delete()
            .eq('izete_event_id', currentEvent.id)
        }
      } else {
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
