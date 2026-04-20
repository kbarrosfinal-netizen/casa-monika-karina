import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/financas')({
  component: () => <ComingSoon title="Finanças" description="Soma automática de tudo que foi registrado." />
})
