import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AppHeader } from '@/components/AppHeader'
import { BottomTabs } from '@/components/BottomTabs'
import { useAutoTicket } from '@/hooks/useAutoTicket'

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout() {
  useAutoTicket()

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomTabs />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </div>
  )
}
