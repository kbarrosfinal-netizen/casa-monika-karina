import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useProducts, useStores } from '@/hooks/useProducts'
import { useShoppingList, useToggleMissing } from '@/hooks/useShoppingList'
import { useProductPrices } from '@/hooks/useProductPrices'
import { findCheapestPerProduct, groupByStore } from '@/lib/cheapest'
import { StoreSection } from '@/components/shopping/StoreSection'
import { ArrowLeft, Share2 } from 'lucide-react'
import { buildWhatsAppMessage } from '@/lib/whatsapp'

export const Route = createFileRoute('/compras_/mercado')({
  component: MercadoPage
})

function MercadoPage() {
  const navigate = useNavigate()
  const products = useProducts()
  const stores = useStores()
  const shopping = useShoppingList()
  const toggle = useToggleMissing()
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const missingItems = useMemo(() => {
    if (!products.data || !shopping.data) return []
    const pById = new Map(products.data.map(p => [p.id, p]))
    return shopping.data
      .filter(i => i.is_missing)
      .map(i => {
        const p = pById.get(i.product_id)
        if (!p) return null
        return {
          id: i.id,
          productId: p.id,
          name: p.name,
          icon: p.icon,
          unit: p.unit,
          quantity: i.quantity
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [products.data, shopping.data])

  const prices = useProductPrices(missingItems.map(i => i.productId))

  const groups = useMemo(() => {
    if (!stores.data || !prices.data) return []
    const cheapest = findCheapestPerProduct(prices.data, stores.data)
    return groupByStore(missingItems, cheapest, stores.data)
  }, [missingItems, prices.data, stores.data])

  const totalGeral = groups.reduce((acc, g) => acc + g.total, 0)

  const onCheck = (productId: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const onShareWhatsApp = () => {
    const text = buildWhatsAppMessage(groups, totalGeral)
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const onMarkBought = async () => {
    await Promise.all(
      Array.from(checked).map(productId => toggle.mutateAsync({ productId, isMissing: false }))
    )
    setChecked(new Set())
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/compras' })} aria-label="Voltar" className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Modo mercado</h2>
          <p className="text-xs text-slate-500">Lista agrupada por onde está mais barato</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold">R$ {totalGeral.toFixed(2)}</p>
          <p className="text-[10px] uppercase text-slate-400">total estimado</p>
        </div>
      </header>

      {missingItems.length === 0 ? (
        <p className="text-center text-slate-500 py-10">Nada faltando. 💜</p>
      ) : (
        <>
          <div className="space-y-3">
            {groups.map(g => (
              <StoreSection
                key={g.store?.id ?? 'no-store'}
                store={g.store}
                items={g.items}
                total={g.total}
                checked={checked}
                onCheck={onCheck}
                onRemove={(productId, name) => {
                  if (window.confirm(`Remover ${name} da lista de faltando?`)) {
                    toggle.mutate({ productId, isMissing: false })
                  }
                }}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-2 sticky bottom-20 bg-slate-50/80 backdrop-blur py-2 -mx-4 px-4">
            <button
              onClick={onShareWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-md"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
            >
              <Share2 className="w-5 h-5" />
              WhatsApp
            </button>
            <button
              onClick={onMarkBought}
              disabled={checked.size === 0}
              className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white disabled:opacity-40"
            >
              Marcar {checked.size > 0 ? `${checked.size}` : ''} comprado{checked.size > 1 ? 's' : ''}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
