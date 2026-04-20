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
