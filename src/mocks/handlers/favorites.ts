import type { Favorites } from '@/contracts'
import { getDb, mutate } from '../db/store'
import { apiError, json, route, unauthenticated } from '../route'

function favoritesOf(userId: string): Favorites {
  return { nftIds: [...(getDb().favorites[userId] ?? [])] }
}

export const favoritesHandlers = [
  route('GET /favorites', ({ userId }) => (userId ? json(favoritesOf(userId)) : unauthenticated())),

  route('PUT /favorites/:nftId', ({ userId, params }) => {
    if (!userId) return unauthenticated()
    const nftId = params.nftId!
    if (!getDb().nfts.some((n) => n.id === nftId))
      return apiError(404, 'NOT_FOUND', 'NFT não encontrado')
    mutate((db) => {
      const list = (db.favorites[userId] ??= [])
      if (!list.includes(nftId)) list.push(nftId)
    })
    return json(favoritesOf(userId))
  }),

  route('DELETE /favorites/:nftId', ({ userId, params }) => {
    if (!userId) return unauthenticated()
    const nftId = params.nftId!
    if (!getDb().nfts.some((n) => n.id === nftId))
      return apiError(404, 'NOT_FOUND', 'NFT não encontrado')
    mutate((db) => {
      db.favorites[userId] = (db.favorites[userId] ?? []).filter((id) => id !== nftId)
    })
    return json(favoritesOf(userId))
  }),
]
