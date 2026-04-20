import { createFileRoute } from '@tanstack/react-router'
import { InstallPrompt } from '@/components/InstallPrompt'

export const Route = createFileRoute('/instalar')({
  component: InstallPage
})

function InstallPage() {
  return (
    <div className="p-4 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Instalar no celular</h2>
        <p className="text-sm text-slate-500 mt-1">
          Uma vez instalado, abre como um app de verdade — sem barra do navegador.
        </p>
      </header>
      <InstallPrompt />
    </div>
  )
}
