import { Link, useRouterState } from '@tanstack/react-router'
import { Home, ShoppingCart, Camera, Wallet, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

const TABS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/notas', label: 'Notas', icon: Camera },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/mais', label: 'Mais', icon: MoreHorizontal }
] as const

export function BottomTabs() {
  const { location } = useRouterState()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 safe-bottom z-50"
      aria-label="Navegação principal"
    >
      <ul className="flex">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-semibold min-h-[56px]',
                  active ? 'text-brand-600' : 'text-slate-400'
                )}
              >
                <Icon className="w-5 h-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
