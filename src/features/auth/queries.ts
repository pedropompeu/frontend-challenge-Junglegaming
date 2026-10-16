import { queryOptions } from '@tanstack/react-query'
import { qk } from '@/shared/lib/query-keys'
import { fetchSessionInfo } from './api'

/** Valida o token salvo com o servidor; nunca repete (401 é definitivo). */
export function sessionQuery() {
  return queryOptions({
    queryKey: qk.session(),
    queryFn: ({ signal }) => fetchSessionInfo(signal),
    retry: false,
    staleTime: 60_000,
  })
}
