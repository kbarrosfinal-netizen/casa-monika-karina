import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/compras')({
  component: () => <ComingSoon title="Compras" description="Lista faltando, mensal e modo supermercado." />
})
