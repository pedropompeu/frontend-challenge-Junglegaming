import { queryOptions } from '@tanstack/react-query'
import { qk } from '@/shared/lib/query-keys'
import { fetchNft } from './api'

export function nftDetailQuery(id: string) {
  return queryOptions({
    queryKey: qk.nfts.detail(id),
    queryFn: ({ signal }) => fetchNft(id, signal),
  })
}
