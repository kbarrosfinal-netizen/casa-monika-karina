import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useReceiptUpload } from '@/hooks/useReceiptUpload'
import { Camera, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/notas/fotografar')({
  component: FotografarPage
})

function FotografarPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useReceiptUpload()

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const onSubmit = async () => {
    if (!file) return
    try {
      await upload.mutateAsync(file)
    } catch {
      /* noop — state handled via upload.isError */
    }
  }

  return (
    <div className="p-4 space-y-4 min-h-screen">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/notas' })} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Fotografar nota</h2>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />

      {!preview && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center gap-3 text-slate-500"
        >
          <Camera className="w-12 h-12" />
          <span className="font-bold">Toque para abrir a câmera</span>
          <span className="text-xs">ou escolher da galeria</span>
        </button>
      )}

      {preview && (
        <div className="space-y-3">
          <img src={preview} alt="Nota" className="w-full rounded-2xl" />
          {upload.isSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-emerald-900">Nota processada!</p>
                <p className="text-sm text-emerald-700">
                  {upload.data.items} {upload.data.items === 1 ? 'item' : 'itens'} · R$ {upload.data.total?.toFixed(2)}
                </p>
              </div>
            </div>
          )}
          {upload.isError && (
            <div className="rounded-xl bg-rose-50 border border-rose-300 p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <p className="text-sm text-rose-900">{(upload.error as Error).message}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setFile(null); setPreview(null); upload.reset() }}
              disabled={upload.isPending}
              className="flex-1 py-3 rounded-xl border border-slate-300 font-bold"
            >
              Refazer
            </button>
            {!upload.isSuccess && (
              <button
                onClick={onSubmit}
                disabled={upload.isPending}
                className="flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
              >
                {upload.isPending ? 'Processando…' : 'Enviar nota'}
              </button>
            )}
            {upload.isSuccess && (
              <button
                onClick={() => navigate({ to: '/notas' })}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold"
              >
                Ver histórico
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
