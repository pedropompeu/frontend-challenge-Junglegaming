import { queryOptions } from '@tanstack/react-query'
import { qk } from '@/shared/lib/query-keys'
import { fetchWallets } from './api'

export function walletsQuery(userId: string) {
  return queryOptions({
    queryKey: qk.wallets(userId),
    queryFn: ({ signal }) => fetchWallets(signal),
  })
}
