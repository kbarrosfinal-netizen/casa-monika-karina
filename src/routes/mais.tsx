import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/mais')({
  component: () => <ComingSoon title="Mais" description="Pets, Izete, OS e Config." />
})
