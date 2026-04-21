import { supabase } from '@/lib/supabase'

/**
 * Client-side retroactive enrichment of monthly list.
 * Scans receipt_items from last 6 months, finds products appearing in ≥ 2 distinct months,
 * and inserts them as suggestions in the current month's list (if not already present).
 * Returns count of new suggestions inserted.
 */
export async function enrichMonthlyRetroactive(): Promise<number> {
  const sixMonthsAgo = new Date(Date.now() - 180 * 86_400_000).toISOString()

  const { data: historical, error } = await supabase
    .from('receipt_items')
    .select('product_id, receipts!inner(purchased_at)')
    .not('product_id', 'is', null)
    .gte('receipts.purchased_at', sixMonthsAgo)

  if (error) throw error
  if (!historical) return 0

  // Count distinct months per product
  const monthlyCounts = new Map<string, Set<string>>()
  for (const row of historical as unknown as Array<{ product_id: string; receipts: { purchased_at: string } }>) {
    if (!row.receipts?.purchased_at) continue
    const monthKey = row.receipts.purchased_at.slice(0, 7)
    if (!monthlyCounts.has(row.product_id)) monthlyCounts.set(row.product_id, new Set())
    monthlyCounts.get(row.product_id)!.add(monthKey)
  }

  const candidates = Array.from(monthlyCounts.entries())
    .filter(([, months]) => months.size >= 2)
    .map(([productId]) => productId)

  // Current month start
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: alreadyInMonth } = await supabase
    .from('monthly_list')
    .select('product_id')
    .eq('month', currentMonth)

  const existingIds = new Set((alreadyInMonth ?? []).map(r => r.product_id))
  const toInsert = candidates
    .filter(id => !existingIds.has(id))
    .map(productId => ({
      product_id: productId,
      month: currentMonth,
      quantity: 1,
      suggested: true,
      accepted: false
    }))

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('monthly_list').insert(toInsert)
    if (insertErr) throw insertErr
  }

  return toInsert.length
}
