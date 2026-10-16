import { queryOptions } from '@tanstack/react-query'
import { qk } from '@/shared/lib/query-keys'
import { fetchOrder } from './api'

export function orderQuery(userId: string, orderId: string) {
  return queryOptions({
    queryKey: qk.order(userId, orderId),
    queryFn: ({ signal }) => fetchOrder(orderId, signal),
  })
}
