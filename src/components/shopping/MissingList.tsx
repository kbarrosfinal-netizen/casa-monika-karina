import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import type { Product, ShoppingListItem } from '@/lib/types'

interface Props {
  products: Product[]
  shoppingList: ShoppingListItem[]
  onDelete: (productId: string, productName: string) => void
}

export function MissingList({ products, shoppingList, onDelete }: Props) {
  const items = useMemo(() => {
    const byId = new Map(products.map(p => [p.id, p]))
    const seen = new Set<string>()
    return shoppingList
      .filter(i => i.is_missing)
      .filter(i => {
        if (seen.has(i.product_id)) return false
        seen.add(i.product_id)
        return true
      })
      .map(i => {
        const p = byId.get(i.product_id)
        if (!p) return null
        return { id: i.id, product: p, quantity: i.quantity, addedAt: i.added_at }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
  }, [products, shoppingList])

  if (items.length === 0) return null

  return (
    <section
      aria-label="Itens faltando agora"
      className="bg-white rounded-2xl border border-rose-200 overflow-hidden"
    >
      <header className="px-4 py-2.5 bg-rose-50 border-b border-rose-100">
        <h3 className="text-xs uppercase tracking-wider font-bold text-rose-700">
          Faltando agora · {items.length}
        </h3>
      </header>
      <ul className="divide-y divide-slate-100">
        {items.map(({ id, product, quantity }) => (
          <li key={id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-2xl shrink-0" aria-hidden>{product.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
              {quantity > 1 && (
                <p className="text-[11px] text-slate-500">
                  {quantity} {product.unit}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDelete(product.id, product.name)}
              aria-label={`Remover ${product.name} da lista`}
              className="p-2 -mr-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-90 transition shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
