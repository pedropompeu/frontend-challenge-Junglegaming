import type { QueryClient } from '@tanstack/react-query'
import { removeItem, storageKeys } from '@/shared/lib/storage'

const PRIVATE_PREFIXES = [
  'kurio:checkout-draft:',
  'kurio:checkout-attempt:',
  'kurio:pending-order:',
] as const

/**
 * Limpeza na troca de dono (logout ou outro usuário): cache privado e rascunhos de checkout
 * de quem não é `keepUserId`. O socket é desconectado pelo `RealtimeProvider`, que observa o userId.
 */
export function clearPrivateState(
  queryClient: QueryClient,
  keepUserId: string | null = null,
): void {
  queryClient.removeQueries({ queryKey: ['private'] })
  for (const kind of ['local', 'session'] as const) {
    for (const key of storageKeys(kind)) {
      const prefix = PRIVATE_PREFIXES.find((p) => key.startsWith(p))
      if (prefix && key.slice(prefix.length) !== keepUserId) removeItem(kind, key)
    }
  }
}
