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
