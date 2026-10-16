import type { QueryClient } from '@tanstack/react-query'
import type { Order, OrderUpdatedEvent } from '@/contracts'
import { clearAttempt, peekAttempt } from '@/features/checkout/attempt-store'
import { clearDraft } from '@/features/checkout/draft-store'
import { clearPendingOrder } from '@/features/orders/pending-order'
import { quotesKeyOf } from '@/features/quote/queries'
import { qk } from '@/shared/lib/query-keys'

/**
 * Aplica um `order.updated` já aceito pelo gate. Só o dono do pedido aplica; versão antiga
 * não sobrescreve dado mais novo, e status terminal (confirmado/recusado) nunca muda.
 * Retorna se o cache mudou.
 */
export function applyOrderUpdate(
  qc: QueryClient,
  e: OrderUpdatedEvent,
  ctx: { userId: string },
): boolean {
  const { order } = e.payload
  if (e.userId !== ctx.userId || order.userId !== ctx.userId) return false
  const key = qk.order(ctx.userId, order.id)
  const cached = qc.getQueryData<Order>(key)
  if (cached && (cached.version >= e.version || cached.status !== 'pending')) return false
  qc.setQueryData(key, order)
  settleLocalState(qc, ctx.userId, order)
  return true
}

/**
 * Efeitos locais de um pedido liquidado, venha a notícia do socket ou da REST.
 * Confirmado: a compra acabou — some o rascunho, a tentativa e o pendente; o carrinho perdeu
 * os itens comprados. Recusado: o rascunho fica para tentar de novo, mas com chave nova.
 * A tentativa só cai se já estiver vinculada a este pedido (ver `bindAttempt`).
 */
export function settleLocalState(qc: QueryClient, userId: string, order: Order): void {
  if (order.status === 'pending') return
  if (peekAttempt(userId)?.orderId === order.id) clearAttempt(userId)
  clearPendingOrder(userId, order.id)
  if (order.status === 'confirmed') clearDraft(userId)
  const ownerKey = `user:${userId}`
  void qc.invalidateQueries({ queryKey: qk.cart(ownerKey) })
  void qc.invalidateQueries({ queryKey: quotesKeyOf(ownerKey) })
}
