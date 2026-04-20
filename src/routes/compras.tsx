import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useProducts, useCategories } from '@/hooks/useProducts'
import { useShoppingList, useToggleMissing } from '@/hooks/useShoppingList'
import { CategoryGrid } from '@/components/shopping/CategoryGrid'
import { NewProductModal } from '@/components/shopping/NewProductModal'
import { ShoppingBag, Plus } from 'lucide-react'

export const Route = createFileRoute('/compras')({
  component: ComprasPage
})

function ComprasPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const products = useProducts()
  const categories = useCategories()
  const shoppingList = useShoppingList()
  const toggle = useToggleMissing()

  const missingCount = shoppingList.data?.filter(i => i.is_missing).length ?? 0

  if (products.isLoading || categories.isLoading || shoppingList.isLoading) {
    return <div className="p-4 text-center text-slate-500">Carregando…</div>
  }

  if (products.error || categories.error || shoppingList.error) {
    return (
      <div className="p-4 text-center text-rose-600">
        Erro ao carregar dados. Verifique conexão.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Compras</h2>
          <p className="text-xs text-slate-500">
            Toque no produto que acabou em casa
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-rose-600">{missingCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">faltando</p>
        </div>
      </div>

      {missingCount > 0 && (
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold shadow-md"
          style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
          onClick={() => alert('Em breve: Modo mercado (Task 2.6)')}
        >
          <ShoppingBag className="w-5 h-5" />
          Ver lista do mercado
        </button>
      )}

      <CategoryGrid
        categories={categories.data ?? []}
        products={products.data ?? []}
        shoppingList={shoppingList.data ?? []}
        onToggle={(productId, next) => toggle.mutate({ productId, isMissing: next })}
      />

      <button
        type="button"
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        aria-label="Novo produto"
        onClick={() => setModalOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </button>

      <NewProductModal open={modalOpen} onClose={() => setModalOpen(false)} categories={categories.data ?? []} />
    </div>
  )
}
