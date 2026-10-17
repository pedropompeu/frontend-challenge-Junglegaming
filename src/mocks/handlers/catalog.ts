import Big from 'big.js'
import {
  NetworkSchema,
  NftListParamsSchema,
  type CategoryCount,
  type NetworkCount,
  type Nft,
  type NftListParams,
  type NftSummary,
  type Page,
} from '@/contracts'
import { getDb } from '../db/store'
import { CATEGORIES } from '../fixtures/categories'
import { apiError, json, route } from '../route'
import { validate } from './validate'

const NEW_SINCE = Date.parse('2026-09-15T00:00:00.000Z')
const TRENDING_MIN = 70

export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function fromPrice(nft: Nft): string {
  return nft.editions.reduce(
    (min, e) => (new Big(e.price).lt(min) ? e.price : min),
    nft.editions[0]!.price,
  )
}

export function toSummary(nft: Nft): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    collectionName: nft.collectionName,
    network: nft.network,
    rarity: nft.rarity,
    images: nft.images,
    editions: nft.editions,
    version: nft.version,
    fromPrice: fromPrice(nft),
  }
}

function csv(v: string | null): string[] | undefined {
  const list = v
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return list?.length ? list : undefined
}

function num(v: string | null): number | undefined {
  if (v === null || v.trim() === '') return undefined
  return Number(v)
}

export function parseListParams(search: URLSearchParams) {
  return validate(NftListParamsSchema, {
    q: search.get('q') ?? undefined,
    categories: csv(search.get('categories')),
    collections: csv(search.get('collections')),
    networks: csv(search.get('networks')),
    priceMin: num(search.get('priceMin')),
    priceMax: num(search.get('priceMax')),
    sort: search.get('sort') ?? 'relevance',
    tab: search.get('tab') ?? 'all',
    page: num(search.get('page')) ?? 1,
    pageSize: num(search.get('pageSize')) ?? 12,
  })
}

function relevance(nft: Nft, q: string): number {
  if (!q) return nft.trendingScore
  const name = normalize(nft.name)
  if (name === q) return 1000
  if (name.startsWith(q)) return 500
  if (name.includes(q)) return 300
  return 100
}

export function listNfts(params: NftListParams): Page<NftSummary> {
  const q = normalize(params.q ?? '')
  const min = params.priceMin === undefined ? null : new Big(params.priceMin)
  const max = params.priceMax === undefined ? null : new Big(params.priceMax)

  const filtered = getDb()
    .nfts.filter((n) => {
      if (q && !normalize(n.name).includes(q) && !normalize(n.collectionName).includes(q))
        return false
      if (params.categories && !params.categories.includes(n.category)) return false
      if (params.collections && !params.collections.includes(n.collectionId)) return false
      if (params.networks && !params.networks.includes(n.network)) return false
      if (params.tab === 'new' && Date.parse(n.createdAt) < NEW_SINCE) return false
      if (params.tab === 'trending' && n.trendingScore < TRENDING_MIN) return false
      const price = new Big(fromPrice(n))
      if (min && price.lt(min)) return false
      if (max && price.gt(max)) return false
      return true
    })
    .map((n) => ({ n, price: new Big(fromPrice(n)) }))

  const byId = (a: Nft, b: Nft) => a.id.localeCompare(b.id)
  filtered.sort((a, b) => {
    switch (params.sort) {
      case 'price-asc':
        return a.price.cmp(b.price) || byId(a.n, b.n)
      case 'price-desc':
        return b.price.cmp(a.price) || byId(a.n, b.n)
      case 'newest':
        return b.n.createdAt.localeCompare(a.n.createdAt) || byId(a.n, b.n)
      case 'rating':
        return b.n.rating - a.n.rating || b.n.reviewsCount - a.n.reviewsCount || byId(a.n, b.n)
      default:
        return (
          relevance(b.n, q) - relevance(a.n, q) ||
          b.n.trendingScore - a.n.trendingScore ||
          byId(a.n, b.n)
        )
    }
  })

  const total = filtered.length
  const totalPages = Math.ceil(total / params.pageSize)
  const start = (params.page - 1) * params.pageSize
  return {
    items: filtered.slice(start, start + params.pageSize).map(({ n }) => toSummary(n)),
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
  }
}

export const catalogHandlers = [
  route('GET /nfts', ({ request }) => {
    const params = parseListParams(new URL(request.url).searchParams)
    if (!params.ok) return params.response
    return json(listNfts(params.data))
  }),

  route('GET /nfts/:id', ({ params }) => {
    const nft = getDb().nfts.find((n) => n.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado')
    return json(nft)
  }),

  route('GET /categories', () => {
    const { nfts } = getDb()
    const cats: CategoryCount[] = CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      count: nfts.filter((n) => n.category === c.id).length,
    }))
    return json(cats)
  }),

  route('GET /networks', () => {
    const { nfts } = getDb()
    const nets: NetworkCount[] = NetworkSchema.options.map((id) => ({
      id,
      count: nfts.filter((n) => n.network === id).length,
    }))
    return json(nets)
  }),
]
