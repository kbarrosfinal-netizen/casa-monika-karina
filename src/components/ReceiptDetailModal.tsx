import { useEffect } from 'react'
import { X, Calendar, Store as StoreIcon, CreditCard, Package, Trash2 } from 'lucide-react'
import { useReceiptDetail } from '@/hooks/useReceiptDetail'
import { useDeleteReceipt } from '@/hooks/useDeleteReceipt'
import { useUpdateReceiptForma } from '@/hooks/useUpdateReceiptForma'

const FORMA_OPTIONS = ['Ticket', 'Débito', 'Crédito', 'Dinheiro', 'Pix'] as const

interface Props {
  receiptId: string | null
  onClose: () => void
}

function brl(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

export function ReceiptDetailModal({ receiptId, onClose }: Props) {
  const { data, isLoading, error } = useReceiptDetail(receiptId)
  const del = useDeleteReceipt()
  const updateForma = useUpdateReceiptForma()

  const onDelete = () => {
    if (!data) return
    const label = data.store?.name ? ` de ${data.store.name}` : ''
    if (!window.confirm(`Apagar essa nota${label}? Vai remover a foto, os itens e o lançamento financeiro vinculado. Não pode ser desfeito.`)) return
    del.mutate(
      { id: data.id, photoUrl: data.photo_url },
      { onSuccess: () => onClose() }
    )
  }

  useEffect(() => {
    if (!receiptId) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [receiptId, onClose])

  if (!receiptId) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-4 py-3 flex items-center justify-between gap-2 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-base flex-1">Detalhe da nota</h2>
          {data && (
            <button
              type="button"
              onClick={onDelete}
              disabled={del.isPending}
              aria-label="Apagar nota"
              className="p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-90 disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-md text-slate-400 hover:text-slate-700 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {isLoading && <p className="text-slate-500 text-sm py-8 text-center">Carregando…</p>}
          {error && <p className="text-rose-600 text-sm py-8 text-center">Erro ao carregar: {(error as Error).message}</p>}

          {data && (
            <>
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <StoreIcon className="w-4 h-4 text-slate-400" />
                  <span className="font-bold" style={{ color: data.store?.color ?? '#0f172a' }}>
                    {data.store?.name ?? 'Sem loja'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {data.purchased_at
                    ? new Date(data.purchased_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={data.ocr_json?.forma ?? ''}
                    disabled={updateForma.isPending}
                    onChange={(e) => {
                      const v = e.target.value || null
                      updateForma.mutate({
                        id: data.id,
                        forma: v,
                        storeName: data.store?.name ?? null
                      })
                    }}
                    className="text-sm font-medium border border-slate-200 rounded-md px-2 py-1 bg-white disabled:opacity-50 flex-1"
                    aria-label="Forma de pagamento"
                  >
                    <option value="">— forma de pagamento —</option>
                    {FORMA_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total</span>
                  <span className="text-xl font-extrabold tabular-nums">{brl(data.total)}</span>
                </div>
              </section>

              <section>
                <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Itens · {data.items.length}
                </h3>
                {data.items.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Nenhum item registrado nessa nota.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 bg-slate-50 rounded-lg overflow-hidden">
                    {data.items.map(it => (
                      <li key={it.id} className="px-3 py-2 flex items-center gap-2">
                        <span className="text-lg shrink-0" aria-hidden>{it.product?.icon ?? '🛒'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {it.product?.name ?? it.product_name_raw}
                          </p>
                          {it.product && it.product.name !== it.product_name_raw && (
                            <p className="text-[11px] text-slate-400 truncate" title={it.product_name_raw}>
                              da nota: {it.product_name_raw}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-500 tabular-nums">
                            {Number(it.quantity).toLocaleString('pt-BR')} × {brl(it.unit_price)}
                          </p>
                          <p className="text-sm font-bold tabular-nums">{brl(it.total_price)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {data.ocr_raw && data.status === 'failed' && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-rose-600 mb-2">Erro do OCR</h3>
                  <pre className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 whitespace-pre-wrap break-words">{data.ocr_raw}</pre>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
