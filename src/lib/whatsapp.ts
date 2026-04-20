import type { Store } from './types'

interface Item {
  name: string
  icon: string
  unit: string
  quantity: number
  price: number | null
}

interface Group {
  store: Store | null
  items: Item[]
  total: number
}

export function buildWhatsAppMessage(groups: Group[], totalGeral: number): string {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const lines: string[] = [`*Lista de compras — ${date}*`, '']

  for (const g of groups) {
    const storeLabel = g.store ? g.store.name : 'Sem preço'
    lines.push(`🏪 *${storeLabel}*${g.total > 0 ? ` (R$ ${g.total.toFixed(2)})` : ''}`)
    for (const item of g.items) {
      const priceTag = item.price !== null ? ` — R$ ${item.price.toFixed(2)}` : ''
      lines.push(`• ${item.icon} ${item.name} (${item.quantity} ${item.unit})${priceTag}`)
    }
    lines.push('')
  }

  if (totalGeral > 0) {
    lines.push(`*Total estimado: R$ ${totalGeral.toFixed(2)}*`)
  }

  return lines.join('\n')
}
