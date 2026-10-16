import { queryOptions } from '@tanstack/react-query'
import type { Order } from '@/contracts'
import { qk } from '@/shared/lib/query-keys'
import { fetchOrder, fetchOrderByTx } from './api'

/** Rede de segurança se um `order.updated` se perder: a REST é consultada enquanto pendente. */
export const ORDER_REFETCH_MS = 15_000

export function orderRefetchInterval(order: Order | undefined): number | false {
  return order?.status === 'pending' ? ORDER_REFETCH_MS : false
}

export function orderQuery(userId: string, orderId: string) {
  return queryOptions({
    queryKey: qk.order(userId, orderId),
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
    refetchInterval: (query) => orderRefetchInterval(query.state.data),
  })
}

/** Explorador simulado: o pedido do usuário dono da transação. */
export function orderByTxQuery(userId: string, hash: string) {
  return queryOptions({
    queryKey: qk.orderByTx(userId, hash),
    queryFn: ({ signal }) => fetchOrderByTx(hash, signal),
  })
}
