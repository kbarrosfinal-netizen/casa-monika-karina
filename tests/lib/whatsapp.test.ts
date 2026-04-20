import { describe, it, expect } from 'vitest'
import { buildWhatsAppMessage } from '@/lib/whatsapp'

describe('buildWhatsAppMessage', () => {
  it('formata lista agrupada por loja com totais', () => {
    const msg = buildWhatsAppMessage([
      {
        store: { id: 's1', name: 'DB', color: '#1565c0', order: 1 },
        items: [
          { name: 'Leite', icon: '🥛', unit: 'L', quantity: 2, price: 4.89 }
        ],
        total: 9.78
      },
      {
        store: { id: 's2', name: 'Mercantil', color: '#2e7d32', order: 2 },
        items: [
          { name: 'Pão', icon: '🍞', unit: 'un', quantity: 1, price: 6.50 }
        ],
        total: 6.50
      }
    ], 16.28)

    expect(msg).toContain('*Lista de compras')
    expect(msg).toContain('DB')
    expect(msg).toContain('Mercantil')
    expect(msg).toContain('🥛 Leite (2 L)')
    expect(msg).toContain('R$ 4.89')
    expect(msg).toContain('Total estimado: R$ 16.28')
  })

  it('não mostra total nem preço quando vazio', () => {
    const msg = buildWhatsAppMessage([
      { store: null, items: [{ name: 'Azeite', icon: '🫒', unit: 'un', quantity: 1, price: null }], total: 0 }
    ], 0)
    expect(msg).not.toContain('Total estimado')
    expect(msg).toContain('Azeite')
  })
})
