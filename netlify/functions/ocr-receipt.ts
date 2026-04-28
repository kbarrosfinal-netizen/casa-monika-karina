// netlify/functions/ocr-receipt.ts
import type { Context } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT = `Você lê notas fiscais brasileiras e extrai dados em JSON estrito.

Formato de resposta:
{
  "store": "nome da loja (ex: Supermercados DB, Mercantil Nova Era)",
  "date": "YYYY-MM-DD",
  "total": número (valor total pago),
  "items": [
    { "name": "nome canônico curto", "quantity": número, "unit_price": número, "total_price": número }
  ]
}

REGRAS DE NORMALIZAÇÃO DE NOMES (críticas — evite duplicatas no banco):
- Use apenas o nome genérico do produto, em singular, capitalizado.
  ✓ "Leite"  ✗ "Leite Parmalat 1L"  ✗ "LEITE INTEGRAL UHT"  ✗ "Leite integral"
  ✓ "Pão"    ✗ "Pão Francês 50g"    ✗ "PÃES"
  ✓ "Arroz"  ✗ "Arroz Tio João 5kg" ✗ "Arroz integral"
- NUNCA repita marcas (Parmalat, Tio João, Nestlé, Bauducco, Sadia, etc).
- NUNCA inclua tamanhos ou unidades de embalagem (1L, 500g, 5kg, 12un).
- NUNCA inclua adjetivos de variedade que duplicariam itens (integral, desnatado, branco, light) a menos que sejam categorias completamente diferentes (ex: "Carne moída" vs "Carne em peça" → use "Carne").
- Plurais → singular ("Bananas" → "Banana", "Maçãs" → "Maçã").
- Capitalize apenas a primeira letra ("Leite", "Açúcar", "Café").

Se um campo não aparece, use null. NUNCA invente dados.
Responda APENAS o JSON puro, sem markdown, sem comentários, sem texto antes ou depois.`

export default async (req: Request, _ctx: Context) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { receipt_id, photo_url } = await req.json() as { receipt_id: string; photo_url: string }
  if (!receipt_id || !photo_url) {
    return new Response(JSON.stringify({ error: 'receipt_id e photo_url obrigatórios' }), { status: 400 })
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? Netlify.env.get('SUPABASE_URL')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? Netlify.env.get('ANTHROPIC_API_KEY')

  const missing: string[] = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!anthropicKey) missing.push('ANTHROPIC_API_KEY')
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: `Variáveis de ambiente faltando no servidor Netlify: ${missing.join(', ')}` }),
      { status: 500 }
    )
  }

  const sb = createClient(supabaseUrl!, serviceKey!)
  const anthropic = new Anthropic({ apiKey: anthropicKey! })

  try {
    const imgRes = await fetch(photo_url)
    if (!imgRes.ok) throw new Error(`Falha ao baixar imagem do storage (HTTP ${imgRes.status})`)
    const arrayBuf = await imgRes.arrayBuffer()
    const base64 = Buffer.from(arrayBuf).toString('base64')
    const mediaType = imgRes.headers.get('content-type') || 'image/jpeg'

    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
          { type: 'text', text: 'Extraia os dados desta nota.' }
        ]
      }]
    })

    const raw = resp.content.map(c => c.type === 'text' ? c.text : '').join('').trim()
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    let parsed: { store?: string; date?: string; total?: number; items?: Array<{ name: string; quantity: number; unit_price: number; total_price: number }> }
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      throw new Error(`O modelo não retornou JSON válido. Tente novamente ou lance manualmente. (${(e as Error).message}; raw: ${raw.slice(0, 120)})`)
    }

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

    await sb.from('receipts').update({
      store_id: storeId,
      total: parsed.total ?? null,
      purchased_at: parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString(),
      ocr_raw: raw,
      ocr_json: parsed,
      status: 'done'
    }).eq('id', receipt_id)

    const { data: productsAll } = await sb.from('products').select('id,name')
    const productByExactKey = new Map<string, string>()
    const productByToken = new Map<string, { id: string; name: string }[]>()
    for (const p of productsAll ?? []) {
      const exact = normalize(p.name)
      productByExactKey.set(exact, p.id)
      const token = mainToken(p.name)
      if (token) {
        const list = productByToken.get(token) ?? []
        list.push({ id: p.id, name: p.name })
        productByToken.set(token, list)
      }
    }

    const monthStart = parsed.date
      ? new Date(parsed.date).toISOString().slice(0, 8) + '01'
      : new Date().toISOString().slice(0, 8) + '01'

    for (const item of parsed.items ?? []) {
      let productId = productByExactKey.get(normalize(item.name))

      if (!productId) {
        const token = mainToken(item.name)
        const candidates = token ? productByToken.get(token) ?? [] : []
        if (candidates.length === 1) {
          productId = candidates[0].id
        }
      }

      if (!productId) {
        const display = canonicalName(item.name)
        const { data: newProduct } = await sb.from('products').insert({
          name: display,
          icon: guessIcon(display),
          unit: 'un'
        }).select().single()
        productId = newProduct?.id
        if (productId) {
          productByExactKey.set(normalize(display), productId)
          const tk = mainToken(display)
          if (tk) {
            const list = productByToken.get(tk) ?? []
            list.push({ id: productId, name: display })
            productByToken.set(tk, list)
          }
        }
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

    await enrichMonthlySuggestions(sb, monthStart)

    try {
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

    return new Response(JSON.stringify({
      ok: true,
      items: parsed.items?.length ?? 0,
      total: parsed.total,
      cache_read: resp.usage?.cache_read_input_tokens ?? 0,
      cache_write: resp.usage?.cache_creation_input_tokens ?? 0
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  } catch (err) {
    const msg = (err as Error).message
    console.error('ocr-receipt error', err)
    await sb.from('receipts').update({ status: 'failed', ocr_raw: msg }).eq('id', receipt_id)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function mainToken(s: string): string {
  const n = normalize(s)
  const skip = new Set(['de', 'do', 'da', 'em', 'com', 'sem', 'pra', 'para', 'kg', 'g', 'ml', 'l', 'un', 'cx', 'pct'])
  const tokens = n.split(/[\s\-/]+/).filter(t => t.length >= 3 && !skip.has(t) && !/^\d+$/.test(t))
  return tokens[0] ?? ''
}

function canonicalName(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ')
  const noBrand = cleaned.replace(/\b\d+(?:[,.]\d+)?\s?(?:kg|g|ml|l|un|cx|pct)\b/gi, '').trim()
  const first = noBrand.split(/\s+/)[0] ?? cleaned
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
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
  if (n.includes('banana')) return '🍌'
  if (n.includes('maca') || n.includes('maçã')) return '🍎'
  if (n.includes('tomate')) return '🍅'
  if (n.includes('cebola')) return '🧅'
  if (n.includes('batata')) return '🥔'
  return '🛒'
}

async function enrichMonthlySuggestions(sb: any, currentMonth: string) {
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

  const existingIds = new Set((alreadyInMonth ?? []).map((r: { product_id: string }) => r.product_id))
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
