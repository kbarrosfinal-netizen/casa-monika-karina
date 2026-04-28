import { X } from 'lucide-react'
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
  onRemove?: (productId: string, name: string) => void
}

export function StoreSection({ store, items, total, checked, onCheck, onRemove }: Props) {
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
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(it.productId, it.name)}
                aria-label={`Remover ${it.name} da lista`}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-90 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
