import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { jsPDF } from 'jspdf'

export const Route = createFileRoute('/os')({
  component: OSPage
})

interface OSData {
  unidade: string
  responsavel: string
  cpf: string
  tel: string
  email: string
  prestadorNome: string
  prestadorEmpresa: string
  prestadorCpf: string
  prestadorTel: string
  inicio: string
  inicioH: string
  fim: string
  fimH: string
  servicos: string[]
  autorizados: Array<{ nome: string; cpf: string }>
}

const STORAGE_KEY = 'casa.os.draft'

const DEFAULT_STATE: OSData = {
  unidade: '',
  responsavel: 'Karina',
  cpf: '',
  tel: '',
  email: '',
  prestadorNome: '',
  prestadorEmpresa: '',
  prestadorCpf: '',
  prestadorTel: '',
  inicio: '',
  inicioH: '',
  fim: '',
  fimH: '',
  servicos: ['', '', '', '', ''],
  autorizados: [
    { nome: '', cpf: '' },
    { nome: '', cpf: '' },
    { nome: '', cpf: '' },
    { nome: '', cpf: '' }
  ]
}

function generatePDF(o: OSData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210, ML = 14, MW = 182
  let cy = 10

  const rect = (x: number, y: number, w: number, h: number) => {
    doc.setDrawColor(0); doc.setLineWidth(0.25); doc.rect(x, y, w, h)
  }
  const hdrBox = (label: string, y: number, h: number) => {
    doc.setFillColor(200, 200, 200); doc.setDrawColor(0); doc.setLineWidth(0.25)
    doc.rect(ML, y, MW, h, 'F'); doc.rect(ML, y, MW, h)
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0)
    doc.text(label, PW / 2, y + h * 0.65, { align: 'center' })
  }
  const fieldBox = (label: string, value: string, x: number, y: number, w: number, h: number) => {
    rect(x, y, w, h)
    doc.setFontSize(6); doc.setFont('helvetica', 'normal'); doc.setTextColor(80)
    doc.text(label, x + 1, y + 3.5)
    doc.setFontSize(8); doc.setTextColor(0)
    if (value) doc.text(String(value).substring(0, Math.floor(w / 2.2)), x + 1, y + h - 2)
  }
  const row2 = (l1: string, v1: string, l2: string, v2: string, y: number, h: number) => {
    fieldBox(l1, v1, ML, y, MW / 2, h)
    fieldBox(l2, v2, ML + MW / 2, y, MW / 2, h)
  }
  const fmtD = (d: string) => { const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '' }

  // Header
  rect(ML, cy, MW, 18)
  doc.setFillColor(245, 245, 245); doc.rect(ML, cy, 28, 18, 'F'); rect(ML, cy, 28, 18)
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.text('SOBERANE', ML + 14, cy + 10, { align: 'center' })
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.text('ORDEM DE SERVICO', PW / 2, cy + 7, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.text('CONDOMINIO SOBERANE', PW / 2, cy + 12, { align: 'center' })
  doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text('Aplicavel aos Subcondominios: RESIDENCE | CORPORATE | MALL', PW / 2, cy + 16, { align: 'center' })
  cy += 18

  // DADOS DO CONDOMINO
  hdrBox('DADOS DO CONDOMINO', cy, 6); cy += 6
  row2('Numero da Unidade:', o.unidade, 'Nome do responsavel:', o.responsavel, cy, 9); cy += 9
  row2('Empresa (se houver):', '', 'CPF/CNPJ:', o.cpf, cy, 9); cy += 9
  row2('Telefone para contato:', o.tel, 'E-mail para contato:', o.email, cy, 9); cy += 9

  // RESPONSAVEL PELO SERVICO
  hdrBox('RESPONSAVEL PELO SERVICO', cy, 6); cy += 6
  row2('Nome do responsavel:', o.prestadorNome, 'Empresa:', o.prestadorEmpresa, cy, 9); cy += 9
  row2('CPF/CNPJ:', o.prestadorCpf, 'Telefone para contato:', o.prestadorTel, cy, 9); cy += 9

  // PERIODO DE LIBERACAO
  hdrBox('PERIODO DE LIBERACAO', cy, 6); cy += 6
  const hw = MW / 4
  fieldBox('Inicio:', fmtD(o.inicio), ML, cy, hw, 9)
  fieldBox('as:', o.inicioH || '', ML + hw, cy, hw, 9)
  fieldBox('Fim:', fmtD(o.fim), ML + hw * 2, cy, hw, 9)
  fieldBox('as:', o.fimH || '', ML + hw * 3, cy, hw, 9)
  cy += 9

  // SERVICOS
  hdrBox('SERVICOS A SEREM REALIZADOS', cy, 6); cy += 6
  for (let si = 0; si < 5; si++) {
    rect(ML, cy, MW, 9)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(0)
    doc.text(`${si + 1}.`, ML + 2, cy + 6)
    if (o.servicos[si]) doc.text(o.servicos[si].substring(0, 90), ML + 7, cy + 6)
    cy += 9
  }

  // PRESTADORES
  hdrBox('PRESTADORES AUTORIZADOS PARA EXECUCAO DOS SERVICOS', cy, 6); cy += 6
  for (let pi = 0; pi < 4; pi++) {
    const a = o.autorizados[pi] || { nome: '', cpf: '' }
    row2('Nome:', a.nome || '', 'CPF:', a.cpf || '', cy, 8); cy += 8
  }

  // CLAUSULAS
  hdrBox('CLAUSULAS', cy, 6); cy += 6
  const cls = [
    '1 - Responsabilidade pelos Prestadores: O Condomino declara estar ciente de que todos os profissionais por ele contratados sao de sua exclusiva responsabilidade.',
    '2 - Uso Obrigatorio de EPI: Todos os prestadores devem utilizar EPI adequado conforme as Normas Regulamentadoras.',
    '3 - Atendimento ao Manual de Obras: Todos os servicos realizados deverao obedecer as diretrizes do Manual de Obras do Condominio.',
    '4 - Horarios: Residence: Seg-Sex 08h-17h, Sab 09h-12h. Corporate: Seg-Sex 20h-06h, Sab 13h-06h. Mall: todos os dias 22h-06h.',
    '5 - Carga e Descarga: Armazenamento permitido por ate 72 horas na area designada.',
    '6 - Prazo de analise: Esta OS deve ser apresentada em ate 12h antes do inicio das atividades.'
  ]
  cls.forEach((cl) => {
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(0)
    const lines = doc.splitTextToSize(cl, MW - 4)
    const bh = lines.length * 4 + 3
    rect(ML, cy, MW, bh); doc.text(lines, ML + 2, cy + 4); cy += bh
  })

  // Declaração
  rect(ML, cy, MW, 10)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.text('[ ] Declaro ciencia e concordancia com as clausulas da Ordem de Servico.', ML + 3, cy + 4.5)
  doc.setTextColor(80); doc.setFontSize(7)
  doc.text('Assinatura do Condomino ou Responsavel Legal', PW / 2, cy + 9.5, { align: 'center' })
  cy += 12

  // Recebimento / Autorizacao
  rect(ML, cy, MW / 2, 18); rect(ML + MW / 2, cy, MW / 2, 18)
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(0)
  doc.text('RECEBIMENTO', ML + MW / 4, cy + 5, { align: 'center' })
  doc.text('AUTORIZACAO', ML + MW * 3 / 4, cy + 5, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.text('Concierge: _______________________', ML + 2, cy + 10)
  doc.text('Gerente Operacional: ___________________', ML + MW / 2 + 2, cy + 10)
  doc.text('Data: _______________ As: __________', ML + 2, cy + 16)
  doc.text('Data: _______________ As: __________', ML + MW / 2 + 2, cy + 16)

  doc.save('OrdemServico_Soberane.pdf')
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white'
const labelCls = 'text-xs text-slate-500 mb-1 block'

function Card({ title, borderColor, children }: { title: string; borderColor: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ borderLeft: `4px solid ${borderColor}` }}>
      <div className="px-4 py-2 text-sm font-bold text-white" style={{ background: borderColor }}>
        {title}
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  )
}

function OSPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState<OSData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved) as OSData
    } catch {
      // ignore
    }
    return DEFAULT_STATE
  })

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  function set(field: keyof OSData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setServico(i: number, value: string) {
    setForm(f => {
      const servicos = [...f.servicos]
      servicos[i] = value
      return { ...f, servicos }
    })
  }

  function setAutorizado(i: number, field: 'nome' | 'cpf', value: string) {
    setForm(f => {
      const autorizados = f.autorizados.map((a, idx) => idx === i ? { ...a, [field]: value } : a)
      return { ...f, autorizados }
    })
  }

  function clearForm() {
    setForm(DEFAULT_STATE)
    localStorage.removeItem(STORAGE_KEY)
  }

  function handleGeneratePDF() {
    generatePDF(form)
  }

  return (
    <div className="p-4 space-y-4 pb-28">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/mais' })} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Ordem de Serviço</h2>
          <p className="text-xs text-slate-500">Condomínio Soberane</p>
        </div>
      </header>

      {/* Hint box */}
      <div className="rounded-xl p-3 text-sm text-blue-800 bg-blue-50 border border-blue-200">
        Preencha os dados e toque em <strong>Gerar PDF</strong> para enviar à portaria.
      </div>

      {/* Dados do Condômino */}
      <Card title="Dados do Condômino" borderColor="#1565c0">
        <div>
          <label className={labelCls}>Unidade</label>
          <input className={inputCls} value={form.unidade} onChange={e => set('unidade', e.target.value)} placeholder="Ex: 1204-B" />
        </div>
        <div>
          <label className={labelCls}>Responsável</label>
          <input className={inputCls} value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome do responsável" />
        </div>
        <div>
          <label className={labelCls}>CPF/CNPJ</label>
          <input className={inputCls} value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
        </div>
        <div>
          <label className={labelCls}>Telefone</label>
          <input className={inputCls} value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
        </div>
        <div>
          <label className={labelCls}>E-mail</label>
          <input className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" inputMode="email" />
        </div>
      </Card>

      {/* Responsável pelo Serviço */}
      <Card title="Responsável pelo Serviço" borderColor="#795548">
        <div>
          <label className={labelCls}>Nome</label>
          <input className={inputCls} value={form.prestadorNome} onChange={e => set('prestadorNome', e.target.value)} placeholder="Nome do prestador" />
        </div>
        <div>
          <label className={labelCls}>Empresa</label>
          <input className={inputCls} value={form.prestadorEmpresa} onChange={e => set('prestadorEmpresa', e.target.value)} placeholder="Nome da empresa" />
        </div>
        <div>
          <label className={labelCls}>CPF/CNPJ</label>
          <input className={inputCls} value={form.prestadorCpf} onChange={e => set('prestadorCpf', e.target.value)} placeholder="000.000.000-00" />
        </div>
        <div>
          <label className={labelCls}>Telefone</label>
          <input className={inputCls} value={form.prestadorTel} onChange={e => set('prestadorTel', e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
        </div>
      </Card>

      {/* Período de Liberação */}
      <Card title="Período de Liberação" borderColor="#2e7d32">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Data de início</label>
            <input className={inputCls} type="date" value={form.inicio} onChange={e => set('inicio', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Hora de início</label>
            <input className={inputCls} type="time" value={form.inicioH} onChange={e => set('inicioH', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Data de fim</label>
            <input className={inputCls} type="date" value={form.fim} onChange={e => set('fim', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Hora de fim</label>
            <input className={inputCls} type="time" value={form.fimH} onChange={e => set('fimH', e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Serviços */}
      <Card title="Serviços a Serem Realizados" borderColor="#e65100">
        {form.servicos.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500 w-5 shrink-0">{i + 1}.</span>
            <input
              className={inputCls}
              value={s}
              onChange={e => setServico(i, e.target.value)}
              placeholder={`Serviço ${i + 1}`}
            />
          </div>
        ))}
      </Card>

      {/* Prestadores Autorizados */}
      <Card title="Prestadores Autorizados" borderColor="#6a1b9a">
        {form.autorizados.map((a, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Nome {i + 1}</label>
              <input
                className={inputCls}
                value={a.nome}
                onChange={e => setAutorizado(i, 'nome', e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className={labelCls}>CPF {i + 1}</label>
              <input
                className={inputCls}
                value={a.cpf}
                onChange={e => setAutorizado(i, 'cpf', e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
          </div>
        ))}
      </Card>

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          onClick={handleGeneratePDF}
          className="w-full py-3 rounded-xl text-white font-bold text-sm"
          style={{ background: '#1565c0' }}
        >
          Gerar PDF — Ordem de Serviço
        </button>
        <button
          onClick={() => { if (confirm('Limpar todos os dados do formulário?')) clearForm() }}
          className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-slate-300 text-slate-600 bg-white"
        >
          Limpar formulário
        </button>
      </div>
    </div>
  )
}
