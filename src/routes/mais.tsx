import { createFileRoute, Link } from '@tanstack/react-router'
import { Dog, Calendar, FileText, Settings as SettingsIcon } from 'lucide-react'

export const Route = createFileRoute('/mais')({
  component: MaisPage
})

function MaisPage() {
  const items = [
    { to: '/pets', icon: Dog, label: 'Pets', desc: 'Cachorro, gato, rotina', color: '#10b981' },
    { to: '/izete', icon: Calendar, label: 'Izete', desc: 'Calendário da diarista', color: '#f59e0b' },
    { to: '/os', icon: FileText, label: 'OS', desc: 'Ordens de serviço', color: '#6366f1' },
    { to: '/config', icon: SettingsIcon, label: 'Config', desc: 'Valores fixos, WhatsApp', color: '#64748b' }
  ]
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-xl font-bold">Mais</h2>
      <ul className="space-y-2">
        {items.map(i => (
          <li key={i.to}>
            <Link
              to={i.to}
              className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4 active:scale-[0.98] transition"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${i.color}22` }}>
                <i.icon className="w-5 h-5" style={{ color: i.color }} />
              </div>
              <div className="flex-1">
                <p className="font-bold">{i.label}</p>
                <p className="text-xs text-slate-500">{i.desc}</p>
              </div>
              <span className="text-slate-300">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
