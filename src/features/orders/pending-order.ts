import { readJson, removeItem, writeJson } from '@/shared/lib/storage'

/**
 * Pedido enviado e ainda não liquidado (localStorage, por usuário). Enquanto existir,
 * abrir o checkout leva ao pedido em vez de permitir uma segunda compra.
 */
const keyOf = (userId: string) => `kurio:pending-order:${userId}`

type Stored = { orderId: string }

function isStored(v: unknown): v is Stored {
  return typeof v === 'object' && v !== null && typeof (v as Stored).orderId === 'string'
}

export function savePendingOrder(userId: string, orderId: string): void {
  writeJson('local', keyOf(userId), { orderId } satisfies Stored)
}

export function loadPendingOrder(userId: string): string | null {
  return readJson('local', keyOf(userId), isStored)?.orderId ?? null
}

/** Com `orderId`, só limpa se o pendente salvo for esse pedido. */
export function clearPendingOrder(userId: string, orderId?: string): void {
  if (orderId && loadPendingOrder(userId) !== orderId) return
  removeItem('local', keyOf(userId))
}
