// src/hooks/useReceiptUpload.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { v4 as uuid } from 'uuid'

export function useReceiptUpload() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const month = new Date().toISOString().slice(0, 7)
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${month}/${uuid()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, file, { contentType: file.type })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      const photoUrl = urlData.publicUrl

      const { data: receipt, error: insertErr } = await supabase
        .from('receipts')
        .insert({ photo_url: photoUrl, status: 'processing' })
        .select()
        .single()
      if (insertErr) throw insertErr

      const resp = await fetch('/api/ocr-receipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ receipt_id: receipt.id, photo_url: photoUrl })
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error ?? 'Falha ao processar nota')
      }
      return { receiptId: receipt.id, ...(await resp.json()) as { items: number; total: number } }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['product_prices'] })
      qc.invalidateQueries({ queryKey: ['shopping_list'] })
      qc.invalidateQueries({ queryKey: ['monthly_list'] })
      qc.invalidateQueries({ queryKey: ['finance_entries'] })
    }
  })
}
