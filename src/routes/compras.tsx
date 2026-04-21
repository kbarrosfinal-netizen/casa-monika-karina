import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useProducts, useCategories } from '@/hooks/useProducts'
import { useShoppingList, useToggleMissing } from '@/hooks/useShoppingList'
import { useMonthlyList, useAcceptMonthlyItem, useRemoveMonthlyItem } from '@/hooks/useMonthlyList'
import { CategoryGrid } from '@/components/shopping/CategoryGrid'
import { NewProductModal } from '@/components/shopping/NewProductModal'
import { cn } from '@/lib/cn'
import type { Product, Category, MonthlyListItem, ShoppingListItem } from '@/lib/types'
import { ShoppingBag, Plus, Send } from 'lucide-react'

export const Route = createFileRoute('/compras')({
  component: ComprasPage
})

function MonthlyListView({
  monthly,
  products,
  onAccept,
  onRemove
}: {
  monthly: MonthlyListItem[]
  products: Product[]
  onAccept: (id: string) => void
  onRemove: (id: string) => void
}) {
  const byId = new Map(products.map(p => [p.id, p]))
  const suggested = monthly.filter(m => m.suggested && !m.accepted)
  const confirmed = monthly.filter(m => m.accepted)

  return (
    <div className="space-y-5">
      {suggested.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-slate-700 mb-2">📅 Sugeridos pelo histórico ({suggested.length})</h3>
          <ul className="space-y-1">
            {suggested.map(item => {
              const p = byId.get(item.product_id)
              if (!p) return null
              return (
                <li key={item.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <span className="text-xl">{p.icon}</span>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <button onClick={() => onAccept(item.id)} className="text-xs px-2 py-1 rounded bg-emerald-500 text-white">Aceitar</button>
                  <button onClick={() => onRemove(item.id)} className="text-xs px-2 py-1 rounded bg-slate-200">Descartar</button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-sm font-bold text-slate-700 mb-2">✅ No mês ({confirmed.length})</h3>
        {confirmed.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum produto no mês ainda. Marque itens em "Faltando" ou adicione novos.</p>
        ) : (
          <ul className="space-y-1">
            {confirmed.map(item => {
              const p = byId.get(item.product_id)
              if (!p) return null
              return (
                <li key={item.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                  <span className="text-xl">{p.icon}</span>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-xs text-slate-400">{item.quantity} {p.unit}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function ComprasPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState<'falta' | 'mes'>('falta')
  const products = useProducts()
  const categories = useCategories()
  const shoppingList = useShoppingList()
  const toggle = useToggleMissing()
  const monthly = useMonthlyList()
  const accept = useAcceptMonthlyItem()
  const remove = useRemoveMonthlyItem()

  const missingCount = shoppingList.data?.filter(i => i.is_missing).length ?? 0
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const shareWhatsApp = () => {
    const list = tab === 'falta'
      ? buildMissingMessage(products.data ?? [], categories.data ?? [], shoppingList.data ?? [])
      : buildMonthlyMessage(products.data ?? [], categories.data ?? [], monthly.data ?? [], month)
    if (!list) return
    window.open(`https://wa.me/?text=${encodeURIComponent(list)}`, '_blank')
  }

  if (products.isLoading || categories.isLoading || shoppingList.isLoading || monthly.isLoading) {
    return <div className="p-4 text-center text-slate-500">Carregando…</div>
  }

  if (products.error || categories.error || shoppingList.error || monthly.error) {
    return (
      <div className="p-4 text-center text-rose-600">
        Erro ao carregar dados. Verifique conexão.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Compras</h2>
          <p className="text-xs text-slate-500">
            Toque no produto que acabou em casa
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-rose-600">{missingCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">faltando</p>
        </div>
      </div>

      <div className="flex bg-slate-100 rounded-lg p-1">
        <button
          onClick={() => setTab('falta')}
          className={cn('flex-1 py-2 rounded-md text-sm font-semibold transition',
            tab === 'falta' ? 'bg-white shadow-sm' : 'text-slate-500')}
        >
          Faltando ({missingCount})
        </button>
        <button
          onClick={() => setTab('mes')}
          className={cn('flex-1 py-2 rounded-md text-sm font-semibold transition',
            tab === 'mes' ? 'bg-white shadow-sm' : 'text-slate-500')}
        >
          {month}
        </button>
      </div>

      {tab === 'falta' && (
        <>
          {missingCount > 0 && (
            <div className="space-y-2">
              <button
                onClick={shareWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-md active:scale-[0.98] transition"
                style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
              >
                <Send className="w-5 h-5" />
                Enviar lista pelo WhatsApp
              </button>
              <Link
                to="/compras/mercado"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-md"
                style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
              >
                <ShoppingBag className="w-5 h-5" />
                Ver lista por loja (cheapest)
              </Link>
            </div>
          )}

          <CategoryGrid
            categories={categories.data ?? []}
            products={products.data ?? []}
            shoppingList={shoppingList.data ?? []}
            onToggle={(productId, next) => toggle.mutate({ productId, isMissing: next })}
          />
        </>
      )}

      {tab === 'mes' && (
        <>
          {(monthly.data?.length ?? 0) > 0 && (
            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-md active:scale-[0.98] transition"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
            >
              <Send className="w-5 h-5" />
              Enviar lista do mês pelo WhatsApp
            </button>
          )}
          <MonthlyListView
            monthly={monthly.data ?? []}
            products={products.data ?? []}
            onAccept={(id) => accept.mutate(id)}
            onRemove={(id) => remove.mutate(id)}
          />
        </>
      )}

      <button
        type="button"
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        aria-label="Novo produto"
        onClick={() => setModalOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </button>

      <NewProductModal open={modalOpen} onClose={() => setModalOpen(false)} categories={categories.data ?? []} />
    </div>
  )
}

function buildMissingMessage(products: Product[], categories: Category[], shoppingList: ShoppingListItem[]): string {
  const missingIds = new Set(shoppingList.filter(i => i.is_missing).map(i => i.product_id))
  if (missingIds.size === 0) return ''
  const catById = new Map(categories.map(c => [c.id, c]))
  const grouped = new Map<string, { cat: Category | null; items: Product[] }>()
  for (const p of products) {
    if (!missingIds.has(p.id)) continue
    const key = p.category_id ?? '__none__'
    const entry = grouped.get(key)
    if (entry) entry.items.push(p)
    else grouped.set(key, { cat: p.category_id ? catById.get(p.category_id) ?? null : null, items: [p] })
  }
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const lines: string[] = [`*Lista de compras — ${date}*`, '']
  for (const { cat, items } of grouped.values()) {
    lines.push(`${cat?.icon ?? '📦'} *${cat?.name ?? 'Outros'}*`)
    for (const p of items) lines.push(`☐ ${p.icon} ${p.name}`)
    lines.push('')
  }
  lines.push(`_Total: ${missingIds.size} ${missingIds.size === 1 ? 'item' : 'itens'}_`)
  return lines.join('\n')
}

function buildMonthlyMessage(products: Product[], categories: Category[], monthly: MonthlyListItem[], monthLabel: string): string {
  if (monthly.length === 0) return ''
  const pById = new Map(products.map(p => [p.id, p]))
  const catById = new Map(categories.map(c => [c.id, c]))
  const grouped = new Map<string, { cat: Category | null; items: Product[] }>()
  for (const m of monthly) {
    const p = pById.get(m.product_id)
    if (!p) continue
    const key = p.category_id ?? '__none__'
    const entry = grouped.get(key)
    if (entry) entry.items.push(p)
    else grouped.set(key, { cat: p.category_id ? catById.get(p.category_id) ?? null : null, items: [p] })
  }
  const lines: string[] = [`*Lista mensal — ${monthLabel}*`, '']
  for (const { cat, items } of grouped.values()) {
    lines.push(`${cat?.icon ?? '📦'} *${cat?.name ?? 'Outros'}*`)
    for (const p of items) lines.push(`• ${p.icon} ${p.name}`)
    lines.push('')
  }
  lines.push(`_Total: ${monthly.length} ${monthly.length === 1 ? 'item' : 'itens'}_`)
  return lines.join('\n')
}
