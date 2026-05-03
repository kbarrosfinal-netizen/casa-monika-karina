import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ReceiptItemRow {
  id: string
  product_id: string | null
  product_name_raw: string
  quantity: number
  unit_price: number | null
  total_price: number | null
  product?: { name: string; icon: string } | null
}

export interface ReceiptDetail {
  id: string
  photo_url: string
  total: number | null
  purchased_at: string | null
  status: 'processing' | 'done' | 'failed'
  ocr_raw: string | null
  ocr_json: { store?: string; date?: string; total?: number; forma?: string; manual?: boolean; obs?: string } | null
  store: { id: string; name: string; color: string } | null
  items: ReceiptItemRow[]
}

export function useReceiptDetail(receiptId: string | null) {
  return useQuery({
    queryKey: ['receipt_detail', receiptId],
    enabled: !!receiptId,
    queryFn: async (): Promise<ReceiptDetail | null> => {
      if (!receiptId) return null

      const { data: receipt, error: rErr } = await supabase
        .from('receipts')
        .select('id, photo_url, total, purchased_at, status, ocr_raw, ocr_json, store:stores(id,name,color)')
        .eq('id', receiptId)
        .single()
      if (rErr) throw rErr

      const { data: items, error: iErr } = await supabase
        .from('receipt_items')
        .select('id, product_id, product_name_raw, quantity, unit_price, total_price, product:products(name, icon)')
        .eq('receipt_id', receiptId)
        .order('id', { ascending: true })
      if (iErr) throw iErr

      return {
        ...receipt,
        store: Array.isArray(receipt.store) ? receipt.store[0] ?? null : (receipt.store as ReceiptDetail['store']),
        items: (items ?? []).map(it => ({
          ...it,
          product: Array.isArray(it.product) ? it.product[0] ?? null : (it.product as ReceiptItemRow['product'])
        }))
      } as ReceiptDetail
    }
  })
}
