import { useRef } from 'react'
import { cn } from '@/lib/cn'
import type { Product } from '@/lib/types'

interface Props {
  product: Product
  isMissing: boolean
  onToggle: () => void
  onLongPress?: (product: Product) => void
}

export function ProductIcon({ product, isMissing, onToggle, onLongPress }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)

  const start = () => {
    if (!onLongPress) return
    fired.current = false
    timer.current = setTimeout(() => {
      fired.current = true
      onLongPress(product)
    }, 600)
  }
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (fired.current) {
          fired.current = false
          return
        }
        onToggle()
      }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={e => { if (onLongPress) e.preventDefault() }}
      aria-pressed={isMissing}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-xl border-2 bg-white transition-all min-w-[80px] select-none',
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
