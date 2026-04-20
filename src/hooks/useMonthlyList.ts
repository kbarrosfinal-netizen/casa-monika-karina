import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MonthlyListItem } from '@/lib/types'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function useMonthlyList(month: string = currentMonth()) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['monthly_list', month],
    queryFn: async (): Promise<MonthlyListItem[]> => {
      const { data, error } = await supabase
        .from('monthly_list')
        .select('*')
        .eq('month', month)
      if (error) throw error
      return data ?? []
    }
  })

  useEffect(() => {
    const channel = supabase
      .channel(`monthly_list-${month}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_list' }, () => {
        qc.invalidateQueries({ queryKey: ['monthly_list'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc, month])

  return query
}

export function useAcceptMonthlyItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('monthly_list')
        .update({ suggested: false, accepted: true })
        .eq('id', itemId)
      if (error) throw error
    },
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: ['monthly_list'] })
      const prev = qc.getQueryData<MonthlyListItem[]>(['monthly_list'])
      qc.setQueryData<MonthlyListItem[]>(['monthly_list'], (old = []) => {
        return old.map(i => i.id === itemId ? { ...i, suggested: false, accepted: true } : i)
      })
      return { prev }
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['monthly_list'], ctx.prev)
    }
  })
}

export function useRemoveMonthlyItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('monthly_list')
        .delete()
        .eq('id', itemId)
      if (error) throw error
    },
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: ['monthly_list'] })
      const prev = qc.getQueryData<MonthlyListItem[]>(['monthly_list'])
      qc.setQueryData<MonthlyListItem[]>(['monthly_list'], (old = []) => {
        return old.filter(i => i.id !== itemId)
      })
      return { prev }
    },
    onError: (_err, _itemId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['monthly_list'], ctx.prev)
    }
  })
}
