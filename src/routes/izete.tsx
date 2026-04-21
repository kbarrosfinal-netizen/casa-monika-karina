import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useIzete, useToggleIzeteDay } from '@/hooks/useIzete'
import type { IzeteEvent } from '@/hooks/useIzete'

export const Route = createFileRoute('/izete')({
  component: IzetePage
})

const DEFAULT_DIARIA = 150

function IzetePage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  const { data: events } = useIzete(monthStr)
  const toggle = useToggleIzeteDay()

  const eventByDate = new Map<string, IzeteEvent>((events ?? []).map(e => [e.date, e]))

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const monthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const totalPaid = (events ?? []).filter(e => e.paid).reduce((s, e) => s + e.amount, 0)
  const totalScheduled = (events ?? []).reduce((s, e) => s + e.amount, 0)

  const handleDayTap = (day: number) => {
    const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`
    const existing = eventByDate.get(dateStr)
    toggle.mutate({ date: dateStr, currentEvent: existing, amount: DEFAULT_DIARIA })
  }

  const dayColor = (day: number) => {
    const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`
    const ev = eventByDate.get(dateStr)
    if (!ev) return 'bg-slate-100 text-slate-500'
    if (ev.paid) return 'bg-emerald-500 text-white font-bold'
    return 'bg-amber-400 text-white font-bold'
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/mais' })} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold flex-1">Izete</h2>
      </header>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-3">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-[10px] uppercase text-slate-400 font-bold">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
          <button
            key={day}
            onClick={() => handleDayTap(day)}
            disabled={toggle.isPending}
            className={`aspect-square rounded-xl flex items-center justify-center text-sm transition active:scale-95 ${dayColor(day)}`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Pago</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Agendado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 inline-block" /> Vazio</span>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <h3 className="text-xs uppercase text-slate-500 font-bold">Resumo do mês</h3>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total pago</span>
          <span className="font-bold text-emerald-600">R$ {totalPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total previsto</span>
          <span className="font-bold text-amber-600">R$ {totalScheduled.toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-slate-400">Diária padrão: R$ {DEFAULT_DIARIA}</p>
      </div>
    </div>
  )
}
