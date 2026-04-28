import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { enrichMonthlyRetroactive } from '@/lib/enrichMonthly'

export const Route = createFileRoute('/config')({
  component: ConfigPage
})

interface Settings {
  ticket_value: number
  diaria_value: number
  transp_value: number
  whatsapp_phone: string
}

interface DiaristaData {
  diarista_name: string
  diarista_pix: string
  diarista_tasks: Array<{ id: number; t: string; done: boolean }>
}

const DEFAULTS: Settings = {
  ticket_value: 3000,
  diaria_value: 150,
  transp_value: 10,
  whatsapp_phone: ''
}

const DIARISTA_DEFAULTS: DiaristaData = {
  diarista_name: 'Zazá',
  diarista_pix: '',
  diarista_tasks: []
}

function ConfigPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [diarista, setDiarista] = useState<DiaristaData>(DIARISTA_DEFAULTS)
  const [existingData, setExistingData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [newTask, setNewTask] = useState('')

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 'household').maybeSingle().then(({ data }) => {
      if (data) {
        setSettings({
          ticket_value: data.ticket_value ?? DEFAULTS.ticket_value,
          diaria_value: data.diaria_value ?? DEFAULTS.diaria_value,
          transp_value: data.transp_value ?? DEFAULTS.transp_value,
          whatsapp_phone: data.whatsapp_phone ?? ''
        })
        const d = (data.data as Record<string, unknown>) ?? {}
        setExistingData(d)
        setDiarista({
          diarista_name: (d.diarista_name as string) ?? DIARISTA_DEFAULTS.diarista_name,
          diarista_pix: (d.diarista_pix as string) ?? '',
          diarista_tasks: (d.diarista_tasks as DiaristaData['diarista_tasks']) ?? []
        })
      }
      setLoading(false)
    })
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const mergedData = {
      ...existingData,
      diarista_name: diarista.diarista_name,
      diarista_pix: diarista.diarista_pix,
      diarista_tasks: diarista.diarista_tasks
    }
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 'household', ...settings, data: mergedData })
    setSaving(false)
    if (error) {
      showToast('Erro ao salvar: ' + error.message)
    } else {
      setExistingData(mergedData)
      showToast('Configurações salvas!')
    }
  }

  const handleEnrich = async () => {
    setEnriching(true)
    try {
      const count = await enrichMonthlyRetroactive()
      showToast(`${count} sugestões adicionadas à lista mensal`)
    } catch (err) {
      showToast('Erro: ' + (err as Error).message)
    } finally {
      setEnriching(false)
    }
  }

  const addTask = () => {
    const text = newTask.trim()
    if (!text) return
    const maxId = diarista.diarista_tasks.reduce((max, t) => Math.max(max, t.id), 0)
    setDiarista(d => ({
      ...d,
      diarista_tasks: [...d.diarista_tasks, { id: maxId + 1, t: text, done: false }]
    }))
    setNewTask('')
  }

  const removeTask = (id: number) => {
    setDiarista(d => ({ ...d, diarista_tasks: d.diarista_tasks.filter(t => t.id !== id) }))
  }

  const updateTask = (id: number, text: string) => {
    setDiarista(d => ({
      ...d,
      diarista_tasks: d.diarista_tasks.map(t => t.id === id ? { ...t, t: text } : t)
    }))
  }

  const field = (label: string, key: keyof Settings, inputMode: 'numeric' | 'decimal' | 'text' = 'decimal') => (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
      <input
        value={settings[key]}
        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
        inputMode={inputMode}
        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
        disabled={loading}
      />
    </div>
  )

  return (
    <div className="p-4 space-y-4 pb-28">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/mais' })} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Configurações</h2>
      </header>

      {toast && (
        <div className="bg-slate-900 text-white text-sm rounded-xl px-4 py-3 font-medium">
          {toast}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <h3 className="font-bold text-slate-800">Valores fixos</h3>
          {field('Vale-refeição (R$)', 'ticket_value', 'decimal')}
          {field('Diária da diarista (R$)', 'diaria_value', 'decimal')}
          {field('Transporte por dia (R$)', 'transp_value', 'decimal')}
          {field('WhatsApp (com DDD)', 'whatsapp_phone', 'text')}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4" style={{ borderTopColor: '#795548', borderTopWidth: 3 }}>
          <h3 className="font-bold" style={{ color: '#795548' }}>Diarista</h3>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
            <input
              value={diarista.diarista_name}
              onChange={e => setDiarista(d => ({ ...d, diarista_name: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              disabled={loading}
              placeholder="Zazá"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Chave PIX</label>
            <input
              value={diarista.diarista_pix}
              onChange={e => setDiarista(d => ({ ...d, diarista_pix: e.target.value }))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-mono"
              disabled={loading}
              placeholder="telefone, CPF ou e-mail"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tarefas da {diarista.diarista_name || 'Diarista'}</label>
            <div className="space-y-1.5 mb-2">
              {diarista.diarista_tasks.length === 0 && (
                <p className="text-xs text-slate-400">Nenhuma tarefa ainda.</p>
              )}
              {diarista.diarista_tasks.map(t => (
                <div key={t.id} className="flex items-center gap-2">
                  <input
                    value={t.t}
                    onChange={e => updateTask(t.id, e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeTask(t.id)}
                    className="p-1.5 text-rose-400 hover:text-rose-600"
                    aria-label="Remover tarefa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask() } }}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                placeholder="Nova tarefa…"
              />
              <button
                type="button"
                onClick={addTask}
                className="px-3 py-1.5 rounded-lg text-white text-sm font-bold flex items-center gap-1"
                style={{ background: '#795548' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h3 className="font-bold text-slate-800">Enriquecimento retroativo</h3>
        <p className="text-sm text-slate-500">
          Analisa notas fiscais dos últimos 6 meses e adiciona produtos recorrentes como sugestões na lista mensal atual.
        </p>
        <button
          onClick={handleEnrich}
          disabled={enriching}
          className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        >
          <RefreshCw className={`w-4 h-4 ${enriching ? 'animate-spin' : ''}`} />
          {enriching ? 'Processando…' : 'Rodar enriquecimento retroativo da lista mensal'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <h3 className="font-bold text-slate-800">Limpar duplicatas</h3>
        <p className="text-sm text-slate-500">
          Mostra produtos com nomes parecidos no catálogo (ex: "Leite", "Leite Integral", "Leite Parmalat") e
          permite mesclar — o histórico de preços e listas é preservado.
        </p>
        <button
          onClick={() => navigate({ to: '/config/duplicatas' })}
          className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
        >
          Mesclar produtos duplicados
        </button>
      </div>
    </div>
  )
}
