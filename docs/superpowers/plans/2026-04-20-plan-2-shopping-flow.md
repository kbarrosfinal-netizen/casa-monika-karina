# Casa & Família — Plan 2: Fluxo de Compras

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Entregar o fluxo principal que a Monika usa todo dia — marcar produtos que acabam em casa, gerar a lista do mercado agrupada por loja (cheapest-first), mandar no WhatsApp, e ver a lista mensal acumulada.

**Architecture:** Adiciona UI sobre a infra do Plan 1. Dados do Supabase via TanStack Query + realtime subscriptions. State otimista em mutations. Sem OCR ainda (vem no Plan 3) — preços manualmente ou seed.

**Tech Stack:** Já estabelecido no Plan 1.

**Spec reference:** [docs/superpowers/specs/2026-04-20-casa-monika-karina-dashboard-design.md](../specs/2026-04-20-casa-monika-karina-dashboard-design.md), §6.1, §6.1b, §6.2.

**Pré-requisitos:** Plan 1 deployado. Supabase cloud com 3 migrations aplicadas. Catálogo base (3 lojas + 10 categorias + 45 produtos) já semeado.

**Branch:** `feat/plan-2-shopping`. PR pra `main` ao final.

---

## File structure adicionada

```text
src/
├── lib/
│   ├── whatsapp.ts              # formatar mensagem da lista
│   ├── cheapest.ts              # calcular loja mais barata por produto
│   └── types.ts                 # tipos do domínio (Product, Store, etc)
├── hooks/
│   ├── useProducts.ts           # catálogo (products + categories + stores)
│   ├── useShoppingList.ts       # estado de "faltando"
│   ├── useMonthlyList.ts        # lista do mês
│   └── useProductPrices.ts      # preços históricos por loja
├── components/
│   ├── shopping/
│   │   ├── CategoryGrid.tsx     # grid de ícones por categoria
│   │   ├── ProductIcon.tsx      # ícone clicável com estado "faltando"
│   │   ├── NewProductModal.tsx  # modal de adicionar produto novo
│   │   ├── StoreSection.tsx     # seção expansível de uma loja
│   │   └── ShoppingListSummary.tsx  # KPI "N itens faltando"
│   └── ui/
│       ├── Sheet.tsx            # bottom sheet
│       ├── Button.tsx           # botão shadcn-like
│       └── Input.tsx
└── routes/
    ├── compras.tsx              # substitui stub — tabs internas: Faltando / Mensal
    └── compras.mercado.tsx      # tela "modo mercado" (cheapest + WhatsApp)

tests/
├── lib/
│   ├── whatsapp.test.ts
│   └── cheapest.test.ts
└── components/
    ├── CategoryGrid.test.tsx
    └── NewProductModal.test.tsx
```

---

## Task 2.1: Tipos do domínio + hooks de catálogo

**Files:**
- Create: `src/lib/types.ts`, `src/hooks/useProducts.ts`

- [ ] **Step 1: Criar `src/lib/types.ts` com tipos derivados do schema Supabase**

```ts
export interface Store {
  id: string
  name: string
  color: string
  order: number
}

export interface Category {
  id: string
  name: string
  icon: string
  order: number
}

export interface Product {
  id: string
  name: string
  icon: string
  category_id: string | null
  unit: string
}

export interface ShoppingListItem {
  id: string
  product_id: string
  is_missing: boolean
  quantity: number
  added_at: string
  added_by: string | null
}

export interface MonthlyListItem {
  id: string
  product_id: string
  month: string
  quantity: number
  added_at: string
  suggested: boolean
  accepted: boolean
}

export interface ProductPrice {
  id: string
  product_id: string
  store_id: string
  price: number
  date: string
  source: 'receipt' | 'manual'
}

export interface ProductWithState extends Product {
  category?: Category | null
  is_missing: boolean
  quantity: number
}
```

- [ ] **Step 2: Criar `src/hooks/useProducts.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Product, Category, Store } from '@/lib/types'

export function useProducts() {
  const query = useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select('*').order('name')
      if (error) throw error
      return data ?? []
    }
  })
  return query
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories').select('*').order('order')
      if (error) throw error
      return data ?? []
    }
  })
}

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async (): Promise<Store[]> => {
      const { data, error } = await supabase.from('stores').select('*').order('order')
      if (error) throw error
      return data ?? []
    }
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/hooks/useProducts.ts
git -c user.email=kbarros.final@gmail.com -c user.name="kbarr" \
  commit -m "feat(plan2): add domain types and catalog hooks"
```

