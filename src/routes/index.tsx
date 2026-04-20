import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ShoppingCart, Camera } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useShoppingList } from '@/hooks/useShoppingList'

export const Route = createFileRoute('/')({
  component: HomeScreen
})

export function HomeScreen() {
  const navigate = useNavigate()
  const products = useProducts()
  const shopping = useShoppingList()

  const missingCount = shopping.data?.filter(i => i.is_missing).length ?? 0

  const missingPreview = (() => {
    if (!products.data || !shopping.data) return []
    const byId = new Map(products.data.map(p => [p.id, p]))
    return shopping.data
      .filter(i => i.is_missing)
      .slice(0, 3)
      .map(i => byId.get(i.product_id))
      .filter((p): p is NonNullable<typeof p> => !!p)
  })()

  return (
    <div className="p-4 space-y-3">
      <h2 className="sr-only">Início</h2>

      <button
        type="button"
        onClick={() => navigate({ to: '/compras' })}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg text-base"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
      >
        <ShoppingCart className="w-5 h-5" />
        Marcar item que acabou
      </button>

      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg text-base"
        style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        onClick={() => alert('Em breve: OCR de nota fiscal (Plan 3)')}
      >
        <Camera className="w-5 h-5" />
        Fotografar nota fiscal
      </button>

      <div className="grid grid-cols-2 gap-3 pt-4">
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}>
          <p className="text-2xl font-extrabold">R$ —</p>
          <p className="text-xs uppercase tracking-wider opacity-80">Gasto do mês (Plan 3)</p>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: '/compras' })}
          className="rounded-2xl p-4 text-white block text-left"
          style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
        >
          <p className="text-2xl font-extrabold">{missingCount}</p>
          <p className="text-xs uppercase tracking-wider opacity-80">Faltando</p>
        </button>
      </div>

      {missingPreview.length > 0 && (
        <section className="pt-4">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Últimos marcados</h3>
          <ul className="space-y-2">
            {missingPreview.map(p => (
              <li key={p.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3">
                <span className="text-2xl">{p.icon}</span>
                <span className="flex-1 text-sm font-medium">{p.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
