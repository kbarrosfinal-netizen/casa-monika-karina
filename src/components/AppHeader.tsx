import { useSyncStatus } from '@/hooks/useSyncStatus'

export function AppHeader() {
  const status = useSyncStatus()
  const statusLabel = status === 'ok' ? 'sync ok' : status === 'offline' ? 'offline' : 'sincronizando...'
  const statusColor = status === 'ok' ? 'text-emerald-600' : status === 'offline' ? 'text-amber-600' : 'text-sky-600'

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">Casa &amp; Família</h1>
          <p className="text-xs text-slate-500">Olá 💜</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
    </header>
  )
}
