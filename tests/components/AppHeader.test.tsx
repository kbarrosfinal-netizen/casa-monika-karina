import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AppHeader } from '@/components/AppHeader'

describe('AppHeader', () => {
  it('mostra título e status de sync', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    render(<AppHeader />)
    expect(screen.getByText(/Casa.*Família/i)).toBeInTheDocument()
    expect(screen.getByText(/sync ok/i)).toBeInTheDocument()
  })

  it('mostra offline quando navigator.onLine é false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<AppHeader />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })
})
