import type { MouseEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/shared/lib/utils'
import { useFavoritePending, useFavorites, useToggleFavorite } from '../queries'

type FavoriteButtonProps = {
  nftId: string
  name: string
  className?: string
  iconClassName?: string
}

/** Coração de favoritar: visitante vai para o login e volta; cliques em voo são ignorados. */
export function FavoriteButton({ nftId, name, className, iconClassName }: FavoriteButtonProps) {
  const router = useRouter()
  const { status } = useSession()
  const { data } = useFavorites()
  const toggle = useToggleFavorite(nftId)
  const pending = useFavoritePending(nftId)
  const isFavorite = data?.nftIds.includes(nftId) ?? false

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    // O card inteiro é um link: o coração não pode abrir o detalhe.
    event.preventDefault()
    event.stopPropagation()
    if (status === 'anonymous') {
      void router.navigate({
        to: '/entrar',
        search: { redirect: router.state.location.href },
      })
      return
    }
    if (status !== 'authenticated' || pending) return
    toggle.mutate(!isFavorite)
  }

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
      onClick={onClick}
      className={className}
    >
      <HeartIcon
        aria-hidden="true"
        className={cn('size-4', isFavorite && 'fill-current', iconClassName)}
      />
    </button>
  )
}
