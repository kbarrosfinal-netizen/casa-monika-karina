import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { BottomTabs } from '@/components/BottomTabs'

function renderAt(path: string) {
  const rootRoute = createRootRoute({ component: BottomTabs })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  const comprasRoute = createRoute({ getParentRoute: () => rootRoute, path: '/compras', component: () => null })
  const notasRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notas', component: () => null })
  const financasRoute = createRoute({ getParentRoute: () => rootRoute, path: '/financas', component: () => null })
  const maisRoute = createRoute({ getParentRoute: () => rootRoute, path: '/mais', component: () => null })

  const routeTree = rootRoute.addChildren([indexRoute, comprasRoute, notasRoute, financasRoute, maisRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] })
  })
  return render(<RouterProvider router={router} />)
}

describe('BottomTabs', () => {
  it('renders all 5 tabs', async () => {
    renderAt('/')
    expect(await screen.findByText('Início')).toBeInTheDocument()
    expect(screen.getByText('Compras')).toBeInTheDocument()
    expect(screen.getByText('Notas')).toBeInTheDocument()
    expect(screen.getByText('Finanças')).toBeInTheDocument()
    expect(screen.getByText('Mais')).toBeInTheDocument()
  })

  it('marks the current route as active', async () => {
    renderAt('/compras')
    const link = (await screen.findByText('Compras')).closest('a')
    expect(link).toHaveClass('text-brand-600')
  })
})
