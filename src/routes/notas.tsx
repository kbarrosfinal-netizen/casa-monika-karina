import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/notas')({
  component: () => <ComingSoon title="Notas" description="Histórico de compras por supermercado." />
})
