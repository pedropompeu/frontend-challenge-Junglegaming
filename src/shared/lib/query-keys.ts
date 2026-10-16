import type { NftListParams, QuoteRequest } from '@/contracts'

/** `user:<id>` para logado, `guest:<guestId>` para visitante. */
export type OwnerKey = `user:${string}` | `guest:${string}`

export function ownerKeyOf(userId: string | null, guestId: string): OwnerKey {
  return userId ? `user:${userId}` : `guest:${guestId}`
}

/**
 * Query keys do app. Toda key privada começa com `['private', userId|ownerKey]`, então
 * `removeQueries({ queryKey: ['private'] })` apaga os dados de um usuário de uma vez.
 */
export const qk = {
  nfts: {
    all: ['nfts'] as const,
    list: (p: NftListParams) => ['nfts', 'list', p] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
  },
  collections: () => ['collections'] as const,
  session: () => ['session'] as const,
  favorites: (userId: string) => ['private', userId, 'favorites'] as const,
  cart: (ownerKey: string) => ['private', ownerKey, 'cart'] as const,
  quote: (ownerKey: string, req: QuoteRequest) => ['private', ownerKey, 'quote', req] as const,
  order: (userId: string, orderId: string) => ['private', userId, 'order', orderId] as const,
  orderByTx: (userId: string, hash: string) => ['private', userId, 'tx', hash] as const,
  profile: (userId: string) => ['private', userId, 'profile'] as const,
  wallets: (userId: string) => ['private', userId, 'wallets'] as const,
}
