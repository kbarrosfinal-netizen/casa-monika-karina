import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Atualiza ocr_json.forma de um cupom (preserva o resto do ocr_json) e
 * sincroniza a note do finance_entry vinculado pra "Loja — Forma".
 *
 * Útil quando OCR não conseguiu identificar a forma de pagamento, ou
 * leu errado.
 */
export function useUpdateReceiptForma() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, forma, storeName }: { id: string; forma: string | null; storeName: string | null }) => {
      // 1. Lê ocr_json atual pra preservar outros campos
      const { data: current, error: rErr } = await supabase
        .from('receipts')
        .select('ocr_json')
        .eq('id', id)
        .single()
      if (rErr) throw rErr

      const newJson = { ...(current?.ocr_json ?? {}), forma: forma ?? null }

      const { error: uErr } = await supabase
        .from('receipts')
        .update({ ocr_json: newJson })
        .eq('id', id)
      if (uErr) throw uErr

      // 2. Atualiza note do finance_entry vinculado (se existir)
      const noteParts = [storeName, forma].filter(Boolean)
      const note = noteParts.length > 0 ? noteParts.join(' — ') : null
      await supabase.from('finance_entries').update({ note }).eq('receipt_id', id)
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipt_detail', id] })
      qc.invalidateQueries({ queryKey: ['finance_entries'] })
      qc.invalidateQueries({ queryKey: ['ticket_balance'] })
    }
  })
}
