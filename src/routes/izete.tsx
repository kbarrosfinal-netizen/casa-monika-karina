import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useIzete, useToggleIzetePaid } from '@/hooks/useIzete'
import { useSettings } from '@/hooks/useSettings'
import { Copy, Check } from 'lucide-react'

export const Route = createFileRoute('/izete')({
  component: ZazaPage
})

function ZazaPage() {
  const settings = useSettings()
  const events = useIzete()
  const toggle = useToggleIzetePaid()
  const [copied, setCopied] = useState(false)
  const [monthIdx, setMonthIdx] = useState(new Date().getMonth())

  const name = settings.data?.data?.diarista_name ?? 'Diarista'
  const pix = settings.data?.data?.diarista_pix ?? ''
  const diaria = settings.data?.diaria_value ?? 150
  const transp = settings.data?.transp_value ?? 10
  const valorPorVisita = Number(diaria) + Number(transp)
  const tasks: Array<{ id: number; t: string; done: boolean }> = settings.data?.data?.diarista_tasks ?? []

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

  const monthEvents = useMemo(() => {
    if (!events.data) return []
    return events.data.filter(e => {
      const d = new Date(e.event_date)
      return d.getUTCMonth() === monthIdx && d.getUTCFullYear() === 2026
    }).sort((a, b) => a.event_date.localeCompare(b.event_date))
  }, [events.data, monthIdx])

  const totals = useMemo(() => {
    const events2026 = events.data?.filter(e => new Date(e.event_date).getUTCFullYear() === 2026) ?? []
    const worked = events2026.filter(e => (e.paid_amount ?? 0) > 0 || e.paid)
    const paid = worked.filter(e => e.paid).length * valorPorVisita
    const pending = worked.filter(e => !e.paid).length * valorPorVisita
    return { pending, paid, days: worked.length }
  }, [events.data, valorPorVisita])

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  return (
    <div className="p-4 space-y-4 pb-28">
      <header>
        <h2 className="text-xl font-bold">{name}</h2>
        <p className="text-xs text-slate-500">Diarista · {diaria !== null ? `R$ ${diaria} diária + R$ ${transp} transporte` : 'valor não configurado'}</p>
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
            <p className="text-[10px] uppercase font-bold text-amber-900 tracking-wider">PIX da {name}</p>
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
        <strong className="text-amber-900">Como funciona:</strong> {name} marca que veio. Você confirma o pagamento. Valor: <strong>R$ {valorPorVisita.toFixed(2)}</strong> tudo incluso.
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
            <span className="text-center">{name} veio</span>
            <span className="text-center">Pagar</span>
            <span className="text-right">Acum.</span>
          </div>
          {monthEvents.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">Nenhum evento neste mês.</p>
          ) : (
            monthEvents.map(e => {
              const d = new Date(e.event_date)
              const dayStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
              const worked = (e.paid_amount ?? 0) > 0 || e.paid
              return (
                <div
                  key={e.id}
                  className="grid items-center px-3 py-2"
                  style={{ gridTemplateColumns: '50px 30px 1fr 1fr 70px', gap: '4px', opacity: e.paid ? 0.5 : 1 }}
                >
                  <span className="text-sm">{dayStr}</span>
                  <span className="text-[9px] font-bold bg-blue-100 text-blue-700 rounded px-1 py-0.5 text-center">Ter</span>
                  <div className="flex justify-center">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${worked ? 'text-white' : 'bg-slate-100 text-slate-400'}`} style={worked ? { background: '#795548' } : {}}>
                      {worked ? '✓ veio' : 'veio?'}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    {worked && (
                      <button
                        onClick={() => toggle.mutate({ id: e.id, paid: !e.paid, amount: valorPorVisita })}
                        className={`text-[10px] px-2 py-1 rounded-full font-bold ${e.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}
                      >
                        {e.paid ? '✓ pago' : `R$${valorPorVisita}`}
                      </button>
                    )}
                    {!worked && <span className="text-xs text-slate-300">—</span>}
                  </div>
                  <span className="text-xs font-bold text-right text-rose-600">
                    {worked && !e.paid ? `R$${valorPorVisita}` : ''}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <section>
        <h3 className="text-xs uppercase font-bold mb-2" style={{ color: '#795548' }}>
          Tarefas — {MESES_FULL[monthIdx]}
        </h3>
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
          {tasks.length === 0 && <p className="text-sm text-slate-400">Sem tarefas configuradas.</p>}
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 py-1.5 px-1 text-sm">
              <span className="w-4 h-4 rounded border-2 border-amber-800 flex-shrink-0" style={{ background: t.done ? '#795548' : 'transparent' }} />
              <span className={t.done ? 'line-through text-slate-400' : ''}>{t.t}</span>
            </div>
          ))}
          <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 mt-2">
            Editar tarefas em Config → "Tarefas da {name}"
          </p>
        </div>
      </section>
    </div>
  )
}
