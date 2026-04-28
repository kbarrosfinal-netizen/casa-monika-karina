import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useFinance, useAddFinanceEntry, useTicketBalance } from '@/hooks/useFinance'
import { Plus, ArrowDownRight, ArrowUpRight, Ticket } from 'lucide-react'

export const Route = createFileRoute('/financas')({
  component: FinancasPage
})

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function FinancasPage() {
  const [month, setMonth] = useState(currentMonthStr())
  const { data: entries } = useFinance(month)
  const ticket = useTicketBalance(month)
  const add = useAddFinanceEntry()
  const [formOpen, setFormOpen] = useState(false)

  const { income, expense, balance, byCategory } = useMemo(() => {
    let income = 0, expense = 0
    const byCategory: Record<string, number> = {}
    for (const e of entries ?? []) {
      if (e.type === 'income') income += e.amount
      else {
        expense += e.amount
        const key = e.category ?? 'Outros'
        byCategory[key] = (byCategory[key] ?? 0) + e.amount
      }
    }
    return { income, expense, balance: income - expense, byCategory }
  }, [entries])

  const maxCategory = Math.max(1, ...Object.values(byCategory))
  const fmtMoney = (n: number) => `R$ ${n.toFixed(2)}`
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const sourceIcon = (s: string) => s === 'receipt' ? '🛒' : s === 'izete' ? '📅' : '➕'

  return (
    <div className="p-4 space-y-4 pb-28">
      <header>
        <h2 className="text-xl font-bold">Finanças</h2>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="mt-1 text-sm text-slate-600 bg-transparent"
        />
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 text-white" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>
          <ArrowUpRight className="w-4 h-4 opacity-70" />
          <p className="text-lg font-extrabold mt-1">{fmtMoney(income)}</p>
          <p className="text-[10px] uppercase opacity-80">Entradas</p>
        </div>
        <div className="rounded-xl p-3 text-white" style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}>
          <ArrowDownRight className="w-4 h-4 opacity-70" />
          <p className="text-lg font-extrabold mt-1">{fmtMoney(expense)}</p>
          <p className="text-[10px] uppercase opacity-80">Saídas</p>
        </div>
        <div className="rounded-xl p-3 text-white" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
          <p className="text-lg font-extrabold mt-4">{fmtMoney(balance)}</p>
          <p className="text-[10px] uppercase opacity-80">Saldo</p>
        </div>
      </div>

      {ticket.data && (
        <div className="rounded-2xl p-4 text-white shadow-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="w-5 h-5" />
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">Vale-refeição do mês</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-extrabold">{fmtMoney(ticket.data.remaining)}</p>
            <p className="text-xs opacity-80">disponível</p>
          </div>
          <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/90 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, (ticket.data.remaining / ticket.data.income) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] mt-1.5 opacity-90">
            <span>gasto: {fmtMoney(ticket.data.spent)}</span>
            <span>total: {fmtMoney(ticket.data.income)}</span>
          </div>
        </div>
      )}

      {Object.keys(byCategory).length > 0 && (
        <section>
          <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Por categoria</h3>
          <ul className="space-y-2">
            {Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, val]) => (
              <li key={cat} className="bg-white rounded-xl border border-slate-200 p-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">{cat}</span>
                  <span>{fmtMoney(val)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
                    style={{ width: `${(val / maxCategory) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Lançamentos ({entries?.length ?? 0})</h3>
        {entries && entries.length === 0 && (
          <p className="text-sm text-slate-400 italic">Nada lançado neste mês ainda.</p>
        )}
        <ul className="space-y-1">
          {entries?.map(e => (
            <li key={e.id} className="bg-white rounded-lg border border-slate-200 p-2 flex items-center gap-3">
              <span className="text-lg">{sourceIcon(e.source)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{e.note ?? e.category ?? (e.type === 'income' ? 'Entrada' : 'Gasto')}</p>
                <p className="text-[10px] text-slate-500">{fmtDate(e.date)} · {e.category ?? 'sem categoria'}</p>
              </div>
              <p className={`font-bold text-sm ${e.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {e.type === 'income' ? '+' : '-'}{fmtMoney(e.amount)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <button
        onClick={() => setFormOpen(v => !v)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        aria-label="Lançar manual"
      >
        <Plus className="w-6 h-6" />
      </button>

      {formOpen && (
        <QuickEntryForm
          onSubmit={async (e) => {
            await add.mutateAsync({ ...e, source: 'manual', receipt_id: null })
            setFormOpen(false)
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}

function QuickEntryForm({ onSubmit, onCancel }: { onSubmit: (e: { type: 'income' | 'expense'; amount: number; category: string; date: string; note: string }) => Promise<void>; onCancel: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-end" onClick={onCancel}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={async e => {
          e.preventDefault()
          const amt = parseFloat(amount.replace(',', '.'))
          if (isNaN(amt) || amt <= 0) return
          setSubmitting(true)
          await onSubmit({ type, amount: amt, category: category || 'Outros', date, note })
          setSubmitting(false)
        }}
        className="bg-white w-full rounded-t-2xl p-5 space-y-3"
      >
        <h3 className="text-lg font-bold">Novo lançamento</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg font-bold ${type === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-100'}`}>Saída</button>
          <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg font-bold ${type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}>Entrada</button>
        </div>
        <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor (R$)" inputMode="decimal" className="w-full border border-slate-200 rounded-lg px-3 py-2" />
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Categoria (ex: pet, transporte)" className="w-full border border-slate-200 rounded-lg px-3 py-2" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Descrição (opcional)" className="w-full border border-slate-200 rounded-lg px-3 py-2" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg border border-slate-300">Cancelar</button>
          <button type="submit" disabled={submitting || !amount} className="flex-1 py-2 rounded-lg text-white font-bold disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
