import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderRoute } from '../helpers/renderRoute'
import { HomeScreen } from '@/routes/index'

describe('HomeScreen', () => {
  it('mostra os 2 CTAs principais', async () => {
    renderRoute(HomeScreen, '/')
    expect(await screen.findByRole('button', { name: /marcar item que acabou/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fotografar nota fiscal/i })).toBeInTheDocument()
  })

  it('mostra KPIs placeholder', async () => {
    renderRoute(HomeScreen, '/')
    expect(await screen.findByText(/Gasto do mês/i)).toBeInTheDocument()
    expect(screen.getByText(/Faltando/i)).toBeInTheDocument()
  })
})
