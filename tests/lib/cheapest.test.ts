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
