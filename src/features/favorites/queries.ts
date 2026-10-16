import {
  queryOptions,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Favorites } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { announce } from '@/shared/lib/announce'
import { qk } from '@/shared/lib/query-keys'
import { fetchFavorites, setFavorite } from './api'

export const FAVORITE_ERROR_MESSAGE = 'Não foi possível atualizar favoritos'

export function favoritesQuery(userId: string) {
  return queryOptions({
    queryKey: qk.favorites(userId),
    queryFn: ({ signal }) => fetchFavorites(signal),
  })
}

/** Favoritos do usuário logado; visitante não busca nada. */
export function useFavorites() {
  const { status, user } = useSession()
  return useQuery({
    ...favoritesQuery(user?.id ?? ''),
    enabled: status === 'authenticated' && user !== null,
  })
}

function withFavorite(list: Favorites | undefined, nftId: string, favorite: boolean): Favorites {
  const ids = (list?.nftIds ?? []).filter((id) => id !== nftId)
  return { nftIds: favorite ? [...ids, nftId] : ids }
}

/** Liga/desliga o favorito com atualização otimista; em falha desfaz e avisa. */
export function useToggleFavorite(nftId: string) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationKey: ['favorite', nftId],
    mutationFn: (favorite: boolean) => setFavorite(nftId, favorite),
    onMutate: async (favorite) => {
      if (!user) return null
      const key = qk.favorites(user.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, (old) => withFavorite(old, nftId, favorite))
      return { key, previous }
    },
    onError: (_error, favorite, snapshot) => {
      if (snapshot) {
        // Desfaz só este NFT: outros favoritos alterados em paralelo continuam como estão.
        const wasFavorite = snapshot.previous?.nftIds.includes(nftId) ?? !favorite
        queryClient.setQueryData<Favorites>(snapshot.key, (old) =>
          withFavorite(old, nftId, wasFavorite),
        )
      }
      toast.error(FAVORITE_ERROR_MESSAGE, { id: `favorite-error-${nftId}` })
      announce(FAVORITE_ERROR_MESSAGE, 'assertive')
    },
    onSettled: (_data, _error, _favorite, snapshot) => {
      // Com outra troca em voo, refazer a busca agora apagaria o estado otimista dela.
      if (snapshot && queryClient.isMutating({ mutationKey: ['favorite'] }) <= 1) {
        void queryClient.invalidateQueries({ queryKey: snapshot.key })
      }
    },
  })
}

/** Há uma troca de favorito em voo para este NFT (em qualquer botão da tela)? */
export function useFavoritePending(nftId: string): boolean {
  return useIsMutating({ mutationKey: ['favorite', nftId] }) > 0
}
