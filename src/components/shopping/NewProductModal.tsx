import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/types'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
}

const ICON_SUGGESTIONS = ['📦', '🍪', '🧃', '🥫', '🍕', '🧀', '🍊', '🍇', '🌶️', '🧅', '🥒', '🫘', '🍚', '🍝', '🧂', '🍯', '☕', '🧴', '🧽', '🧻', '🪥', '🧼', '💊', '🐾']

export function NewProductModal({ open, onClose, categories }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [unit, setUnit] = useState('un')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Nome obrigatório')

      const { data: product, error } = await supabase
        .from('products')
        .insert({ name: trimmed, icon, category_id: categoryId, unit })
        .select()
        .single()
      if (error) throw error

      const month = new Date().toISOString().slice(0, 7) + '-01'
      await supabase.from('monthly_list').insert({
        product_id: product.id,
        month,
        quantity: 1,
        suggested: false,
        accepted: true
      })

      await supabase.from('shopping_list').insert({
        product_id: product.id,
        is_missing: true,
        quantity: 1
      })
      return product
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['shopping_list'] })
      qc.invalidateQueries({ queryKey: ['monthly_list'] })
      setName('')
      setIcon('📦')
      onClose()
    }
  })

  useEffect(() => {
    if (open) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [open])

  useEffect(() => {
    if (categoryId === '' && categories[0]) setCategoryId(categories[0].id)
  }, [categories, categoryId])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-2xl p-0 w-[min(92vw,420px)] backdrop:bg-black/40"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          create.mutate()
        }}
        className="p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Novo produto</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Nome</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="ex: Leite condensado"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Categoria</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </label>

        <div>
          <span className="text-xs font-semibold text-slate-600">Ícone</span>
          <div className="mt-1 grid grid-cols-8 gap-1">
            {ICON_SUGGESTIONS.map(em => (
              <button
                type="button"
                key={em}
                onClick={() => setIcon(em)}
                className={`text-xl p-1.5 rounded ${icon === em ? 'bg-violet-100 ring-2 ring-violet-500' : 'bg-slate-50'}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Unidade</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="un, kg, L, dz"
          />
        </label>

        {create.isError && (
          <p className="text-sm text-rose-600">{(create.error as Error).message}</p>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim() || create.isPending}
            className="flex-1 py-2 rounded-lg text-white font-bold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
          >
            {create.isPending ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
