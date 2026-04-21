// netlify/functions/ocr-receipt.ts
import type { Context } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const PROMPT = `Analise esta nota fiscal de supermercado brasileira. Extraia em JSON estrito:

{
  "store": "nome da loja (ex: Supermercados DB, Mercantil Nova Era)",
  "date": "YYYY-MM-DD",
  "total": número (valor total pago),
  "items": [
    { "name": "nome do produto normalizado (ex: 'Leite Parmalat 1L' -> 'Leite')", "quantity": número, "unit_price": número, "total_price": número }
  ]
}

Regras:
- Normaliza nomes (remove marcas/tamanhos quando possível, mantém categoria: "Leite" não "Leite Parmalat 1L").
- Se um campo não aparece, usa null (não invente).
- Responda APENAS o JSON puro, sem markdown, sem comentários.`

export default async (req: Request, _ctx: Context) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { receipt_id, photo_url } = await req.json() as { receipt_id: string; photo_url: string }
  if (!receipt_id || !photo_url) {
    return new Response(JSON.stringify({ error: 'receipt_id e photo_url obrigatórios' }), { status: 400 })
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? Netlify.env.get('SUPABASE_URL')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? Netlify.env.get('ANTHROPIC_API_KEY')

  if (!supabaseUrl || !serviceKey || !anthropicKey) {
    return new Response(JSON.stringify({ error: 'env vars ausentes no servidor' }), { status: 500 })
  }

  const sb = createClient(supabaseUrl, serviceKey)
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  try {
    // Download image from Supabase Storage
    const imgRes = await fetch(photo_url)
    if (!imgRes.ok) throw new Error(`Falha ao baixar imagem: ${imgRes.status}`)
    const arrayBuf = await imgRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuf).toString('base64')
    const mediaType = imgRes.headers.get('content-type') || 'image/jpeg'

    // Call Claude Vision
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
          { type: 'text', text: PROMPT }
        ]
      }]
    })

    const raw = resp.content.map(c => c.type === 'text' ? c.text : '').join('').trim()
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    let parsed: { store?: string; date?: string; total?: number; items?: Array<{ name: string; quantity: number; unit_price: number; total_price: number }> }
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      throw new Error(`JSON parse failed: ${(e as Error).message}. Raw: ${raw.slice(0, 200)}`)
    }

    // Match/create store
    let storeId: string | null = null
    if (parsed.store) {
      const { data: existingStores } = await sb.from('stores').select('id,name').ilike('name', `%${parsed.store}%`).limit(1)
      if (existingStores?.[0]) {
        storeId = existingStores[0].id
      } else {
        const { data: newStore } = await sb.from('stores').insert({ name: parsed.store, color: '#64748b', order: 99 }).select().single()
        storeId = newStore?.id ?? null
      }
    }

    // Update receipt
    await sb.from('receipts').update({
      store_id: storeId,
      total: parsed.total ?? null,
      purchased_at: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
      ocr_raw: raw,
      ocr_json: parsed,
      status: 'done'
    }).eq('id', receipt_id)

    // Upsert products and create receipt_items + product_prices
    const { data: productsAll } = await sb.from('products').select('id,name')
    const productByName = new Map<string, string>()
    productsAll?.forEach(p => productByName.set(normalize(p.name), p.id))

    const monthStart = parsed.date
      ? new Date(parsed.date).toISOString().slice(0, 8) + '01'
      : new Date().toISOString().slice(0, 8) + '01'

    for (const item of parsed.items ?? []) {
      let productId = productByName.get(normalize(item.name))
      if (!productId) {
        const { data: newProduct } = await sb.from('products').insert({
          name: item.name,
          icon: guessIcon(item.name),
          unit: 'un'
        }).select().single()
        productId = newProduct?.id
        if (productId) productByName.set(normalize(item.name), productId)
      }

      if (productId) {
        await sb.from('receipt_items').insert({
          receipt_id,
          product_id: productId,
          product_name_raw: item.name,
          quantity: item.quantity ?? 1,
          unit_price: item.unit_price ?? null,
          total_price: item.total_price ?? null
        })

        if (storeId && item.unit_price) {
          await sb.from('product_prices').insert({
            product_id: productId,
            store_id: storeId,
            price: item.unit_price,
            date: parsed.date ?? new Date().toISOString().slice(0, 10),
            source: 'receipt'
          })
        }

        // Ensure it's in monthly_list (not as suggested)
        const { data: existingMonth } = await sb
          .from('monthly_list')
          .select('id')
          .eq('product_id', productId)
          .eq('month', monthStart)
          .maybeSingle()

        if (!existingMonth) {
          await sb.from('monthly_list').insert({
            product_id: productId,
            month: monthStart,
            quantity: item.quantity ?? 1,
            suggested: false,
            accepted: true
          })
        }
      }
    }

    // Create finance entry for the total
    if (parsed.total) {
      await sb.from('finance_entries').insert({
        type: 'expense',
        amount: parsed.total,
        category: 'supermercado',
        source: 'receipt',
        receipt_id,
        date: parsed.date ?? new Date().toISOString().slice(0, 10),
        note: parsed.store ?? null
      })
    }

    // Trigger suggestions enrichment (simple: based on 3-month frequency)
    await enrichMonthlySuggestions(sb, monthStart)

    // Delete photo from Supabase Storage after successful processing
    try {
      // photo_url format: https://<ref>.supabase.co/storage/v1/object/public/receipts/<path>
      const storageMarker = '/storage/v1/object/public/receipts/'
      const markerIdx = photo_url.indexOf(storageMarker)
      if (markerIdx !== -1) {
        const storagePath = photo_url.slice(markerIdx + storageMarker.length)
        await sb.storage.from('receipts').remove([storagePath])
        await sb.from('receipts').update({ photo_url: '' }).eq('id', receipt_id)
      }
    } catch (delErr) {
      console.warn('ocr-receipt: failed to delete photo (non-fatal)', delErr)
    }

    return new Response(JSON.stringify({ ok: true, items: parsed.items?.length ?? 0, total: parsed.total }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  } catch (err) {
    console.error('ocr-receipt error', err)
    await sb.from('receipts').update({ status: 'failed', ocr_raw: String((err as Error).message) }).eq('id', receipt_id)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function guessIcon(name: string): string {
  const n = normalize(name)
  if (n.includes('leite')) return '🥛'
  if (n.includes('pao') || n.includes('pão')) return '🍞'
  if (n.includes('arroz')) return '🍚'
  if (n.includes('feijao') || n.includes('feijão')) return '🫘'
  if (n.includes('frango') || n.includes('ave')) return '🍗'
  if (n.includes('carne') || n.includes('bovina')) return '🥩'
  if (n.includes('peixe')) return '🐟'
  if (n.includes('ovo')) return '🥚'
  if (n.includes('queijo')) return '🧀'
  if (n.includes('detergente')) return '🧴'
  if (n.includes('sabao') || n.includes('sabão')) return '🧺'
  if (n.includes('papel hig')) return '🧻'
  if (n.includes('cafe') || n.includes('café')) return '☕'
  if (n.includes('acucar') || n.includes('açúcar')) return '🍬'
  if (n.includes('oleo') || n.includes('óleo')) return '🛢️'
  return '🛒'
}

async function enrichMonthlySuggestions(sb: ReturnType<typeof createClient>, currentMonth: string) {
  const { data: historical } = await sb
    .from('receipt_items')
    .select('product_id, receipts!inner(purchased_at)')
    .not('product_id', 'is', null)
    .gte('receipts.purchased_at', new Date(Date.now() - 90 * 86400_000).toISOString())

  if (!historical) return

  const monthlyCounts = new Map<string, Set<string>>()
  for (const row of historical as Array<{ product_id: string; receipts: { purchased_at: string } }>) {
    if (!row.receipts?.purchased_at) continue
    const monthKey = row.receipts.purchased_at.slice(0, 7)
    if (!monthlyCounts.has(row.product_id)) monthlyCounts.set(row.product_id, new Set())
    monthlyCounts.get(row.product_id)!.add(monthKey)
  }

  const candidates = Array.from(monthlyCounts.entries())
    .filter(([, months]) => months.size >= 2)
    .map(([productId]) => productId)

  const { data: alreadyInMonth } = await sb
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
    await sb.from('monthly_list').insert(toInsert)
  }
}
