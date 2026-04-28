import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { IzeteEventFull } from '@/hooks/useIzete'
import { useIzete, useMarkCame, useUnmarkCame, useTogglePaid } from '@/hooks/useIzete'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { Copy, Check } from 'lucide-react'

export const Route = createFileRoute('/izete')({
  component: ZazaPage
})

interface Task {
  id: number
  t: string
  done: boolean
}

function allTuesdaysOfMonth(year: number, monthIdx: number): string[] {
  const out: string[] = []
  const lastDay = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(Date.UTC(year, monthIdx, d))
    if (date.getUTCDay() === 2) {
      out.push(date.toISOString().slice(0, 10))
    }
  }
  return out
}

function ZazaPage() {
  const settings = useSettings()
  const events = useIzete()
  const mark = useMarkCame()
  const unmark = useUnmarkCame()
  const togglePaid = useTogglePaid()
  const updateSettings = useUpdateSettings()

  const [copied, setCopied] = useState(false)
  const [monthIdx, setMonthIdx] = useState(Math.max(3, new Date().getMonth())) // Abril = 3

  const name = settings.data?.data?.diarista_name ?? 'Diarista'
  const pix = settings.data?.data?.diarista_pix ?? ''
  const diaria = Number(settings.data?.diaria_value ?? 150)
  const transp = Number(settings.data?.transp_value ?? 0)
  const valorPorVisita = diaria + transp
  const tasks: Task[] = settings.data?.data?.diarista_tasks ?? []

  const copyPix = async () => {
    if (!pix) return
    try {
      await navigator.clipboard.writeText(pix)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      alert(pix)
    }
  }

  // Mapa date → event
  const eventByDate = useMemo(() => {
    const m = new Map<string, IzeteEventFull>()
    for (const e of events.data ?? []) m.set(e.event_date, e)
    return m
  }, [events.data])

  // Totais do mês selecionado
  const totals = useMemo(() => {
    const prefix = `2026-${String(monthIdx + 1).padStart(2, '0')}`
    const monthEvents = (events.data ?? []).filter(e => e.event_date.startsWith(prefix))
    const paid = monthEvents.filter(e => e.paid).length * valorPorVisita
    const pending = monthEvents.filter(e => !e.paid).length * valorPorVisita
    return { pending, paid, days: monthEvents.length }
  }, [events.data, valorPorVisita, monthIdx])

  // Todas as terças do mês selecionado
  const tuesdaysOfMonth = useMemo(() => allTuesdaysOfMonth(2026, monthIdx), [monthIdx])

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  // Toggle "veio" — cria ou apaga evento
  const toggleCame = (date: string) => {
    const ev = eventByDate.get(date)
    if (!ev) {
      mark.mutate(date)
    } else if (ev.paid) {
      // Se já está pago, primeiro desmarca pago, depois remove
      if (!confirm('Este dia já está pago. Desfazer pagamento e "veio"?')) return
      togglePaid.mutate(
        { id: ev.id, paid: false, amount: valorPorVisita, eventDate: date },
        { onSuccess: () => unmark.mutate(ev.id) }
      )
    } else {
      unmark.mutate(ev.id)
    }
  }

  // Toggle tarefa
  const toggleTask = (taskId: number) => {
    if (!settings.data) return
    const newTasks = tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    const newData = { ...settings.data.data, diarista_tasks: newTasks }
    updateSettings.mutate({ data: newData })
  }

  // Reset tarefas (todas undone)
  const resetTasks = () => {
    if (!settings.data) return
    const newTasks = tasks.map(t => ({ ...t, done: false }))
    const newData = { ...settings.data.data, diarista_tasks: newTasks }
    updateSettings.mutate({ data: newData })
  }

  const taskDone = tasks.filter(t => t.done).length
  const taskPct = tasks.length ? Math.round((taskDone / tasks.length) * 100) : 0

  return (
    <div className="p-4 space-y-4 pb-28">
      <header>
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="text-xs text-slate-500">
          Diarista · R$ {valorPorVisita.toFixed(2)} {transp > 0 ? '(diária + transporte)' : '(tudo incluso)'}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-center">
          <p className="text-lg font-extrabold text-rose-700">R$ {totals.pending.toFixed(2)}</p>
          <p className="text-[10px] uppercase text-rose-600 font-bold">a pagar</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
          <p className="text-lg font-extrabold text-emerald-700">R$ {totals.paid.toFixed(2)}</p>
          <p className="text-[10px] uppercase text-emerald-600 font-bold">já pago</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-lg font-extrabold text-amber-700">{totals.days}</p>
          <p className="text-[10px] uppercase text-amber-600 font-bold">dias</p>
        </div>
      </div>

      {pix && (
        <div className="rounded-xl bg-white border border-slate-200 border-l-4 p-4 flex items-center gap-3" style={{ borderLeftColor: '#795548' }}>
          <div className="flex-1">
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#795548' }}>PIX da {name}</p>
            <p className="text-base font-mono mt-1">{pix}</p>
          </div>
          <button
            onClick={copyPix}
            className="px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-1.5"
            style={{ background: copied ? '#10b981' : '#795548' }}
          >
            {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
          </button>
        </div>
      )}

      <div className="rounded-lg bg-amber-50 border-l-4 border-amber-400 p-3 text-xs text-slate-700">
        <strong className="text-amber-900">Como funciona:</strong> {name} marca que veio → você confirma o pagamento. Valor: <strong>R$ {valorPorVisita.toFixed(2)}</strong> tudo incluso.
      </div>

      <div>
        <h3 className="text-xs uppercase text-slate-500 font-bold mb-2">Calendário 2026 — Terças</h3>
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
          {MESES.map((mes, i) => (
            <button
              key={i}
              onClick={() => setMonthIdx(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${i === monthIdx ? 'text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
              style={i === monthIdx ? { background: '#795548' } : {}}
            >
              {mes}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          <div className="grid px-3 py-2 text-[9px] font-bold uppercase text-slate-400" style={{ gridTemplateColumns: '50px 30px 1fr 1fr 70px', gap: '4px' }}>
            <span></span>
            <span></span>
            <span className="text-center">Veio?</span>
            <span className="text-center">Pagar</span>
            <span className="text-right">Acum.</span>
          </div>
          {tuesdaysOfMonth.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">Nenhuma terça neste mês.</p>
          ) : (
            tuesdaysOfMonth.map(date => {
              const ev = eventByDate.get(date)
              const came = !!ev
              const paid = ev?.paid ?? false
              const day = date.slice(8, 10) + '/' + date.slice(5, 7)

              return (
                <div
                  key={date}
                  className="grid items-center px-3 py-2"
                  style={{ gridTemplateColumns: '50px 30px 1fr 1fr 70px', gap: '4px', opacity: paid ? 0.6 : 1 }}
                >
                  <span className="text-sm font-semibold">{day}</span>
                  <span className="text-[9px] font-bold bg-blue-100 text-blue-700 rounded px-1 py-0.5 text-center">Ter</span>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => toggleCame(date)}
                      disabled={mark.isPending || unmark.isPending}
                      className={`text-[11px] px-3 py-1.5 rounded-full font-bold transition active:scale-95 disabled:opacity-50 ${came ? 'text-white' : 'bg-slate-100 text-slate-500'}`}
                      style={came ? { background: '#795548' } : {}}
                    >
                      {came ? '✓ veio' : 'veio?'}
                    </button>
                  </div>
                  <div className="flex justify-center">
                    {came ? (
                      <button
                        type="button"
                        onClick={() => ev && togglePaid.mutate({ id: ev.id, paid: !paid, amount: valorPorVisita, eventDate: date })}
                        disabled={togglePaid.isPending}
                        className={`text-[11px] px-3 py-1.5 rounded-full font-bold transition active:scale-95 disabled:opacity-50 ${paid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}
                      >
                        {paid ? '✓ pago' : `R$${valorPorVisita}`}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-right text-rose-600">
                    {came && !paid ? `R$${valorPorVisita}` : ''}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase font-bold" style={{ color: '#795548' }}>
            Tarefas — {MESES_FULL[monthIdx]} ({taskDone}/{tasks.length})
          </h3>
          <button
            onClick={resetTasks}
            className="text-[11px] text-slate-500 underline"
          >
            Resetar
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="h-1.5 bg-slate-100">
            <div className="h-full transition-all" style={{ width: `${taskPct}%`, background: '#795548' }} />
          </div>

          <ul className="divide-y divide-slate-100">
            {tasks.length === 0 && <li className="text-sm text-slate-400 p-4 text-center">Sem tarefas configuradas.</li>}
            {tasks.map(t => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  disabled={updateSettings.isPending}
                  className="w-full flex items-center gap-3 py-2.5 px-3 text-left active:bg-slate-50 disabled:opacity-50"
                >
                  <span
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${t.done ? 'text-white' : 'border-amber-800'}`}
                    style={t.done ? { background: '#795548', borderColor: '#795548' } : {}}
                  >
                    {t.done && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className={`text-sm flex-1 ${t.done ? 'line-through text-slate-400' : ''}`}>{t.t}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="text-[10px] text-slate-400 p-2 text-center border-t border-slate-100">
            Editar tarefas em Config → "Tarefas da {name}"
          </p>
        </div>
      </section>
    </div>
  )
}
