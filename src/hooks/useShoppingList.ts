import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ShoppingListItem } from '@/lib/types'

export function useShoppingList() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['shopping_list'],
    queryFn: async (): Promise<ShoppingListItem[]> => {
      const { data, error } = await supabase.from('shopping_list').select('*')
      if (error) throw error
      return data ?? []
    }
  })

  useEffect(() => {
    const channel = supabase
      .channel('shopping_list-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, () => {
        qc.invalidateQueries({ queryKey: ['shopping_list'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return query
}

/**
 * Toggle ou cria entrada de shopping_list por product_id.
 * Robusto a múltiplas linhas (após drop do unique em 0005): pega a mais recente.
 */
export function useToggleMissing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ productId, isMissing }: { productId: string; isMissing: boolean }) => {
      const { data: rows, error: selErr } = await supabase
        .from('shopping_list')
        .select('id')
        .eq('product_id', productId)
        .order('added_at', { ascending: false })
        .limit(1)
      if (selErr) throw selErr

      const existing = rows?.[0]
      if (existing) {
        const { error } = await supabase
          .from('shopping_list')
          .update({ is_missing: isMissing })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('shopping_list')
          .insert({ product_id: productId, is_missing: isMissing })
        if (error) throw error
      }
    },
    onMutate: async ({ productId, isMissing }) => {
      await qc.cancelQueries({ queryKey: ['shopping_list'] })
      const prev = qc.getQueryData<ShoppingListItem[]>(['shopping_list'])
      qc.setQueryData<ShoppingListItem[]>(['shopping_list'], (old = []) => {
        const found = old.find(i => i.product_id === productId)
        if (found) {
          return old.map(i => i.product_id === productId ? { ...i, is_missing: isMissing } : i)
        }
        return [...old, {
          id: `optimistic-${productId}`,
          product_id: productId,
          is_missing: isMissing,
          quantity: 1,
          added_at: new Date().toISOString(),
          added_by: null
        }]
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['shopping_list'], ctx.prev)
    }
  })
}

/**
 * DELETE definitivo da shopping_list (todas as linhas do produto).
 * Diferente do toggle: remove a entrada inteira do banco.
 */
export function useDeleteShoppingItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('product_id', productId)
      if (error) throw error
    },
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: ['shopping_list'] })
      const prev = qc.getQueryData<ShoppingListItem[]>(['shopping_list'])
      qc.setQueryData<ShoppingListItem[]>(
        ['shopping_list'],
        (old = []) => old.filter(i => i.product_id !== productId)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['shopping_list'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['shopping_list'] })
  })
}
