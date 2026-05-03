import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { ShoppingCart, Wallet, CalendarDays, PawPrint, Stethoscope, Syringe } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useShoppingList } from '@/hooks/useShoppingList'
import { useIzete } from '@/hooks/useIzete'
import { usePets } from '@/hooks/usePets'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { Fab } from '@/components/Fab'

export const Route = createFileRoute('/')({
  component: HomeScreen
})

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function formatToday() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).replace(/^./, c => c.toUpperCase())
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function HomeScreen() {
  const products = useProducts()
  const shopping = useShoppingList()
  const izete = useIzete()
  const pets = usePets()
  const summary = useMonthlySummary(currentMonthStr())

  const productsById = useMemo(
    () => new Map((products.data ?? []).map(p => [p.id, p])),
    [products.data]
  )

  const missingItems = useMemo(
    () => (shopping.data ?? []).filter(i => i.is_missing),
    [shopping.data]
  )

  const missingUniqueCount = useMemo(
    () => new Set(missingItems.map(i => i.product_id)).size,
    [missingItems]
  )

  const recentMissing = useMemo(
    () => [...missingItems]
      .sort((a, b) => (b.added_at ?? '').localeCompare(a.added_at ?? ''))
      .slice(0, 5),
    [missingItems]
  )

  const nextEvent = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10)
    return (izete.data ?? [])
      .filter(e => e.event_date >= todayISO)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))[0]
  }, [izete.data])

  const petReminders = useMemo(() => {
    const list: { pet: typeof pets.data extends (infer T)[] | undefined ? T : never; type: 'vet' | 'vac'; date: string }[] = []
    for (const p of pets.data ?? []) {
      if (p.next_vet_visit) list.push({ pet: p, type: 'vet', date: p.next_vet_visit })
      if (p.next_vaccine)   list.push({ pet: p, type: 'vac', date: p.next_vaccine })
    }
    return list
      .filter(r => daysUntil(r.date) <= 30 && daysUntil(r.date) >= -7)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [pets.data])

  const monthExpense = summary.data?.expense_total ?? 0
  const topCategories = (summary.data?.by_category ?? []).slice(0, 5)
  const maxCat = topCategories.reduce((m, c) => Math.max(m, c.total), 0)

  return (
    <div className="p-4 pb-32 space-y-5">
      <h2 className="sr-only">Início</h2>

      <header>
        <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">{formatToday()}</p>
        <p className="text-2xl font-extrabold text-slate-900 mt-0.5">Olá 💜</p>
      </header>

      <section className="grid grid-cols-2 gap-3" aria-label="Resumo">
        <Link
          to="/compras"
          className="rounded-2xl p-4 text-white shadow-md active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          <ShoppingCart className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-extrabold mt-2">{missingUniqueCount}</p>
          <p className="text-[11px] uppercase tracking-wider opacity-90">Faltando</p>
        </Link>

        <Link
          to="/financas"
          className="rounded-2xl p-4 text-white shadow-md active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
        >
          <Wallet className="w-5 h-5 opacity-80" />
          <p className="text-2xl font-extrabold mt-2 leading-tight">
            {monthExpense > 0 ? brl(monthExpense) : 'R$ —'}
          </p>
          <p className="text-[11px] uppercase tracking-wider opacity-90">Gasto do mês</p>
        </Link>

        <Link
          to="/izete"
          className="rounded-2xl p-4 text-white shadow-md active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
        >
          <CalendarDays className="w-5 h-5 opacity-80" />
          {nextEvent ? (
            <>
              <p className="text-base font-extrabold mt-2 leading-tight">
                {new Date(nextEvent.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
              <p className="text-[11px] uppercase tracking-wider opacity-90 truncate">
                {nextEvent.description ?? 'Evento'}
              </p>
            </>
          ) : (
            <>
              <p className="text-base font-bold mt-2">Sem eventos</p>
              <p className="text-[11px] uppercase tracking-wider opacity-90">Próximos</p>
            </>
          )}
        </Link>

        <Link
          to="/pets"
          className="rounded-2xl p-4 text-white shadow-md active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}
        >
          <PawPrint className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-extrabold mt-2">{petReminders.length}</p>
          <p className="text-[11px] uppercase tracking-wider opacity-90">Lembretes pet</p>
        </Link>
      </section>

      {topCategories.length > 0 && (
        <section aria-label="Gastos por categoria" className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500">Categorias do mês</h3>
            <span className="text-xs text-slate-400">{topCategories.length} de {summary.data?.by_category.length ?? 0}</span>
          </div>
          <ul className="space-y-2.5">
            {topCategories.map(c => {
              const pct = maxCat > 0 ? (c.total / maxCat) * 100 : 0
              return (
                <li key={c.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 truncate pr-2">{c.category}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{brl(c.total)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {petReminders.length > 0 && (
        <section aria-label="Lembretes dos pets" className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3">Próximos lembretes 🐾</h3>
          <ul className="space-y-2">
            {petReminders.slice(0, 3).map((r, i) => {
              const Icon = r.type === 'vet' ? Stethoscope : Syringe
              const days = daysUntil(r.date)
              const label = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : days < 0 ? `${-days}d atrás` : `em ${days}d`
              const urgent = days <= 3
              return (
                <li key={`${r.pet.id}-${r.type}-${i}`} className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center ${urgent ? 'bg-rose-100 text-rose-600' : 'bg-pink-50 text-pink-500'}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {r.pet.name} · {r.type === 'vet' ? 'Vet' : 'Vacina'}
                    </p>
                    <p className={`text-xs ${urgent ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>{label}</p>
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {recentMissing.length > 0 && (
        <section aria-label="Últimos itens marcados">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500">Últimos marcados</h3>
            <Link to="/compras" className="text-xs font-semibold text-emerald-600">Ver tudo</Link>
          </div>
          <ul className="space-y-2">
            {recentMissing.map(item => {
              const p = productsById.get(item.product_id)
              if (!p) return null
              return (
                <li key={item.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3">
                  <span className="text-2xl" aria-hidden>{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    {item.added_by && (
                      <p className="text-[11px] text-slate-400">por {item.added_by}</p>
                    )}
                  </div>
                  {item.quantity > 1 && (
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
                      {item.quantity}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {recentMissing.length === 0 && missingUniqueCount === 0 && (
        <section className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm font-semibold text-slate-700">Nenhum item faltando</p>
          <p className="text-xs text-slate-500 mt-1">Aproveite o dia 💜</p>
        </section>
      )}

      <Fab />
    </div>
  )
}
