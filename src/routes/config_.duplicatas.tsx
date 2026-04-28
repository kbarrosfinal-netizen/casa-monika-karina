import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { Product } from '@/lib/types'

export const Route = createFileRoute('/config_/duplicatas')({
  component: DuplicatasPage
})

interface DupGroup {
  token: string
  products: Product[]
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function mainToken(s: string): string {
  const n = normalize(s)
  const skip = new Set(['de', 'do', 'da', 'em', 'com', 'sem', 'pra', 'para', 'kg', 'g', 'ml', 'l', 'un', 'cx', 'pct'])
  const tokens = n.split(/[\s\-/]+/).filter(t => t.length >= 3 && !skip.has(t) && !/^\d+$/.test(t))
  return tokens[0] ?? ''
}

function findDuplicateGroups(products: Product[]): DupGroup[] {
  const byToken = new Map<string, Product[]>()
  for (const p of products) {
    const tk = mainToken(p.name)
    if (!tk) continue
    const list = byToken.get(tk) ?? []
    list.push(p)
    byToken.set(tk, list)
  }
  return Array.from(byToken.entries())
    .filter(([, items]) => items.length >= 2)
    .map(([token, products]) => ({ token, products: products.sort((a, b) => a.name.length - b.name.length) }))
    .sort((a, b) => b.products.length - a.products.length)
}

function DuplicatasPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [merging, setMerging] = useState<string | null>(null)

  const products = useQuery({
    queryKey: ['products', 'all-for-dedup'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select('*').order('name')
      if (error) throw error
      return data ?? []
    }
  })

  const groups = useMemo(
    () => products.data ? findDuplicateGroups(products.data) : [],
    [products.data]
  )

  const merge = useMutation({
    mutationFn: async ({ keepId, dropId }: { keepId: string; dropId: string }) => {
      const { error: rpcErr } = await supabase.rpc('merge_products', { keep_id: keepId, drop_id: dropId })
      if (!rpcErr) return

      // Fallback: client-side merge se a function ainda não está aplicada no banco.
      // Não é atômico mas o dado fica consistente se cada update der certo.
      console.warn('merge_products RPC indisponível, usando fallback client-side', rpcErr.message)

      await supabase.from('receipt_items').update({ product_id: keepId }).eq('product_id', dropId)
      await supabase.from('product_prices').update({ product_id: keepId }).eq('product_id', dropId)

      const { data: existsShop } = await supabase.from('shopping_list').select('id').eq('product_id', keepId).maybeSingle()
      if (existsShop) {
        await supabase.from('shopping_list').delete().eq('product_id', dropId)
      } else {
        await supabase.from('shopping_list').update({ product_id: keepId }).eq('product_id', dropId)
      }

      const { data: keepMonths } = await supabase.from('monthly_list').select('month').eq('product_id', keepId)
      const keepMonthSet = new Set((keepMonths ?? []).map((r: { month: string }) => r.month))
      const { data: dropMonths } = await supabase.from('monthly_list').select('id,month').eq('product_id', dropId)
      for (const row of (dropMonths ?? []) as Array<{ id: string; month: string }>) {
        if (keepMonthSet.has(row.month)) {
          await supabase.from('monthly_list').delete().eq('id', row.id)
        } else {
          await supabase.from('monthly_list').update({ product_id: keepId }).eq('id', row.id)
        }
      }

      const { error: delErr } = await supabase.from('products').delete().eq('id', dropId)
      if (delErr) throw delErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['shopping_list'] })
      qc.invalidateQueries({ queryKey: ['monthly_list'] })
      qc.invalidateQueries({ queryKey: ['product_prices'] })
      setMerging(null)
    },
    onError: (e: Error) => {
      alert(`Falha ao mesclar: ${e.message}`)
      setMerging(null)
    }
  })

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/config' })} aria-label="Voltar" className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Mesclar duplicatas</h2>
          <p className="text-xs text-slate-500">Produtos com nomes parecidos no catálogo</p>
        </div>
      </header>

      {products.isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {!products.isLoading && groups.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <Check className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
          <p className="text-slate-700 font-bold">Nenhuma duplicata detectada 🎉</p>
          <p className="text-xs text-slate-500 mt-1">{products.data?.length ?? 0} produtos no catálogo</p>
        </div>
      )}

      {groups.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          Encontramos <b>{groups.length} grupos</b> de produtos parecidos. Em cada grupo, escolha qual nome
          manter e clique <b>"Manter este"</b>. Os outros vão ser mesclados (histórico de preços e listas
          são preservados).
        </div>
      )}

      <div className="space-y-3">
        {groups.map(group => (
          <section key={group.token} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <header className="px-4 py-2 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{group.token}</p>
              <p className="text-[10px] text-slate-500">{group.products.length} produtos parecidos</p>
            </header>
            <ul className="divide-y divide-slate-100">
              {group.products.map(keepCandidate => {
                const others = group.products.filter(p => p.id !== keepCandidate.id)
                return (
                  <li key={keepCandidate.id} className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{keepCandidate.icon ?? '🛒'}</span>
                      <span className="flex-1 text-sm font-bold">{keepCandidate.name}</span>
                      <button
                        type="button"
                        disabled={merge.isPending || merging !== null}
                        onClick={async () => {
                          if (!window.confirm(
                            `Manter "${keepCandidate.name}" e mesclar ${others.length} duplicata${others.length === 1 ? '' : 's'} (${others.map(p => p.name).join(', ')})?`
                          )) return
                          setMerging(keepCandidate.id)
                          for (const drop of others) {
                            await merge.mutateAsync({ keepId: keepCandidate.id, dropId: drop.id })
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold disabled:opacity-50 active:scale-95 transition flex items-center gap-1"
                      >
                        {merging === keepCandidate.id ? 'Mesclando…' : <>Manter este <ArrowRight className="w-3 h-3" /></>}
                      </button>
                    </div>
                    {others.length > 0 && (
                      <div className="pl-7 space-y-0.5">
                        {others.map(other => (
                          <p key={other.id} className="text-[11px] text-slate-500">
                            ↳ vai virar este: <span className="line-through">{other.name}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
