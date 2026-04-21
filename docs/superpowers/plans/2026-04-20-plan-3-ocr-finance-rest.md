# Casa & Família — Plan 3: OCR + Finanças + Pets + Izete + Config

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Fechar as features restantes — OCR de nota fiscal alimentando histórico/financeiro/preços automaticamente, página agregada de finanças, CRUDs de Pets e Izete, e Config.

**Architecture:** Adiciona Netlify Function pro OCR (chave Anthropic server-side), completa rotas stub com CRUDs simples via Supabase realtime, adiciona bottom sheet pro menu "Mais".

**Pré-requisitos:** Plan 1 + Plan 2 em produção. Nova chave Anthropic configurada em `ANTHROPIC_API_KEY` no Netlify.

**Branch:** `feat/plan-3-ocr-finance`.

**Spec ref:** Design doc §6.3 (OCR), §6.5 (Financeiro), §6.x para Pets/Izete/Config.

---

## Task 3.1: Netlify Function `ocr-receipt`

**Files:** `netlify/functions/ocr-receipt.ts`, `netlify/functions/package.json`

Cria a função serverless. Recebe `{ receipt_id, photo_url }`. Baixa imagem via URL assinada do Supabase Storage, manda pro Claude Vision com prompt estruturado, parseia JSON, escreve nas tabelas `receipt_items`, `product_prices`, `finance_entries`, `monthly_list` (sugeridos). Atualiza `receipts.status` para `done` ou `failed`.

```ts
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
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
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
```

**netlify/functions/package.json:**

```json
{
  "name": "ocr-functions",
  "type": "module",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.65.0",
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

**Supabase Edge Function needs env vars on Netlify:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. Controller configura via `netlify env:set`.

Commit: `feat(plan3): add ocr-receipt Netlify function with Claude Vision`

---

## Task 3.2: Camera capture + upload flow

**Files:** `src/hooks/useReceiptUpload.ts`, `src/routes/notas.fotografar.tsx`

Hook que:
1. Recebe File (do input camera)
2. Sobe pro bucket `receipts` (path `YYYY-MM/<uuid>.jpg`)
3. Cria row em `receipts` com `status='processing'`, photo_url
4. Chama `/api/ocr-receipt`
5. Retorna status via subscription

```ts
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
```

`uuid` precisa estar instalado: `npm install uuid @types/uuid`.

**netlify.toml redirect:**

```toml
[[redirects]]
  from = "/api/ocr-receipt"
  to = "/.netlify/functions/ocr-receipt"
  status = 200
```

Camera page (abre câmera nativa + preview + botão enviar) em `src/routes/notas.fotografar.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useReceiptUpload } from '@/hooks/useReceiptUpload'
import { Camera, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/notas/fotografar')({
  component: FotografarPage
})

function FotografarPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useReceiptUpload()

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const onSubmit = async () => {
    if (!file) return
    try {
      await upload.mutateAsync(file)
    } catch {
      /* noop — state handled via upload.isError */
    }
  }

  return (
    <div className="p-4 space-y-4 min-h-screen">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/notas' })} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Fotografar nota</h2>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />

      {!preview && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center gap-3 text-slate-500"
        >
          <Camera className="w-12 h-12" />
          <span className="font-bold">Toque para abrir a câmera</span>
          <span className="text-xs">ou escolher da galeria</span>
        </button>
      )}

      {preview && (
        <div className="space-y-3">
          <img src={preview} alt="Nota" className="w-full rounded-2xl" />
          {upload.isSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-emerald-900">Nota processada!</p>
                <p className="text-sm text-emerald-700">
                  {upload.data.items} {upload.data.items === 1 ? 'item' : 'itens'} · R$ {upload.data.total?.toFixed(2)}
                </p>
              </div>
            </div>
          )}
          {upload.isError && (
            <div className="rounded-xl bg-rose-50 border border-rose-300 p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <p className="text-sm text-rose-900">{(upload.error as Error).message}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setFile(null); setPreview(null); upload.reset() }}
              disabled={upload.isPending}
              className="flex-1 py-3 rounded-xl border border-slate-300 font-bold"
            >
              Refazer
            </button>
            {!upload.isSuccess && (
              <button
                onClick={onSubmit}
                disabled={upload.isPending}
                className="flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
              >
                {upload.isPending ? 'Processando…' : 'Enviar nota'}
              </button>
            )}
            {upload.isSuccess && (
              <button
                onClick={() => navigate({ to: '/notas' })}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold"
              >
                Ver histórico
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

Também atualizar Home pra linkar "Fotografar nota" → `/notas/fotografar` em vez do alert.

Commit: `feat(plan3): camera capture + upload flow for receipts`

---

## Task 3.3: Notas page (histórico)

**Files:** `src/hooks/useReceipts.ts`, `src/routes/notas.tsx`

Hook pra listar `receipts` com store relation. Page mostra lista cronológica com thumbnail, loja, total, data, status. Clique abre detalhe (modal com items).

```ts
// src/hooks/useReceipts.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ReceiptRow {
  id: string
  photo_url: string
  total: number | null
  purchased_at: string | null
  status: 'processing' | 'done' | 'failed'
  created_at: string
  store: { id: string; name: string; color: string } | null
}

export function useReceipts() {
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['receipts'],
    queryFn: async (): Promise<ReceiptRow[]> => {
      const { data, error } = await supabase
        .from('receipts')
        .select('id, photo_url, total, purchased_at, status, created_at, store:stores(id,name,color)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(r => ({
        ...r,
        store: Array.isArray(r.store) ? r.store[0] ?? null : r.store as { id: string; name: string; color: string } | null
      }))
    }
  })

  useEffect(() => {
    const channel = supabase
      .channel('receipts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => {
        qc.invalidateQueries({ queryKey: ['receipts'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return q
}
```

`src/routes/notas.tsx` (substituir stub):

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useReceipts } from '@/hooks/useReceipts'
import { Camera, Clock, CheckCircle2, XCircle } from 'lucide-react'

export const Route = createFileRoute('/notas')({
  component: NotasPage
})

function NotasPage() {
  const { data: receipts, isLoading } = useReceipts()

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '--'

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Notas</h2>
          <p className="text-xs text-slate-500">Histórico de compras</p>
        </div>
        <Link
          to="/notas/fotografar"
          className="flex items-center gap-1 py-2 px-3 rounded-xl text-white font-bold text-sm shadow-md"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        >
          <Camera className="w-4 h-4" />
          Nova
        </Link>
      </header>

      {isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {receipts && receipts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <Camera className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-600 font-medium">Nenhuma nota ainda</p>
          <p className="text-xs text-slate-400 mt-1">Fotografe sua primeira nota pra povoar preços e histórico</p>
        </div>
      )}

      {receipts && receipts.length > 0 && (
        <ul className="space-y-2">
          {receipts.map(r => (
            <li key={r.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex gap-3">
              <img
                src={r.photo_url}
                alt="Nota"
                className="w-16 h-16 object-cover rounded-lg shrink-0 bg-slate-100"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: r.store?.color ?? '#0f172a' }}>
                  {r.store?.name ?? 'Processando…'}
                </p>
                <p className="text-xs text-slate-500">{fmtDate(r.purchased_at ?? r.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold">{r.total ? `R$ ${r.total.toFixed(2)}` : '—'}</p>
                <div className="flex items-center justify-end gap-1 text-[10px] mt-1">
                  {r.status === 'processing' && <><Clock className="w-3 h-3 text-amber-500" /><span className="text-amber-600">processando</span></>}
                  {r.status === 'done' && <><CheckCircle2 className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">ok</span></>}
                  {r.status === 'failed' && <><XCircle className="w-3 h-3 text-rose-500" /><span className="text-rose-600">falha</span></>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Commit: `feat(plan3): add receipts history page with thumbnails and status`

---

## Task 3.4: Sugeridos automáticos na aba Mensal

Já está implementado no Task 3.1 (a função `enrichMonthlySuggestions`). A UI da aba Mensal já mostra sugeridos (Task 2.5). **Nada a fazer — só testar no smoke.**

---

## Task 3.5: Financeiro page (agregada)

**Files:** `src/hooks/useFinance.ts`, `src/routes/financas.tsx`

Agrega todas as `finance_entries` do mês selecionado. Mostra KPIs (receitas, despesas, saldo), breakdown por categoria, linha do tempo.

```ts
// src/hooks/useFinance.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface FinanceEntry {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string | null
  source: 'receipt' | 'izete' | 'manual'
  receipt_id: string | null
  date: string
  note: string | null
}

function monthBounds(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  return { start, end }
}

export function useFinance(monthStr: string) {
  const qc = useQueryClient()
  const { start, end } = monthBounds(monthStr)

  const q = useQuery({
    queryKey: ['finance_entries', monthStr],
    queryFn: async (): Promise<FinanceEntry[]> => {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    }
  })

  useEffect(() => {
    const ch = supabase
      .channel(`finance-${monthStr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_entries' }, () => {
        qc.invalidateQueries({ queryKey: ['finance_entries'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc, monthStr])

  return q
}

export function useAddFinanceEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: Omit<FinanceEntry, 'id'>) => {
      const { error } = await supabase.from('finance_entries').insert(entry)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance_entries'] })
  })
}
```

`src/routes/financas.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useFinance, useAddFinanceEntry } from '@/hooks/useFinance'
import { Plus, ArrowDownRight, ArrowUpRight } from 'lucide-react'

export const Route = createFileRoute('/financas')({
  component: FinancasPage
})

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function FinancasPage() {
  const [month, setMonth] = useState(currentMonthStr())
  const { data: entries } = useFinance(month)
  const add = useAddFinanceEntry()
  const [formOpen, setFormOpen] = useState(false)

  const { income, expense, balance, byCategory } = useMemo(() => {
    let income = 0, expense = 0
    const byCategory: Record<string, number> = {}
    for (const e of entries ?? []) {
      if (e.type === 'income') income += e.amount
      else {
        expense += e.amount
        const key = e.category ?? 'Outros'
        byCategory[key] = (byCategory[key] ?? 0) + e.amount
      }
    }
    return { income, expense, balance: income - expense, byCategory }
  }, [entries])

  const maxCategory = Math.max(1, ...Object.values(byCategory))
  const fmtMoney = (n: number) => `R$ ${n.toFixed(2)}`
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const sourceIcon = (s: string) => s === 'receipt' ? '🛒' : s === 'izete' ? '📅' : '➕'

  return (
    <div className="p-4 space-y-4 pb-28">
      <header>
        <h2 className="text-xl font-bold">Finanças</h2>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="mt-1 text-sm text-slate-600 bg-transparent"
        />
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 text-white" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>
          <ArrowUpRight className="w-4 h-4 opacity-70" />
          <p className="text-lg font-extrabold mt-1">{fmtMoney(income)}</p>
          <p className="text-[10px] uppercase opacity-80">Entradas</p>
        </div>
        <div className="rounded-xl p-3 text-white" style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}>
          <ArrowDownRight className="w-4 h-4 opacity-70" />
          <p className="text-lg font-extrabold mt-1">{fmtMoney(expense)}</p>
          <p className="text-[10px] uppercase opacity-80">Saídas</p>
        </div>
        <div className="rounded-xl p-3 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
          <p className="text-lg font-extrabold mt-4">{fmtMoney(balance)}</p>
          <p className="text-[10px] uppercase opacity-80">Saldo</p>
        </div>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <section>
          <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Por categoria</h3>
          <ul className="space-y-2">
            {Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, val]) => (
              <li key={cat} className="bg-white rounded-xl border border-slate-200 p-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">{cat}</span>
                  <span>{fmtMoney(val)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
                    style={{ width: `${(val / maxCategory) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Lançamentos ({entries?.length ?? 0})</h3>
        {entries && entries.length === 0 && (
          <p className="text-sm text-slate-400 italic">Nada lançado neste mês ainda.</p>
        )}
        <ul className="space-y-1">
          {entries?.map(e => (
            <li key={e.id} className="bg-white rounded-lg border border-slate-200 p-2 flex items-center gap-3">
              <span className="text-lg">{sourceIcon(e.source)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{e.note ?? e.category ?? (e.type === 'income' ? 'Entrada' : 'Gasto')}</p>
                <p className="text-[10px] text-slate-500">{fmtDate(e.date)} · {e.category ?? 'sem categoria'}</p>
              </div>
              <p className={`font-bold text-sm ${e.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {e.type === 'income' ? '+' : '-'}{fmtMoney(e.amount)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <button
        onClick={() => setFormOpen(v => !v)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        aria-label="Lançar manual"
      >
        <Plus className="w-6 h-6" />
      </button>

      {formOpen && (
        <QuickEntryForm
          onSubmit={async (e) => {
            await add.mutateAsync({ ...e, source: 'manual', receipt_id: null })
            setFormOpen(false)
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}

function QuickEntryForm({ onSubmit, onCancel }: { onSubmit: (e: { type: 'income' | 'expense'; amount: number; category: string; date: string; note: string }) => Promise<void>; onCancel: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onCancel}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={async e => {
          e.preventDefault()
          const amt = parseFloat(amount.replace(',', '.'))
          if (isNaN(amt) || amt <= 0) return
          setSubmitting(true)
          await onSubmit({ type, amount: amt, category: category || 'Outros', date, note })
          setSubmitting(false)
        }}
        className="bg-white w-full rounded-t-2xl p-5 space-y-3"
      >
        <h3 className="text-lg font-bold">Novo lançamento</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg font-bold ${type === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-100'}`}>Saída</button>
          <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg font-bold ${type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}>Entrada</button>
        </div>
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor (R$)" inputMode="decimal" className="w-full border border-slate-200 rounded-lg px-3 py-2" />
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Categoria (ex: pet, transporte)" className="w-full border border-slate-200 rounded-lg px-3 py-2" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Descrição (opcional)" className="w-full border border-slate-200 rounded-lg px-3 py-2" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg border border-slate-300">Cancelar</button>
          <button type="submit" disabled={submitting || !amount} className="flex-1 py-2 rounded-lg text-white font-bold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

Commit: `feat(plan3): aggregated finance page with manual quick-entry`

---

## Task 3.6: Pets + Izete + Config

Três CRUDs simples em `src/routes/mais.tsx` (substitui stub com menu de navegação) + 3 sub-rotas.

**`src/routes/mais.tsx`:**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { Dog, Calendar, FileText, Settings as SettingsIcon } from 'lucide-react'

export const Route = createFileRoute('/mais')({
  component: MaisPage
})

function MaisPage() {
  const items = [
    { to: '/pets', icon: Dog, label: 'Pets', desc: 'Cachorro, gato, rotina', color: '#10b981' },
    { to: '/izete', icon: Calendar, label: 'Izete', desc: 'Calendário da diarista', color: '#f59e0b' },
    { to: '/os', icon: FileText, label: 'OS', desc: 'Ordens de serviço', color: '#6366f1' },
    { to: '/config', icon: SettingsIcon, label: 'Config', desc: 'Valores fixos, WhatsApp', color: '#64748b' }
  ]
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-xl font-bold">Mais</h2>
      <ul className="space-y-2">
        {items.map(i => (
          <li key={i.to}>
            <Link
              to={i.to}
              className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4 active:scale-[0.98] transition"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${i.color}22` }}>
                <i.icon className="w-5 h-5" style={{ color: i.color }} />
              </div>
              <div className="flex-1">
                <p className="font-bold">{i.label}</p>
                <p className="text-xs text-slate-500">{i.desc}</p>
              </div>
              <span className="text-slate-300">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Pets, Izete, OS stub, Config — CRUDs simples com Supabase queries + forms. Ver código completo nos arquivos da Task 3.6.

Commit: `feat(plan3): add Mais menu + Pets, Izete, OS stub, Config pages`

---

## Task 3.7: Home — atualizar link "Fotografar nota" + KPI gasto do mês

Atualizar `src/routes/index.tsx` pra linkar "Fotografar nota fiscal" → `/notas/fotografar` (em vez de alert) e popular o KPI "Gasto do mês" com soma dos gastos do mês atual.

Commit: `feat(plan3): wire home camera CTA and populate monthly expense KPI`

---

## Task 3.8: Deploy

1. Configurar env vars no Netlify: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.
2. Build + deploy.
3. Smoke test: fotografar nota → aguardar processamento → ver histórico povoado + finanças atualizadas.

---

## Definition of Done

- Netlify function `ocr-receipt` deployada e respondendo 200 em upload.
- Fotografar nota → OCR extrai itens → popula receipts, receipt_items, product_prices, finance_entries, monthly_list.
- Página Notas mostra histórico com thumbnails.
- Página Finanças mostra KPIs + breakdown + lançamento manual.
- Página Mais lista Pets/Izete/OS/Config.
- Home KPI "Gasto do mês" live.
- Testes existentes continuam passando.
- Deploy live.
