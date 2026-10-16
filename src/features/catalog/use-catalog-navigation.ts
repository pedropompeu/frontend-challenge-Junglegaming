import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
import type { CatalogSearch } from './search-schema'

/**
 * Estado do catálogo vive na URL. Filtros, aba, ordenação e página entram no histórico (push);
 * a digitação da busca substitui a entrada atual (replace) para o "voltar" não andar letra a letra.
 * Nenhuma delas mexe no scroll: o grid atualiza onde o usuário está (a paginação rola por conta própria).
 */
export function useCatalogNavigation() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })

  const setFilters = useCallback(
    (patch: Partial<CatalogSearch>) =>
      navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), resetScroll: false }),
    [navigate],
  )

  const setQuery = useCallback(
    (q: string) =>
      navigate({
        search: (prev) => ({ ...prev, q: q || undefined, page: 1 }),
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  )

  const setPage = useCallback(
    (page: number, opts?: { replace?: boolean }) =>
      navigate({
        search: (prev) => ({ ...prev, page }),
        replace: opts?.replace,
        resetScroll: false,
      }),
    [navigate],
  )

  const clearFilters = useCallback(() => navigate({ search: {}, resetScroll: false }), [navigate])

  return { search, setFilters, setQuery, setPage, clearFilters }
}
