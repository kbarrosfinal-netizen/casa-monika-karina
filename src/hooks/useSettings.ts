import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SettingsRow {
  id: string
  ticket_value: number
  diaria_value: number
  transp_value: number
  whatsapp_phone: string | null
  data: {
    diarista_name?: string
    diarista_pix?: string
    diarista_day?: string
    diarista_tasks?: Array<{ id: number; t: string; done: boolean }>
  }
  updated_at: string
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingsRow | null> => {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 'household').maybeSingle()
      if (error) throw error
      return data as SettingsRow | null
    }
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<SettingsRow>) => {
      const { error } = await supabase.from('settings').update(patch).eq('id', 'household')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] })
  })
}
