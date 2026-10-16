import { useId, useRef, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/shared/lib/api-error'
import { fieldErrorClass } from '@/shared/ui/field-styles'
import { AVATAR_ACCEPT, AvatarImageError, avatarFileError, resizeAvatar } from '../avatar-image'
import { useUpdateAvatar } from '../queries'

/**
 * Avatar do frame Desktop/Perfil: "Alterar" envia na hora (não espera o "Salvar" do perfil).
 * A imagem vai reduzida a 256 px; o arquivo original nunca sai do navegador.
 */
export function AvatarField({ userId, avatarUrl }: { userId: string; avatarUrl: string | null }) {
  const id = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const updateAvatar = useUpdateAvatar(userId)
  const busy = processing || updateAvatar.isPending

  async function upload(file: File) {
    setError(null)
    const invalid = avatarFileError(file)
    if (invalid) {
      setError(invalid)
      return
    }
    let dataUrl: string
    setProcessing(true)
    try {
      dataUrl = await resizeAvatar(file)
    } catch (e) {
      setError(e instanceof AvatarImageError ? e.message : 'Não foi possível ler a imagem')
      return
    } finally {
      setProcessing(false)
    }
    try {
      await updateAvatar.mutateAsync(dataUrl)
      toast.success('Avatar atualizado')
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível enviar o avatar'))
    }
  }

  async function remove() {
    setError(null)
    try {
      await updateAvatar.mutateAsync(null)
      toast.success('Avatar removido')
    } catch (e) {
      setError(errorMessage(e, 'Não foi possível remover o avatar'))
    }
  }

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="grid content-start gap-2">
      <p id={`${id}-label`} className="text-[15px] text-cream">
        Avatar
      </p>
      <div className="flex items-center gap-6">
        <span className="grid size-[50px] shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-surface-2 text-primary-hi">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Seu avatar"
              width={50}
              height={50}
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon aria-hidden="true" className="size-6" />
          )}
        </span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-10 min-w-[98px] bg-primary px-5 text-[15px] font-bold text-ink transition-colors hover:bg-primary-hi disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? (
            'Enviando…'
          ) : (
            <>
              Alterar<span className="sr-only"> avatar</span>
            </>
          )}
        </button>
        {/* Sem avatar, "Remover" não teria efeito: só aparece quando há o que remover. */}
        {avatarUrl ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="text-[15px] text-cream hover:text-primary-hi disabled:opacity-70"
          >
            Remover<span className="sr-only"> avatar</span>
          </button>
        ) : null}
        <input
          ref={fileInput}
          type="file"
          accept={AVATAR_ACCEPT}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Limpa para o mesmo arquivo poder ser escolhido de novo.
            event.target.value = ''
            if (file) void upload(file)
          }}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className={fieldErrorClass}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
