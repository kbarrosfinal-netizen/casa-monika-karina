import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useReceiptUpload } from '@/hooks/useReceiptUpload'
import { useStores } from '@/hooks/useProducts'
import { supabase } from '@/lib/supabase'
import { Camera, ArrowLeft, CheckCircle2, AlertCircle, Edit, ImageIcon } from 'lucide-react'

export const Route = createFileRoute('/notas/fotografar')({
  component: FotografarPage
})

function FotografarPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [mode, setMode] = useState<'choose' | 'photo' | 'manual'>('choose')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const upload = useReceiptUpload()

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setMode('photo')
  }

  const onSubmit = async () => {
    if (!file) return
    try {
      await upload.mutateAsync(file)
    } catch {
      /* estado em upload.isError */
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setMode('choose')
    upload.reset()
  }

  return (
    <div className="p-4 space-y-4 min-h-screen pb-28">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/notas' })} aria-label="Voltar" className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Nova nota</h2>
      </header>

      {mode === 'choose' && (
        <div className="space-y-3">
          {/* Hidden file inputs — controlados via ref */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFile}
            className="sr-only"
            aria-hidden="true"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="sr-only"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-cyan-400 bg-gradient-to-br from-cyan-50 to-blue-50 flex flex-col items-center justify-center gap-3 text-slate-600 active:scale-[0.98] transition"
          >
            <Camera className="w-16 h-16" style={{ color: '#06b6d4' }} />
            <span className="font-bold text-lg text-slate-800">Abrir câmera</span>
            <span className="text-sm">e fotografar a nota</span>
            <span className="text-[11px] text-slate-400 mt-3 px-6 text-center leading-relaxed">
              A foto é lida automaticamente (itens, loja, valor) e apagada depois do processamento.
            </span>
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 flex items-center justify-center gap-2 text-slate-700 font-semibold text-sm active:scale-[0.98] transition"
          >
            <ImageIcon className="w-5 h-5" />
            Escolher da galeria
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-3 text-xs text-slate-400">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 flex items-center justify-center gap-2 text-slate-700 font-semibold text-sm active:scale-[0.98] transition"
          >
            <Edit className="w-5 h-5" />
            Lançar nota manualmente
          </button>
        </div>
      )}

      {mode === 'photo' && preview && (
        <div className="space-y-3">
          <img src={preview} alt="Nota" className="w-full rounded-2xl" />
          {upload.isSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-emerald-900">Nota processada!</p>
                <p className="text-sm text-emerald-700">
                  {upload.data.items} {upload.data.items === 1 ? 'item' : 'itens'} · R$ {upload.data.total?.toFixed(2)}
                </p>
              </div>
            </div>
          )}
          {upload.isError && (
            <div className="rounded-xl bg-rose-50 border border-rose-300 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                <p className="text-sm text-rose-900 font-semibold">Falha ao processar</p>
              </div>
              <p className="text-xs text-rose-700">{(upload.error as Error).message}</p>
              <button
                onClick={() => setMode('manual')}
                className="text-xs underline text-rose-700 font-bold"
              >
                Lançar manualmente →
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={reset}
              disabled={upload.isPending}
              className="flex-1 py-3 rounded-xl border border-slate-300 font-bold"
            >
              Refazer
            </button>
            {!upload.isSuccess && (
              <button
                onClick={onSubmit}
                disabled={upload.isPending}
                className="flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
              >
                {upload.isPending ? 'Processando…' : 'Enviar nota'}
              </button>
            )}
            {upload.isSuccess && (
              <button
                onClick={() => navigate({ to: '/notas' })}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold"
              >
                Ver histórico
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'manual' && <ManualReceiptForm onCancel={reset} onSaved={() => navigate({ to: '/notas' })} />}
    </div>
  )
}

function ManualReceiptForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const stores = useStores()
  const qc = useQueryClient()
  const [storeId, setStoreId] = useState('')
  const [storeNew, setStoreNew] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [total, setTotal] = useState('')
  const [items, setItems] = useState('')
  const [forma, setForma] = useState<'Ticket' | 'Débito' | 'Crédito' | 'Dinheiro' | 'Pix'>('Ticket')

  const save = useMutation({
    mutationFn: async () => {
      const totalNum = parseFloat(total.replace(',', '.'))
      if (isNaN(totalNum) || totalNum <= 0) throw new Error('Informe um valor total válido')

      // resolve store
      let finalStoreId = storeId
      if (!finalStoreId && storeNew.trim()) {
        const { data: s, error: sErr } = await supabase
          .from('stores')
          .insert({ name: storeNew.trim(), color: '#64748b', order: 99 })
          .select().single()
        if (sErr) throw sErr
        finalStoreId = s.id
      }
      if (!finalStoreId) throw new Error('Selecione ou digite uma loja')

      // create receipt
      const { data: receipt, error: rErr } = await supabase.from('receipts').insert({
        photo_url: '',
        store_id: finalStoreId,
        total: totalNum,
        purchased_at: `${date}T12:00:00Z`,
        status: 'done',
        ocr_raw: items,
        ocr_json: { manual: true, forma, obs: items }
      }).select().single()
      if (rErr) throw rErr

      // parse items, create products if needed, add to monthly list
      const itemNames = items.split(',').map(s => s.trim()).filter(Boolean)
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

      for (const name of itemNames) {
        const { data: existing } = await supabase.from('products')
          .select('id').ilike('name', name).limit(1).maybeSingle()

        let pid = existing?.id
        if (!pid) {
          const display = name.charAt(0).toUpperCase() + name.slice(1)
          const { data: np } = await supabase.from('products').insert({
            name: display,
            icon: guessIcon(name),
            unit: 'un'
          }).select().single()
          pid = np?.id
        }

        if (pid) {
          await supabase.from('receipt_items').insert({
            receipt_id: receipt.id,
            product_id: pid,
            product_name_raw: name,
            quantity: 1,
            unit_price: null,
            total_price: null
          })

          const { data: existsMonth } = await supabase.from('monthly_list')
            .select('id').eq('product_id', pid).eq('month', currentMonth).maybeSingle()
          if (!existsMonth) {
            await supabase.from('monthly_list').insert({
              product_id: pid, month: currentMonth, quantity: 1,
              suggested: false, accepted: true
            })
          }
        }
      }

      // finance entry
      await supabase.from('finance_entries').insert({
        type: 'expense',
        amount: totalNum,
        category: 'supermercado',
        source: 'receipt',
        receipt_id: receipt.id,
        date,
        note: `${storeNew || stores.data?.find(s => s.id === finalStoreId)?.name || ''} — ${forma}`
      })

      return receipt
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['finance_entries'] })
      qc.invalidateQueries({ queryKey: ['monthly_list'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      onSaved()
    }
  })

  return (
    <form
      onSubmit={e => { e.preventDefault(); save.mutate() }}
      className="space-y-3 bg-white rounded-2xl border border-slate-200 p-4"
    >
      <h3 className="font-bold text-sm text-slate-700 pb-1 border-b border-slate-100">Lançar nota manualmente</h3>

      <label className="block">
        <span className="text-xs font-bold text-slate-500">Loja</span>
        <select
          value={storeId}
          onChange={e => { setStoreId(e.target.value); setStoreNew('') }}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">— selecione —</option>
          {stores.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          <option value="__new__">+ Nova loja…</option>
        </select>
        {storeId === '__new__' && (
          <input
            autoFocus
            value={storeNew}
            onChange={e => { setStoreNew(e.target.value); setStoreId('') }}
            placeholder="Nome da nova loja"
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        )}
      </label>

      <label className="block">
        <span className="text-xs font-bold text-slate-500">Data</span>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-slate-500">Valor total (R$)</span>
        <input
          value={total}
          onChange={e => setTotal(e.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold text-slate-500">Forma de pagamento</span>
        <select
          value={forma}
          onChange={e => setForma(e.target.value as typeof forma)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option>Ticket</option>
          <option>Débito</option>
          <option>Crédito</option>
          <option>Dinheiro</option>
          <option>Pix</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-bold text-slate-500">Itens (separados por vírgula)</span>
        <textarea
          value={items}
          onChange={e => setItems(e.target.value)}
          rows={3}
          placeholder="Ex: Arroz, Feijão, Leite, Pão"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
        />
        <span className="text-[10px] text-slate-500 mt-1 block">
          Itens novos entram automaticamente na lista fixa de compras.
        </span>
      </label>

      {save.isError && (
        <p className="text-sm text-rose-600">{(save.error as Error).message}</p>
      )}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-slate-300 text-sm font-bold">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={save.isPending}
          className="flex-1 py-2.5 rounded-lg text-white font-bold text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        >
          {save.isPending ? 'Salvando…' : 'Salvar nota'}
        </button>
      </div>
    </form>
  )
}

function guessIcon(name: string): string {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (n.includes('leite')) return '🥛'
  if (n.includes('pao') || n.includes('pão')) return '🍞'
  if (n.includes('banana')) return '🍌'
  if (n.includes('maca')) return '🍎'
  if (n.includes('abacate')) return '🥑'
  if (n.includes('arroz')) return '🍚'
  if (n.includes('feijao') || n.includes('feijão')) return '🫘'
  if (n.includes('carne') || n.includes('lagarto')) return '🥩'
  if (n.includes('frango')) return '🍗'
  if (n.includes('peixe') || n.includes('salmao') || n.includes('salmão')) return '🐟'
  if (n.includes('queijo')) return '🧀'
  if (n.includes('ovo')) return '🥚'
  if (n.includes('iogurte')) return '🥣'
  if (n.includes('tomate')) return '🍅'
  if (n.includes('cebola')) return '🧅'
  if (n.includes('batata')) return '🥔'
  if (n.includes('limao') || n.includes('limão')) return '🍋'
  if (n.includes('cafe') || n.includes('café')) return '☕'
  if (n.includes('agua') || n.includes('água')) return '💧'
  if (n.includes('refri') || n.includes('sprite')) return '🥤'
  if (n.includes('sabao') || n.includes('sabão')) return '🧺'
  if (n.includes('detergente')) return '🧴'
  if (n.includes('papel')) return '🧻'
  return '🛒'
}
