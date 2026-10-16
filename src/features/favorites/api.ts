import { FavoritesSchema, type Favorites } from '@/contracts'
import { request } from '@/shared/lib/http'

export function fetchFavorites(signal?: AbortSignal): Promise<Favorites> {
  return request(FavoritesSchema, { url: '/favorites', signal })
}

export function setFavorite(nftId: string, favorite: boolean): Promise<Favorites> {
  return request(FavoritesSchema, {
    method: favorite ? 'PUT' : 'DELETE',
    url: `/favorites/${encodeURIComponent(nftId)}`,
  })
}
