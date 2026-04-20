import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProductPrice } from '@/lib/types'

export function useProductPrices(productIds: string[]) {
  return useQuery({
    queryKey: ['product_prices', productIds.sort().join(',')],
    enabled: productIds.length > 0,
    queryFn: async (): Promise<ProductPrice[]> => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('product_prices')
        .select('*')
        .in('product_id', productIds)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    }
  })
}
