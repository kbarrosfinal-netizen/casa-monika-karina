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
