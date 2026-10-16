import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListParams } from '@/contracts'
import { qk } from '@/shared/lib/query-keys'
import { fetchCollections, fetchNfts } from './api'

export function nftListQuery(params: NftListParams) {
  return queryOptions({
    queryKey: qk.nfts.list(params),
    queryFn: ({ signal }) => fetchNfts(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function collectionsQuery() {
  return queryOptions({
    queryKey: qk.collections(),
    queryFn: ({ signal }) => fetchCollections(signal),
    staleTime: 5 * 60_000,
  })
}
