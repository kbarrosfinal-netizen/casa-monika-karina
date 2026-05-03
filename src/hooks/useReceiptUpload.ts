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

      // [1/3] Upload pro Storage (bucket 'receipts')
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, file, { contentType: file.type })
      if (uploadErr) {
        throw new Error(`[1/3 Upload] ${uploadErr.message}`)
      }

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
      const photoUrl = urlData.publicUrl

      // [2/3] Cria row em receipts (status='processing')
      const { data: receipt, error: insertErr } = await supabase
        .from('receipts')
        .insert({ photo_url: photoUrl, status: 'processing' })
        .select()
        .single()
      if (insertErr) {
        throw new Error(`[2/3 DB receipts] ${insertErr.message}`)
      }

      // [3/3] Chama function OCR
      const resp = await fetch('/api/ocr-receipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ receipt_id: receipt.id, photo_url: photoUrl })
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(`[3/3 Function] ${err.error ?? 'Falha ao processar nota'}`)
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
