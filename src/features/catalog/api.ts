import { z } from 'zod'
import {
  CategoryCountSchema,
  NftSummarySchema,
  PageSchema,
  type CategoryCount,
  type NftListParams,
  type NftSummary,
  type Page,
} from '@/contracts'
import { request } from '@/shared/lib/http'

const NftPageSchema = PageSchema(NftSummarySchema)

/** A API recebe listas como CSV (`networks=polygon,ethereum`). */
function toQuery(p: NftListParams): Record<string, string | number> {
  const out: Record<string, string | number> = {
    sort: p.sort,
    tab: p.tab,
    page: p.page,
    pageSize: p.pageSize,
  }
  if (p.q) out.q = p.q
  if (p.categories?.length) out.categories = p.categories.join(',')
  if (p.collections?.length) out.collections = p.collections.join(',')
  if (p.networks?.length) out.networks = p.networks.join(',')
  if (p.priceMin !== undefined) out.priceMin = p.priceMin
  if (p.priceMax !== undefined) out.priceMax = p.priceMax
  return out
}

export function fetchNfts(params: NftListParams, signal?: AbortSignal): Promise<Page<NftSummary>> {
  return request(NftPageSchema, { url: '/nfts', params: toQuery(params), signal })
}

export function fetchCategories(signal?: AbortSignal): Promise<CategoryCount[]> {
  return request(z.array(CategoryCountSchema), { url: '/categories', signal })
}
