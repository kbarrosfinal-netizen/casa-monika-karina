import { createFileRoute } from '@tanstack/react-router'
import { ShoppingCart, Camera } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomeScreen
})

export function HomeScreen() {
  return (
    <div className="p-4 space-y-3">
      <h2 className="sr-only">Início</h2>

      <button
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg text-base"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        onClick={() => alert('Em breve: marcar item faltando')}
      >
        <ShoppingCart className="w-5 h-5" />
        Marcar item que acabou
      </button>

      <button
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg text-base"
        style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        onClick={() => alert('Em breve: OCR de nota fiscal')}
      >
        <Camera className="w-5 h-5" />
        Fotografar nota fiscal
      </button>

      <div className="grid grid-cols-2 gap-3 pt-4">
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}>
          <p className="text-2xl font-extrabold">R$ —</p>
          <p className="text-xs uppercase tracking-wider opacity-80">Gasto do mês</p>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>
          <p className="text-2xl font-extrabold">—</p>
          <p className="text-xs uppercase tracking-wider opacity-80">Faltando</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500 border border-slate-200 mt-6">
        Dados aparecerão aqui depois que o Plan 2 for implementado.
      </div>
    </div>
  )
}
