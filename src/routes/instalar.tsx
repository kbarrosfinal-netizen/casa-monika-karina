import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/instalar')({
  component: InstallPage
})

function InstallPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Como instalar</h2>
      <p className="text-sm text-slate-600">Instruções visuais virão no Task C.3.</p>
    </div>
  )
}
