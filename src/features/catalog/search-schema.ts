import { z } from 'zod'
import {
  CategorySchema,
  NetworkSchema,
  NftSortSchema,
  NftTabSchema,
  type NftListParams,
} from '@/contracts'

/** Itens por página da grade da Início (3 × 3 no desktop). */
export const CATALOG_PAGE_SIZE = 9

/** Aceita `x` ou `[x, y]` e descarta entradas inválidas em vez de rejeitar a lista inteira. */
function listOf<T extends z.ZodType>(item: T) {
  return z
    .unknown()
    .optional()
    .transform((v): z.infer<T>[] => {
      const arr = Array.isArray(v)
        ? v
        : typeof v === 'string'
          ? v.split(',').map((x) => x.trim())
          : v === undefined || v === null
            ? []
            : [v]
      const out: z.infer<T>[] = []
      for (const entry of arr) {
        const parsed = item.safeParse(entry)
        if (parsed.success && !out.includes(parsed.data)) out.push(parsed.data)
      }
      return out
    })
}

const price = z.coerce.number().finite().min(0).optional().catch(undefined)

export const catalogSearchSchema = z
  .object({
    // O parser da URL transforma `?q=2026` em número; a busca é sempre texto.
    q: z
      .preprocess(
        (v) => (typeof v === 'number' || typeof v === 'boolean' ? String(v) : v),
        z.string(),
      )
      .transform((s) => s.trim().slice(0, 80))
      .transform((s) => s || undefined)
      .optional()
      .catch(undefined),
    categories: listOf(CategorySchema),
    networks: listOf(NetworkSchema),
    priceMin: price,
    priceMax: price,
    sort: NftSortSchema.catch('relevance').default('relevance'),
    tab: NftTabSchema.catch('all').default('all'),
    page: z.coerce.number().int().min(1).catch(1).default(1),
  })
  .transform((s) => {
    if (s.priceMin !== undefined && s.priceMax !== undefined && s.priceMin > s.priceMax) {
      return { ...s, priceMin: s.priceMax, priceMax: s.priceMin }
    }
    return s
  })

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Valores omitidos da URL (`stripSearchParams`) para ela ficar limpa. */
export const CATALOG_SEARCH_DEFAULTS = {
  categories: [] as CatalogSearch['categories'],
  networks: [] as CatalogSearch['networks'],
  sort: 'relevance',
  tab: 'all',
  page: 1,
} satisfies Partial<CatalogSearch>

export function toListParams(s: CatalogSearch): NftListParams {
  return {
    ...(s.q ? { q: s.q } : {}),
    ...(s.categories.length ? { categories: s.categories } : {}),
    ...(s.networks.length ? { networks: s.networks } : {}),
    ...(s.priceMin !== undefined ? { priceMin: s.priceMin } : {}),
    ...(s.priceMax !== undefined ? { priceMax: s.priceMax } : {}),
    sort: s.sort,
    tab: s.tab,
    page: s.page,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export function hasActiveFilters(s: CatalogSearch): boolean {
  return Boolean(
    s.q ||
    s.categories.length ||
    s.networks.length ||
    s.priceMin !== undefined ||
    s.priceMax !== undefined ||
    s.tab !== 'all',
  )
}
