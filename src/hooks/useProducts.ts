import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product, Category, Store } from '@/lib/types'

export function useProducts() {
  const query = useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select('*').order('name')
      if (error) throw error
      return data ?? []
    }
  })
  return query
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories').select('*').order('order')
      if (error) throw error
      return data ?? []
    }
  })
}

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async (): Promise<Store[]> => {
      const { data, error } = await supabase.from('stores').select('*').order('order')
      if (error) throw error
      return data ?? []
    }
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (productId: string) => {
      // Try to delete; ON DELETE behavior depends on FKs (cascade or set null configured server-side).
      // We pre-clean dependents to be safe across schemas without ON DELETE CASCADE.
      await supabase.from('shopping_list').delete().eq('product_id', productId)
      await supabase.from('monthly_list').delete().eq('product_id', productId)
      await supabase.from('product_prices').delete().eq('product_id', productId)
      await supabase.from('receipt_items').update({ product_id: null }).eq('product_id', productId)
      const { error } = await supabase.from('products').delete().eq('id', productId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['shopping_list'] })
      qc.invalidateQueries({ queryKey: ['monthly_list'] })
      qc.invalidateQueries({ queryKey: ['product_prices'] })
    }
  })
}
