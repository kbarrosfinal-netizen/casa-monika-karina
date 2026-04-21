import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ServiceOrder {
  id: string
  os_number: string
  client: string
  document: string | null
  description: string | null
  total: number | null
  created_at: string
}

export function useServiceOrders() {
  return useQuery({
    queryKey: ['service_orders'],
    queryFn: async (): Promise<ServiceOrder[]> => {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    }
  })
}

export function useAddServiceOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (os: Omit<ServiceOrder, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('service_orders').insert(os)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service_orders'] })
  })
}

export function useDeleteServiceOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_orders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service_orders'] })
  })
}
