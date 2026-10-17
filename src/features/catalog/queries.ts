import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { NftListParams } from '@/contracts'
import { qk } from '@/shared/lib/query-keys'
import { fetchCategories, fetchNfts } from './api'

export function nftListQuery(params: NftListParams) {
  return queryOptions({
    queryKey: qk.nfts.list(params),
    queryFn: ({ signal }) => fetchNfts(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function categoriesQuery() {
  return queryOptions({
    queryKey: qk.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: 5 * 60_000,
  })
}
