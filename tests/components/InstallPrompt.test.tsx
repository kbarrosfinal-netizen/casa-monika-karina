import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InstallPrompt } from '@/components/InstallPrompt'

vi.mock('@/lib/platform', () => ({
  detectPlatform: vi.fn(),
  isStandalone: vi.fn(() => false)
}))

import { detectPlatform } from '@/lib/platform'

describe('InstallPrompt', () => {
  it('mostra instruções do iOS para Safari iPhone', () => {
    vi.mocked(detectPlatform).mockReturnValue('ios')
    render(<InstallPrompt />)
    expect(screen.getByText(/compartilhar/i)).toBeInTheDocument()
    expect(screen.getByText(/Adicionar à Tela Inicial/i)).toBeInTheDocument()
  })

  it('mostra instruções do Android para Chrome', () => {
    vi.mocked(detectPlatform).mockReturnValue('android')
    render(<InstallPrompt />)
    expect(screen.getByText(/três pontos/i)).toBeInTheDocument()
    expect(screen.getByText(/Instalar app/i)).toBeInTheDocument()
  })

  it('mostra fallback no desktop', () => {
    vi.mocked(detectPlatform).mockReturnValue('desktop')
    render(<InstallPrompt />)
    expect(screen.getByText(/abra este link no celular/i)).toBeInTheDocument()
  })
})
