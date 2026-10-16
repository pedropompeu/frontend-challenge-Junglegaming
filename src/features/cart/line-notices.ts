import { useCallback, useSyncExternalStore } from 'react'

export type CartLineNotice = 'price' | 'availability'

export const CART_LINE_NOTICE_LABELS: Record<CartLineNotice, string> = {
  price: 'Preço atualizado',
  availability: 'Estoque atualizado',
}

const EMPTY: readonly CartLineNotice[] = []
let notices: Record<string, readonly CartLineNotice[]> = {}
const listeners = new Set<() => void>()

function commit(next: Record<string, readonly CartLineNotice[]>): void {
  notices = next
  for (const listener of listeners) listener()
}

/**
 * Avisos de mudança vinda do tempo real ("Preço atualizado"), por item do carrinho.
 * Ficam até a próxima interação com aquela linha; não vão para o storage.
 */
export function markCartLineNotice(cartItemId: string, kind: CartLineNotice): void {
  const current = notices[cartItemId] ?? EMPTY
  if (current.includes(kind)) return
  commit({ ...notices, [cartItemId]: [...current, kind] })
}

export function clearCartLineNotice(cartItemId: string): void {
  if (!(cartItemId in notices)) return
  const { [cartItemId]: _removed, ...rest } = notices
  commit(rest)
}

export function clearCartLineNotices(): void {
  if (Object.keys(notices).length === 0) return
  commit({})
}

export function getCartLineNotices(cartItemId: string): readonly CartLineNotice[] {
  return notices[cartItemId] ?? EMPTY
}

export function subscribeCartLineNotices(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCartLineNotices(cartItemId: string): readonly CartLineNotice[] {
  const snapshot = useCallback(() => getCartLineNotices(cartItemId), [cartItemId])
  return useSyncExternalStore(subscribeCartLineNotices, snapshot, () => EMPTY)
}
