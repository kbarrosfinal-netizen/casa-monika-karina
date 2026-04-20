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

export function buildWhatsAppMessage(_groups: Group[], _totalGeral: number): string {
  return 'TODO-plan2-task-2.7'
}
