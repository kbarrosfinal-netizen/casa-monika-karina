import { ReactNode } from 'react'
import { Construction } from 'lucide-react'

export function ComingSoon({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <Construction className="w-12 h-12 text-brand-500" />
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="text-sm text-slate-500">{description}</p>}
      <p className="text-xs text-slate-400 mt-2">Em breve no Plan 2+</p>
    </div>
  )
}
