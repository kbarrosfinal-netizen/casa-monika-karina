import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
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

const DEFAULTS: Settings = {
  ticket_value: 3000,
  diaria_value: 150,
  transp_value: 10,
  whatsapp_phone: ''
}

function ConfigPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 'household').maybeSingle().then(({ data }) => {
      if (data) {
        setSettings({
          ticket_value: data.ticket_value ?? DEFAULTS.ticket_value,
          diaria_value: data.diaria_value ?? DEFAULTS.diaria_value,
          transp_value: data.transp_value ?? DEFAULTS.transp_value,
          whatsapp_phone: data.whatsapp_phone ?? ''
        })
      }
      setLoading(false)
    })
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 'household', ...settings })
    setSaving(false)
    if (error) {
      showToast('Erro ao salvar: ' + error.message)
    } else {
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

  const field = (label: string, key: keyof Settings, inputMode: 'numeric' | 'decimal' | 'text' = 'decimal') => (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
      <input
        value={settings[key]}
        onChange={e => setSettings(s => ({ ...s, [key]: inputMode === 'text' ? e.target.value : e.target.value }))}
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

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <h3 className="font-bold text-slate-800">Valores fixos</h3>
        {field('Vale-refeição (R$)', 'ticket_value', 'decimal')}
        {field('Diária Izete (R$)', 'diaria_value', 'decimal')}
        {field('Transporte por dia (R$)', 'transp_value', 'decimal')}
        {field('WhatsApp (com DDD)', 'whatsapp_phone', 'text')}
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
    </div>
  )
}
