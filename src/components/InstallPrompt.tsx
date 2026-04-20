import { detectPlatform, isStandalone } from '@/lib/platform'
import { Share, MoreVertical, Smartphone } from 'lucide-react'

export function InstallPrompt() {
  const platform = detectPlatform()

  if (isStandalone()) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
        ✅ Você já está usando como app instalado.
      </div>
    )
  }

  if (platform === 'ios') {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg">📱 Instalar no iPhone</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span>Toque no botão <Share className="inline w-4 h-4" /> <b>compartilhar</b> na barra do Safari (embaixo na tela).</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span>Role pra baixo e toque em <b>"Adicionar à Tela Inicial"</b>.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span>Toque em <b>"Adicionar"</b> — o ícone aparece na sua tela inicial. Abra ele e pronto.</span>
          </li>
        </ol>
      </div>
    )
  }

  if (platform === 'android') {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg">📱 Instalar no Android</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span>No Chrome, toque nos <MoreVertical className="inline w-4 h-4" /> <b>três pontos</b> no canto superior direito.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span>Toque em <b>"Instalar app"</b> ou <b>"Adicionar à tela inicial"</b>.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span>Confirme — o ícone aparece na tela inicial. Abra e pronto.</span>
          </li>
        </ol>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-2">
      <div className="flex items-center gap-2 font-bold">
        <Smartphone className="w-5 h-5" />
        Abra este link no celular
      </div>
      <p>Pra instalar como app, acesse esta mesma URL pelo Safari (iPhone) ou Chrome (Android).</p>
    </div>
  )
}
