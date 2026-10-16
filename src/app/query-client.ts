import { QueryClient } from '@tanstack/react-query'
import { isRetryable } from '@/shared/lib/api-error'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
        retryDelay: (attempt) => 500 * 2 ** attempt,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  })
}
