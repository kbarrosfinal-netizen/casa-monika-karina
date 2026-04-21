import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Pet {
  id: string
  name: string
  species: string
  emoji: string
  birthdate: string | null
  notes: string | null
  created_at: string
}

export function usePets() {
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['pets'],
    queryFn: async (): Promise<Pet[]> => {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    }
  })

  useEffect(() => {
    const ch = supabase
      .channel('pets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pets' }, () => {
        qc.invalidateQueries({ queryKey: ['pets'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])

  return q
}

export function useAddPet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pet: Omit<Pet, 'id' | 'created_at'>) => {
      const { error } = await supabase.from('pets').insert(pet)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pets'] })
  })
}

export function useUpdatePet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...pet }: Partial<Pet> & { id: string }) => {
      const { error } = await supabase.from('pets').update(pet).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pets'] })
  })
}

export function useDeletePet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pets'] })
  })
}
