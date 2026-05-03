import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, ShoppingCart, Camera, Wallet, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FabAction {
  label: string
  icon: typeof ShoppingCart
  bg: string
  onClick: () => void
}

export function Fab() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const actions: FabAction[] = [
    {
      label: 'Item de compra',
      icon: ShoppingCart,
      bg: 'bg-emerald-500',
      onClick: () => { setOpen(false); navigate({ to: '/compras' }) }
    },
    {
      label: 'Fotografar nota',
      icon: Camera,
      bg: 'bg-orange-500',
      onClick: () => { setOpen(false); navigate({ to: '/notas/fotografar' }) }
    },
    {
      label: 'Lançamento',
      icon: Wallet,
      bg: 'bg-violet-500',
      onClick: () => { setOpen(false); navigate({ to: '/financas' }) }
    },
    {
      label: 'Marcar Zazá',
      icon: Sparkles,
      bg: 'bg-rose-500',
      onClick: () => { setOpen(false); navigate({ to: '/izete' }) }
    }
  ]

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" aria-hidden />
      )}
      <div
        ref={ref}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3"
      >
        {open && (
          <ul className="flex flex-col items-end gap-3 mb-1">
            {actions.map((a, i) => {
              const Icon = a.icon
              return (
                <li
                  key={a.label}
                  className="flex items-center gap-2 animate-[fab-in_200ms_ease-out_both]"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="text-xs font-semibold bg-white px-2 py-1 rounded-md shadow-md text-slate-700">
                    {a.label}
                  </span>
                  <button
                    type="button"
                    onClick={a.onClick}
                    className={cn(
                      'w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform',
                      a.bg
                    )}
                    aria-label={a.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? 'Fechar menu' : 'Abrir menu de ações'}
          className={cn(
            'w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95',
            open
              ? 'bg-slate-700 rotate-45'
              : 'bg-gradient-to-br from-fuchsia-500 to-violet-600'
          )}
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
      <style>{`
        @keyframes fab-in {
          from { opacity: 0; transform: translateY(8px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
