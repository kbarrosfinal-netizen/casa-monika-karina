import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Apaga um cupom: remove a foto do Storage (se ainda existir),
 * deleta a linha em receipts. FKs com on delete cascade limpam
 * receipt_items e finance_entries automaticamente.
 *
 * monthly_list e product_prices ficam — produtos cadastrados a partir
 * dessa nota continuam válidos.
 */
export function useDeleteReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, photoUrl }: { id: string; photoUrl: string }) => {
      // 1. Apaga foto do Storage (best effort, não bloqueia)
      if (photoUrl) {
        const marker = '/storage/v1/object/public/receipts/'
        const idx = photoUrl.indexOf(marker)
        if (idx !== -1) {
          const path = photoUrl.slice(idx + marker.length)
          await supabase.storage.from('receipts').remove([path])
        }
      }

      // 2. Apaga a row (cascata em receipt_items + finance_entries)
      const { error } = await supabase.from('receipts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['finance_entries'] })
      qc.invalidateQueries({ queryKey: ['monthly_summary'] })
    }
  })
}
