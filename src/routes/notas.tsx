import { createFileRoute, Link } from '@tanstack/react-router'
import { useReceipts } from '@/hooks/useReceipts'
import { Camera, Clock, CheckCircle2, XCircle } from 'lucide-react'

export const Route = createFileRoute('/notas')({
  component: NotasPage
})

function NotasPage() {
  const { data: receipts, isLoading } = useReceipts()

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '--'

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Notas</h2>
          <p className="text-xs text-slate-500">Histórico de compras</p>
        </div>
        <Link
          to="/notas/fotografar"
          className="flex items-center gap-1 py-2 px-3 rounded-xl text-white font-bold text-sm shadow-md"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        >
          <Camera className="w-4 h-4" />
          Nova
        </Link>
      </header>

      {isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {receipts && receipts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <Camera className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-600 font-medium">Nenhuma nota ainda</p>
          <p className="text-xs text-slate-400 mt-1">Fotografe sua primeira nota pra povoar preços e histórico</p>
        </div>
      )}

      {receipts && receipts.length > 0 && (
        <ul className="space-y-2">
          {receipts.map(r => (
            <li key={r.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex gap-3">
              <img
                src={r.photo_url}
                alt="Nota"
                className="w-16 h-16 object-cover rounded-lg shrink-0 bg-slate-100"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm" style={{ color: r.store?.color ?? '#0f172a' }}>
                  {r.store?.name ?? 'Processando…'}
                </p>
                <p className="text-xs text-slate-500">{fmtDate(r.purchased_at ?? r.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold">{r.total ? `R$ ${r.total.toFixed(2)}` : '—'}</p>
                <div className="flex items-center justify-end gap-1 text-[10px] mt-1">
                  {r.status === 'processing' && <><Clock className="w-3 h-3 text-amber-500" /><span className="text-amber-600">processando</span></>}
                  {r.status === 'done' && <><CheckCircle2 className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">ok</span></>}
                  {r.status === 'failed' && <><XCircle className="w-3 h-3 text-rose-500" /><span className="text-rose-600">falha</span></>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
