import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { usePets, useAddPet, useUpdatePet, useDeletePet } from '@/hooks/usePets'
import type { Pet } from '@/hooks/usePets'

export const Route = createFileRoute('/pets')({
  component: PetsPage
})

const EMOJI_OPTIONS = ['🐶', '🐱', '🐰', '🐦', '🐠', '🐢', '🐹']

function PetsPage() {
  const navigate = useNavigate()
  const { data: pets, isLoading } = usePets()
  const addPet = useAddPet()
  const updatePet = useUpdatePet()
  const deletePet = useDeletePet()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Pet | null>(null)

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (pet: Pet) => { setEditing(pet); setModalOpen(true) }

  return (
    <div className="p-4 space-y-4 pb-28">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate({ to: '/mais' })} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Pets</h2>
          <p className="text-xs text-slate-500">Seus animais de estimação</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 py-2 px-3 rounded-xl text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
        >
          <Plus className="w-4 h-4" /> Novo
        </button>
      </header>

      {isLoading && <p className="text-slate-500 text-sm">Carregando…</p>}

      {pets && pets.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-4xl mb-2">🐾</p>
          <p className="text-slate-600 font-medium">Nenhum pet cadastrado</p>
          <p className="text-xs text-slate-400 mt-1">Toque em "+ Novo" para adicionar</p>
        </div>
      )}

      <ul className="space-y-3">
        {pets?.map(pet => (
          <li key={pet.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <span className="text-4xl">{pet.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold">{pet.name}</p>
              <p className="text-xs text-slate-500">{pet.species}{pet.birthdate ? ` · Nasc. ${new Date(pet.birthdate).toLocaleDateString('pt-BR')}` : ''}</p>
              {pet.notes && <p className="text-xs text-slate-400 mt-1 truncate">{pet.notes}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(pet)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
                <Pencil className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => { if (confirm(`Remover ${pet.name}?`)) deletePet.mutate(pet.id) }}
                className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {modalOpen && (
        <PetModal
          pet={editing}
          onSave={async (data) => {
            if (editing) {
              await updatePet.mutateAsync({ id: editing.id, ...data })
            } else {
              await addPet.mutateAsync(data)
            }
            setModalOpen(false)
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

function PetModal({ pet, onSave, onClose }: {
  pet: Pet | null
  onSave: (data: Omit<Pet, 'id' | 'created_at'>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(pet?.name ?? '')
  const [species, setSpecies] = useState(pet?.species ?? '')
  const [emoji, setEmoji] = useState(pet?.emoji ?? '🐶')
  const [birthdate, setBirthdate] = useState(pet?.birthdate ?? '')
  const [notes, setNotes] = useState(pet?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={async e => {
          e.preventDefault()
          if (!name.trim()) return
          setSubmitting(true)
          try {
            await onSave({
              name: name.trim(),
              species: species.trim() || null,
              emoji,
              birthdate: birthdate || null,
              notes: notes || null
            })
          } finally {
            setSubmitting(false)
          }
        }}
        className="bg-white w-full rounded-t-2xl flex flex-col max-h-[90vh]"
      >
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold">{pet ? 'Editar pet' : 'Novo pet'}</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500">Ícone</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-2 rounded-xl ${emoji === e ? 'bg-emerald-100 ring-2 ring-emerald-400' : 'bg-slate-100'}`}
                >{e}</button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Nome *</span>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Cookie"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Espécie</span>
            <input
              value={species}
              onChange={e => setSpecies(e.target.value)}
              placeholder="Ex: Cachorro, Gato, Coelho…"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Data de nascimento</span>
            <input
              type="date"
              value={birthdate}
              onChange={e => setBirthdate(e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Observações</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ração, vacinas, vet…"
              rows={2}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 resize-none"
            />
          </label>
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-100 bg-white sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex-1 py-2.5 rounded-lg text-white font-bold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
          >
            {submitting ? 'Salvando…' : 'Salvar pet'}
          </button>
        </div>
      </form>
    </div>
  )
}