---

## Task 2.2: Hook de shopping list (faltando) com realtime

**Files:**
- Create: `src/hooks/useShoppingList.ts`

- [ ] **Step 1: Implementar useShoppingList com realtime subscription**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ShoppingListItem } from '@/lib/types'

export function useShoppingList() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['shopping_list'],
    queryFn: async (): Promise<ShoppingListItem[]> => {
      const { data, error } = await supabase.from('shopping_list').select('*')
      if (error) throw error
      return data ?? []
    }
  })

  useEffect(() => {
    const channel = supabase
      .channel('shopping_list-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, () => {
        qc.invalidateQueries({ queryKey: ['shopping_list'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return query
}

export function useToggleMissing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ productId, isMissing }: { productId: string; isMissing: boolean }) => {
      const { data: existing } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('shopping_list')
          .update({ is_missing: isMissing })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('shopping_list')
          .insert({ product_id: productId, is_missing: isMissing })
        if (error) throw error
      }
    },
    onMutate: async ({ productId, isMissing }) => {
      await qc.cancelQueries({ queryKey: ['shopping_list'] })
      const prev = qc.getQueryData<ShoppingListItem[]>(['shopping_list'])
      qc.setQueryData<ShoppingListItem[]>(['shopping_list'], (old = []) => {
        const found = old.find(i => i.product_id === productId)
        if (found) {
          return old.map(i => i.product_id === productId ? { ...i, is_missing: isMissing } : i)
        }
        return [...old, {
          id: `optimistic-${productId}`,
          product_id: productId,
          is_missing: isMissing,
          quantity: 1,
          added_at: new Date().toISOString(),
          added_by: null
        }]
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['shopping_list'], ctx.prev)
    }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useShoppingList.ts
git -c user.email=kbarros.final@gmail.com -c user.name="kbarr" \
  commit -m "feat(plan2): add useShoppingList with realtime sub and optimistic toggle"
```

---

## Task 2.3: Página de Compras com grid por categoria

**Files:**
- Create: `src/components/shopping/ProductIcon.tsx`, `src/components/shopping/CategoryGrid.tsx`
- Modify: `src/routes/compras.tsx` (substitui stub ComingSoon)

- [ ] **Step 1: ProductIcon.tsx**

```tsx
import { cn } from '@/lib/cn'
import type { Product } from '@/lib/types'

interface Props {
  product: Product
  isMissing: boolean
  onToggle: () => void
}

export function ProductIcon({ product, isMissing, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isMissing}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-xl border-2 bg-white transition-all min-w-[80px]',
        isMissing ? 'border-rose-500 bg-rose-50' : 'border-slate-200 active:scale-95'
      )}
    >
      <span className="text-2xl leading-none">{product.icon}</span>
      <span className={cn('text-[11px] text-center leading-tight line-clamp-2', isMissing && 'font-bold text-rose-700')}>
        {product.name}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: CategoryGrid.tsx**

```tsx
import { useMemo } from 'react'
import type { Category, Product, ShoppingListItem } from '@/lib/types'
import { ProductIcon } from './ProductIcon'

interface Props {
  categories: Category[]
  products: Product[]
  shoppingList: ShoppingListItem[]
  onToggle: (productId: string, next: boolean) => void
}

export function CategoryGrid({ categories, products, shoppingList, onToggle }: Props) {
  const missingIds = useMemo(
    () => new Set(shoppingList.filter(i => i.is_missing).map(i => i.product_id)),
    [shoppingList]
  )

  const grouped = useMemo(() => {
    return categories.map(cat => ({
      category: cat,
      products: products.filter(p => p.category_id === cat.id)
    })).filter(g => g.products.length > 0)
  }, [categories, products])

  return (
    <div className="space-y-5">
      {grouped.map(({ category, products: list }) => (
        <section key={category.id}>
          <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <span className="text-lg">{category.icon}</span>
            {category.name}
            <span className="text-xs font-normal text-slate-400 ml-auto">{list.length}</span>
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {list.map(product => (
              <ProductIcon
                key={product.id}
                product={product}
                isMissing={missingIds.has(product.id)}
                onToggle={() => onToggle(product.id, !missingIds.has(product.id))}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: src/routes/compras.tsx (substituir stub)**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useProducts, useCategories } from '@/hooks/useProducts'
import { useShoppingList, useToggleMissing } from '@/hooks/useShoppingList'
import { CategoryGrid } from '@/components/shopping/CategoryGrid'
import { ShoppingBag, Plus } from 'lucide-react'

export const Route = createFileRoute('/compras')({
  component: ComprasPage
})

function ComprasPage() {
  const products = useProducts()
  const categories = useCategories()
  const shoppingList = useShoppingList()
  const toggle = useToggleMissing()

  const missingCount = shoppingList.data?.filter(i => i.is_missing).length ?? 0

  if (products.isLoading || categories.isLoading || shoppingList.isLoading) {
    return <div className="p-4 text-center text-slate-500">Carregando…</div>
  }

  if (products.error || categories.error || shoppingList.error) {
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

      {missingCount > 0 && (
        <Link
          to="/compras/mercado"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-md"
          style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
        >
          <ShoppingBag className="w-5 h-5" />
          Ver lista do mercado
        </Link>
      )}

      <CategoryGrid
        categories={categories.data ?? []}
        products={products.data ?? []}
        shoppingList={shoppingList.data ?? []}
        onToggle={(productId, next) => toggle.mutate({ productId, isMissing: next })}
      />

      <button
        type="button"
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        aria-label="Novo produto"
        onClick={() => alert('Em breve (Task 2.4)')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Build + smoke test local**

```bash
npm run build
```

Expected: build verde.

- [ ] **Step 5: Commit**

```bash
git add src/components/shopping src/routes/compras.tsx
git -c user.email=kbarros.final@gmail.com -c user.name="kbarr" \
  commit -m "feat(plan2): shopping page with category grid and mark-missing toggle"
```

---

## Task 2.4: Modal de novo produto

**Files:**
- Create: `src/components/shopping/NewProductModal.tsx`
- Modify: `src/routes/compras.tsx` (wire ao FAB "+")

- [ ] **Step 1: Modal como dialog nativo (leve, sem dep extra)**

```tsx
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/types'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
}

const ICON_SUGGESTIONS = ['📦', '🍪', '🧃', '🥫', '🍕', '🧀', '🍊', '🍇', '🌶️', '🧅', '🥒', '🫘', '🍚', '🍝', '🧂', '🍯', '☕', '🧴', '🧽', '🧻', '🪥', '🧼', '💊', '🐾']

export function NewProductModal({ open, onClose, categories }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [unit, setUnit] = useState('un')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Nome obrigatório')

      const { data: product, error } = await supabase
        .from('products')
        .insert({ name: trimmed, icon, category_id: categoryId, unit })
        .select()
        .single()
      if (error) throw error

      const month = new Date().toISOString().slice(0, 7) + '-01'
      await supabase.from('monthly_list').insert({
        product_id: product.id,
        month,
        quantity: 1,
        suggested: false,
        accepted: true
      })

      await supabase.from('shopping_list').insert({
        product_id: product.id,
        is_missing: true,
        quantity: 1
      })
      return product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['shopping_list'] })
      qc.invalidateQueries({ queryKey: ['monthly_list'] })
      setName('')
      setIcon('📦')
      onClose()
    }
  })

  useEffect(() => {
    if (open) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [open])

  useEffect(() => {
    if (categoryId === '' && categories[0]) setCategoryId(categories[0].id)
  }, [categories, categoryId])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-2xl p-0 w-[min(92vw,420px)] backdrop:bg-black/40"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
        className="p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Novo produto</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Nome</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="ex: Leite condensado"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Categoria</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </label>

        <div>
          <span className="text-xs font-semibold text-slate-600">Ícone</span>
          <div className="mt-1 grid grid-cols-8 gap-1">
            {ICON_SUGGESTIONS.map(em => (
              <button
                type="button"
                key={em}
                onClick={() => setIcon(em)}
                className={`text-xl p-1.5 rounded ${icon === em ? 'bg-violet-100 ring-2 ring-violet-500' : 'bg-slate-50'}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Unidade</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="un, kg, L, dz"
          />
        </label>

        {create.isError && (
          <p className="text-sm text-rose-600">{(create.error as Error).message}</p>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim() || create.isPending}
            className="flex-1 py-2 rounded-lg text-white font-bold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
          >
            {create.isPending ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
```

- [ ] **Step 2: Wire no compras.tsx — substitui o alert no FAB por abrir modal**

Em `src/routes/compras.tsx`, adicionar `import { NewProductModal } from '@/components/shopping/NewProductModal'`, `const [modalOpen, setModalOpen] = useState(false)`, trocar `onClick={() => alert(...)}` por `onClick={() => setModalOpen(true)}`, e renderizar `<NewProductModal open={modalOpen} onClose={() => setModalOpen(false)} categories={categories.data ?? []} />` ao final do JSX.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/shopping/NewProductModal.tsx src/routes/compras.tsx
git -c user.email=kbarros.final@gmail.com -c user.name="kbarr" \
  commit -m "feat(plan2): add new-product modal wired to FAB"
```

---

## Task 2.5: Hook de Monthly List + UI básica

**Files:**
- Create: `src/hooks/useMonthlyList.ts`
- Modify: `src/routes/compras.tsx` (adicionar aba "Mensal")

- [ ] **Step 1: Hook com realtime**

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { MonthlyListItem } from '@/lib/types'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function useMonthlyList(month: string = currentMonth()) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['monthly_list', month],
    queryFn: async (): Promise<MonthlyListItem[]> => {
      const { data, error } = await supabase
        .from('monthly_list')
        .select('*')
        .eq('month', month)
      if (error) throw error
      return data ?? []
    }
  })

  useEffect(() => {
    const channel = supabase
      .channel(`monthly_list-${month}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_list' }, () => {
        qc.invalidateQueries({ queryKey: ['monthly_list'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc, month])

  return query
}
```

- [ ] **Step 2: Adicionar aba "Mensal" na página Compras**

Refatorar `compras.tsx` pra ter 2 tabs internas: "Faltando" (o grid atual) e "Mensal" (lista do mês atual + seção "Sugeridos" que fica vazia até Plan 3 popular via OCR).

```tsx
// Adicionar ao topo do componente:
const [tab, setTab] = useState<'falta' | 'mes'>('falta')
const monthly = useMonthlyList()
const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

// Acima do CategoryGrid, mostrar tabs:
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

// Condicional: se tab === 'falta', mostrar CategoryGrid. Se tab === 'mes', mostrar lista mensal.
```

Implementar `MonthlyListView` inline ou em arquivo separado — mostra produtos do mês agrupados em duas seções: "📅 Sugeridos" (suggested=true, accepted=false) e "✅ Confirmados" (accepted=true), com toque pra aceitar/remover.

Código de `MonthlyListView`:

```tsx
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
```

Criar mutations `useAcceptMonthlyItem` e `useRemoveMonthlyItem` em `useMonthlyList.ts` para ligar os botões.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/hooks/useMonthlyList.ts src/routes/compras.tsx
git -c user.email=kbarros.final@gmail.com -c user.name="kbarr" \
  commit -m "feat(plan2): add monthly list tab with suggested and confirmed sections"
```

---

## Task 2.6: "Modo mercado" — lista agrupada por loja (cheapest)

**Files:**
- Create: `src/hooks/useProductPrices.ts`, `src/lib/cheapest.ts`, `src/components/shopping/StoreSection.tsx`, `src/routes/compras.mercado.tsx`
- Create: `tests/lib/cheapest.test.ts`

- [ ] **Step 1: Hook de preços por produto**

`src/hooks/useProductPrices.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProductPrice } from '@/lib/types'

export function useProductPrices(productIds: string[]) {
  return useQuery({
    queryKey: ['product_prices', productIds.sort().join(',')],
    enabled: productIds.length > 0,
    queryFn: async (): Promise<ProductPrice[]> => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('product_prices')
        .select('*')
        .in('product_id', productIds)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: false })
      if (error) throw error
      return data ?? []
    }
  })
}
```

- [ ] **Step 2: `src/lib/cheapest.ts` — lógica pura**

```ts
import type { ProductPrice, Store } from './types'

export interface CheapestMatch {
  productId: string
  store: Store
  price: number
  date: string
}

export function findCheapestPerProduct(
  prices: ProductPrice[],
  stores: Store[]
): Map<string, CheapestMatch> {
  const result = new Map<string, CheapestMatch>()
  const storeById = new Map(stores.map(s => [s.id, s]))

  for (const p of prices) {
    const existing = result.get(p.product_id)
    if (!existing || p.price < existing.price) {
      const store = storeById.get(p.store_id)
      if (store) {
        result.set(p.product_id, {
          productId: p.product_id,
          store,
          price: p.price,
          date: p.date
        })
      }
    }
  }
  return result
}

export function groupByStore(
  missing: { id: string; productId: string; name: string; icon: string; unit: string; quantity: number }[],
  cheapest: Map<string, CheapestMatch>,
  stores: Store[]
) {
  interface GroupedItem {
    id: string
    productId: string
    name: string
    icon: string
    unit: string
    quantity: number
    price: number | null
  }
  type Group = { store: Store | null; items: GroupedItem[]; total: number }
  const groups = new Map<string, Group>()
  const NO_STORE_KEY = '__no_store__'
  groups.set(NO_STORE_KEY, { store: null, items: [], total: 0 })
  stores.forEach(s => groups.set(s.id, { store: s, items: [], total: 0 }))

  for (const item of missing) {
    const match = cheapest.get(item.productId)
    const key = match?.store.id ?? NO_STORE_KEY
    const group = groups.get(key)!
    const price = match?.price ?? null
    group.items.push({ ...item, price })
    group.total += (price ?? 0) * item.quantity
  }

  return Array.from(groups.values()).filter(g => g.items.length > 0).sort((a, b) => {
    if (!a.store) return 1
    if (!b.store) return -1
    return a.store.order - b.store.order
  })
}
```

- [ ] **Step 3: Teste puro da lógica — `tests/lib/cheapest.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { findCheapestPerProduct, groupByStore } from '@/lib/cheapest'
import type { ProductPrice, Store } from '@/lib/types'

const stores: Store[] = [
  { id: 's1', name: 'DB', color: '#1565c0', order: 1 },
  { id: 's2', name: 'Mercantil', color: '#2e7d32', order: 2 }
]

const prices: ProductPrice[] = [
  { id: 'a', product_id: 'p1', store_id: 's1', price: 5.0, date: '2026-04-10', source: 'receipt' },
  { id: 'b', product_id: 'p1', store_id: 's2', price: 4.5, date: '2026-04-12', source: 'receipt' },
  { id: 'c', product_id: 'p2', store_id: 's1', price: 12.0, date: '2026-04-05', source: 'receipt' }
]

describe('findCheapestPerProduct', () => {
  it('escolhe loja com menor preço por produto', () => {
    const result = findCheapestPerProduct(prices, stores)
    expect(result.get('p1')?.store.id).toBe('s2')
    expect(result.get('p1')?.price).toBe(4.5)
    expect(result.get('p2')?.store.id).toBe('s1')
  })
})

describe('groupByStore', () => {
  it('agrupa itens por loja mais barata e calcula total', () => {
    const cheapest = findCheapestPerProduct(prices, stores)
    const groups = groupByStore(
      [
        { id: '1', productId: 'p1', name: 'Leite', icon: '🥛', unit: 'L', quantity: 2 },
        { id: '2', productId: 'p2', name: 'Arroz', icon: '🍚', unit: 'kg', quantity: 1 }
      ],
      cheapest,
      stores
    )
    expect(groups).toHaveLength(2)
    const db = groups.find(g => g.store?.name === 'DB')
    const merc = groups.find(g => g.store?.name === 'Mercantil')
    expect(merc?.total).toBeCloseTo(9.0)
    expect(db?.total).toBeCloseTo(12.0)
  })

  it('coloca produtos sem preço na seção "sem loja"', () => {
    const groups = groupByStore(
      [{ id: '1', productId: 'p-novo', name: 'Pão', icon: '🍞', unit: 'un', quantity: 1 }],
      new Map(),
      stores
    )
    expect(groups[0].store).toBeNull()
    expect(groups[0].items).toHaveLength(1)
  })
})
```

Rodar teste: `npm test -- --run cheapest`. Expected: passa.

- [ ] **Step 4: `src/components/shopping/StoreSection.tsx`**

```tsx
import type { Store } from '@/lib/types'

interface Item {
  id: string
  productId: string
  name: string
  icon: string
  unit: string
  quantity: number
  price: number | null
}

interface Props {
  store: Store | null
  items: Item[]
  total: number
  checked: Set<string>
  onCheck: (productId: string) => void
}

export function StoreSection({ store, items, total, checked, onCheck }: Props) {
  const color = store?.color ?? '#64748b'
  const label = store?.name ?? 'Sem preço registrado'

  return (
    <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <header
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: `${color}12`, borderLeft: `4px solid ${color}` }}
      >
        <div>
          <h3 className="font-bold text-sm" style={{ color }}>🏪 {label}</h3>
          <p className="text-xs text-slate-500">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">R$ {total.toFixed(2)}</p>
          <p className="text-[10px] uppercase text-slate-400">total</p>
        </div>
      </header>
      <ul className="divide-y divide-slate-100">
        {items.map(it => (
          <li key={it.id} className="flex items-center gap-3 px-4 py-2">
            <input
              type="checkbox"
              checked={checked.has(it.productId)}
              onChange={() => onCheck(it.productId)}
              className="w-5 h-5 accent-emerald-500"
            />
            <span className="text-xl">{it.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${checked.has(it.productId) ? 'line-through text-slate-400' : ''}`}>{it.name}</p>
              <p className="text-[11px] text-slate-500">
                {it.quantity} {it.unit}
                {it.price !== null && ` · R$ ${it.price.toFixed(2)}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 5: Rota `/compras/mercado` (TanStack Router file-based: o arquivo `compras.mercado.tsx` vira a rota `/compras/mercado`)**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useProducts, useStores } from '@/hooks/useProducts'
import { useShoppingList, useToggleMissing } from '@/hooks/useShoppingList'
import { useProductPrices } from '@/hooks/useProductPrices'
import { findCheapestPerProduct, groupByStore } from '@/lib/cheapest'
import { StoreSection } from '@/components/shopping/StoreSection'
import { ArrowLeft, Share2 } from 'lucide-react'
import { buildWhatsAppMessage } from '@/lib/whatsapp'

export const Route = createFileRoute('/compras/mercado')({
  component: MercadoPage
})

function MercadoPage() {
  const navigate = useNavigate()
  const products = useProducts()
  const stores = useStores()
  const shopping = useShoppingList()
  const toggle = useToggleMissing()
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const missingItems = useMemo(() => {
    if (!products.data || !shopping.data) return []
    const pById = new Map(products.data.map(p => [p.id, p]))
    return shopping.data
      .filter(i => i.is_missing)
      .map(i => {
        const p = pById.get(i.product_id)
        if (!p) return null
        return {
          id: i.id,
          productId: p.id,
          name: p.name,
          icon: p.icon,
          unit: p.unit,
          quantity: i.quantity
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [products.data, shopping.data])

  const prices = useProductPrices(missingItems.map(i => i.productId))

  const groups = useMemo(() => {
    if (!stores.data || !prices.data) return []
    const cheapest = findCheapestPerProduct(prices.data, stores.data)
    return groupByStore(missingItems, cheapest, stores.data)
  }, [missingItems, prices.data, stores.data])

  const totalGeral = groups.reduce((acc, g) => acc + g.total, 0)

  const onCheck = (productId: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const onShareWhatsApp = () => {
    const text = buildWhatsAppMessage(groups, totalGeral)
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const onMarkBought = async () => {
    await Promise.all(
      Array.from(checked).map(productId => toggle.mutateAsync({ productId, isMissing: false }))
    )
    setChecked(new Set())
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/compras' })} aria-label="Voltar" className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Modo mercado</h2>
          <p className="text-xs text-slate-500">Lista agrupada por onde está mais barato</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold">R$ {totalGeral.toFixed(2)}</p>
          <p className="text-[10px] uppercase text-slate-400">total estimado</p>
        </div>
      </header>

      {missingItems.length === 0 ? (
        <p className="text-center text-slate-500 py-10">Nada faltando. 💜</p>
      ) : (
        <>
          <div className="space-y-3">
            {groups.map(g => (
              <StoreSection
                key={g.store?.id ?? 'no-store'}
                store={g.store}
                items={g.items}
                total={g.total}
                checked={checked}
                onCheck={onCheck}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-2 sticky bottom-20 bg-slate-50/80 backdrop-blur py-2 -mx-4 px-4">
            <button
              onClick={onShareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-md"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
            >
              <Share2 className="w-5 h-5" />
              WhatsApp
            </button>
            <button
              onClick={onMarkBought}
              disabled={checked.size === 0}
              className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white disabled:opacity-40"
            >
              Marcar {checked.size > 0 ? `${checked.size}` : ''} comprado{checked.size > 1 ? 's' : ''}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add src/hooks/useProductPrices.ts src/lib/cheapest.ts src/components/shopping/StoreSection.tsx src/routes/compras.mercado.tsx tests/lib/cheapest.test.ts
git -c user.email=kbarros.final@gmail.com -c user.name="kbarr" \
  commit -m "feat(plan2): add market-mode page grouping missing items by cheapest store"
```

---

## Task 2.7: WhatsApp export helper

**Files:**
- Create: `src/lib/whatsapp.ts`, `tests/lib/whatsapp.test.ts`

- [ ] **Step 1: `src/lib/whatsapp.ts`**

```ts
import type { Store } from './types'

interface Item {
  name: string
  icon: string
  unit: string
  quantity: number
  price: number | null
}

interface Group {
  store: Store | null
  items: Item[]
  total: number
}

export function buildWhatsAppMessage(groups: Group[], totalGeral: number): string {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const lines: string[] = [`*Lista de compras — ${date}*`, '']

  for (const g of groups) {
    const storeLabel = g.store ? g.store.name : 'Sem preço'
    lines.push(`🏪 *${storeLabel}*${g.total > 0 ? ` (R$ ${g.total.toFixed(2)})` : ''}`)
    for (const item of g.items) {
      const priceTag = item.price !== null ? ` — R$ ${item.price.toFixed(2)}` : ''
      lines.push(`• ${item.icon} ${item.name} (${item.quantity} ${item.unit})${priceTag}`)
    }
    lines.push('')
  }

  if (totalGeral > 0) {
    lines.push(`*Total estimado: R$ ${totalGeral.toFixed(2)}*`)
  }

  return lines.join('\n')
}
```

- [ ] **Step 2: Teste — `tests/lib/whatsapp.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildWhatsAppMessage } from '@/lib/whatsapp'

describe('buildWhatsAppMessage', () => {
  it('formata lista agrupada por loja com totais', () => {
    const msg = buildWhatsAppMessage([
      {
        store: { id: 's1', name: 'DB', color: '#1565c0', order: 1 },
        items: [
          { name: 'Leite', icon: '🥛', unit: 'L', quantity: 2, price: 4.89 }
        ],
        total: 9.78
      },
      {
        store: { id: 's2', name: 'Mercantil', color: '#2e7d32', order: 2 },
        items: [
          { name: 'Pão', icon: '🍞', unit: 'un', quantity: 1, price: 6.50 }
        ],
        total: 6.50
      }
    ], 16.28)

    expect(msg).toContain('*Lista de compras')
    expect(msg).toContain('DB')
    expect(msg).toContain('Mercantil')
    expect(msg).toContain('🥛 Leite (2 L)')
    expect(msg).toContain('R$ 4.89')
    expect(msg).toContain('Total estimado: R$ 16.28')
  })

  it('não mostra total nem preço quando vazio', () => {
    const msg = buildWhatsAppMessage([
      { store: null, items: [{ name: 'Azeite', icon: '🫒', unit: 'un', quantity: 1, price: null }], total: 0 }
    ], 0)
    expect(msg).not.toContain('Total estimado')
    expect(msg).toContain('Azeite')
  })
})
```

- [ ] **Step 3: Rodar testes**

```bash
npm test -- --run
```

Expected: todos passam (9 de Plan 1 + 3 de cheapest + 2 de whatsapp = 14).

- [ ] **Step 4: Commit**

```bash
git add src/lib/whatsapp.ts tests/lib/whatsapp.test.ts
git -c user.email=kbarros.final@gmail.com -c user.name="kbarr" \
  commit -m "feat(plan2): add WhatsApp message builder with grouped store sections"
```

---

## Task 2.8: Home — KPIs reativos + lista curta de faltando

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Conectar Home aos hooks reais**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { ShoppingCart, Camera } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useShoppingList } from '@/hooks/useShoppingList'

export const Route = createFileRoute('/')({
  component: HomeScreen
})

export function HomeScreen() {
  const products = useProducts()
  const shopping = useShoppingList()

  const missingCount = shopping.data?.filter(i => i.is_missing).length ?? 0

  const missingPreview = (() => {
    if (!products.data || !shopping.data) return []
    const byId = new Map(products.data.map(p => [p.id, p]))
    return shopping.data
      .filter(i => i.is_missing)
      .slice(0, 3)
      .map(i => byId.get(i.product_id))
      .filter((p): p is NonNullable<typeof p> => !!p)
  })()

  return (
    <div className="p-4 space-y-3">
      <h2 className="sr-only">Início</h2>

      <Link
        to="/compras"
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg text-base"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
      >
        <ShoppingCart className="w-5 h-5" />
        Marcar item que acabou
      </Link>

      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg text-base"
        style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        onClick={() => alert('Em breve: OCR de nota fiscal (Plan 3)')}
      >
        <Camera className="w-5 h-5" />
        Fotografar nota fiscal
      </button>

      <div className="grid grid-cols-2 gap-3 pt-4">
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}>
          <p className="text-2xl font-extrabold">R$ —</p>
          <p className="text-xs uppercase tracking-wider opacity-80">Gasto do mês (Plan 3)</p>
        </div>
        <Link
          to="/compras"
          className="rounded-2xl p-4 text-white block"
          style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
        >
          <p className="text-2xl font-extrabold">{missingCount}</p>
          <p className="text-xs uppercase tracking-wider opacity-80">Faltando</p>
        </Link>
      </div>

      {missingPreview.length > 0 && (
        <section className="pt-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Últimos marcados</h3>
          <ul className="space-y-2">
            {missingPreview.map(p => (
              <li key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3">
                <span className="text-2xl">{p.icon}</span>
                <span className="flex-1 text-sm font-medium">{p.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/routes/index.tsx
git -c user.email=kbarros.final@gmail.com -c user.name="kbarr" \
  commit -m "feat(plan2): wire home screen to live shopping-list KPIs"
```

---

## Task 2.9: Deploy + smoke test

- [ ] **Step 1: Tests + build final**

```bash
npm test -- --run && npm run build
```

Expected: 14 tests green, build sem warnings.

- [ ] **Step 2: Deploy via netlify CLI**

```bash
npx netlify-cli deploy --dir=dist --prod --message "Plan 2 — Shopping flow"
```

- [ ] **Step 3: Smoke test no live site**

Abrir https://app-casa-monika-karina.netlify.app no celular:
- Home mostra 0 faltando
- Ir em Compras, tocar num ícone — KPI aumenta em tempo real
- FAB "+" abre modal, criar um produto novo (ex: "Chocolate") — aparece na grid
- Marcar 3 itens faltando → botão "Ver lista do mercado" aparece
- Tocar: lista agrupada por loja (sem preço ainda porque Plan 3 não rodou)
- Botão WhatsApp: copiar/compartilhar mensagem formatada
- Marcar item como "comprado" → sai da lista de faltando

- [ ] **Step 4: Merge para main (se em feature branch) ou já está em main — deploy triggered automaticamente**

```bash
git push origin feat/plan-2-shopping
gh pr create --fill
# ou merge direto se não tem revisão
```

---

## Definition of Done deste Plan 2

- [ ] 14 testes verdes (9 Plan 1 + 5 Plan 2: 3 cheapest + 2 whatsapp)
- [ ] Build passa sem warnings
- [ ] Home: KPI "Faltando" live-updated + lista curta de últimos marcados
- [ ] Compras: grid por categoria; tap marca/desmarca faltando com sync real-time
- [ ] Novo produto via FAB "+" cria row em products + monthly_list + shopping_list
- [ ] Aba Mensal: sugeridos (vazio até Plan 3) + confirmados
- [ ] /compras/mercado: agrupa por loja cheapest, total por loja e geral
- [ ] Botão WhatsApp abre wa.me com mensagem formatada
- [ ] Marcar "comprado" desliga o is_missing e atualiza KPI na home
- [ ] Deploy live em app-casa-monika-karina.netlify.app

---

## Follow-ups

- Plan 3: OCR de nota fiscal (Netlify Function + Claude Vision) popula product_prices → Modo Mercado fica útil de verdade.
- Plan 3 também implementa a lógica de Enriquecimento Automático (spec §6.1b) — sugeridos na aba Mensal começam a aparecer.
- Plan 4: Pets, Izete, Financeiro agregado, OS + PDF, migração do bin antigo.
