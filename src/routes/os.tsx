import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Plus, Printer, Trash2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useServiceOrders, useAddServiceOrder, useDeleteServiceOrder } from '@/hooks/useServiceOrders'

export const Route = createFileRoute('/os')({
  component: OSPage
})

function OSPage() {
  const navigate = useNavigate()
  const { data: orders, isLoading } = useServiceOrders()
  const addOS = useAddServiceOrder()
  const deleteOS = useDeleteServiceOrder()
  const [formOpen, setFormOpen] = useState(false)

  const [osNumber, setOsNumber] = useState('')
  const [client, setClient] = useState('')
  const [document, setDocument] = useState('')
  const [description, setDescription] = useState('')
  const [total, setTotal] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => { setOsNumber(''); setClient(''); setDocument(''); setDescription(''); setTotal('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!osNumber.trim() || !client.trim()) return
    setSubmitting(true)
    await addOS.mutateAsync({
      os_number: osNumber.trim(),
      client: client.trim(),
      document: document || null,
      description: description || null,
      total: total ? parseFloat(total.replace(',', '.')) : null
    })
    resetForm()
    setFormOpen(false)
    setSubmitting(false)
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/mais' })} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Ordens de Serviço</h2>
          <p className="text-xs text-slate-500">Gerencie suas OS</p>
        </div>
        <button
          onClick={() => setFormOpen(v => !v)}
          className="flex items-center gap-1 py-2 px-3 rounded-xl text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <Plus className="w-4 h-4" /> Nova OS
        </button>
      </header>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="font-bold text-slate-800">Nova OS</h3>
          <div className="grid grid-cols-2 gap-2">
            <input value={osNumber} onChange={e => setOsNumber(e.target.value)} placeholder="Nº OS*" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input value={total} onChange={e => setTotal(e.target.value)} placeholder="Valor total (R$)" inputMode="decimal" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input value={client} onChange={e => setClient(e.target.value)} placeholder="Cliente*" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <input value={document} onChange={e => setDocument(e.target.value)} placeholder="CPF/CNPJ" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do serviço" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setFormOpen(false); resetForm() }} className="flex-1 py-2 rounded-lg border border-slate-300 text-sm">Cancelar</button>
            <button type="submit" disabled={submitting || !osNumber.trim() || !client.trim()} className="flex-1 py-2 rounded-lg text-white font-bold text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {submitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {orders && orders.length === 0 && !formOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-600 font-medium">Nenhuma OS cadastrada</p>
          <p className="text-xs text-slate-400 mt-1">Toque em "+ Nova OS" para começar</p>
        </div>
      )}

      <ul className="space-y-2">
        {orders?.map(os => (
          <li key={os.id} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">OS #{os.os_number}</span>
                  {os.total && <span className="font-bold text-slate-800">R$ {os.total.toFixed(2)}</span>}
                </div>
                <p className="font-semibold mt-1">{os.client}</p>
                {os.document && <p className="text-xs text-slate-400">{os.document}</p>}
                {os.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{os.description}</p>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                  title="Gerar PDF (imprimir)"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => { if (confirm(`Remover OS #${os.os_number}?`)) deleteOS.mutate(os.id) }}
                  className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
