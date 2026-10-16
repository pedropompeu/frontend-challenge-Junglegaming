import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import type {
  Cart,
  Edition,
  Nft,
  NftListParams,
  NftSummary,
  NftUpdatedEvent,
  Page,
} from '@/contracts'
import { applyNftUpdate, describeCartLineChange } from '@/features/realtime/apply-nft-update'
import { qk } from '@/shared/lib/query-keys'

const ID = 'nft_neon-vessel'
const OWNER = 'guest:gst_1'
const LIST: NftListParams = { sort: 'relevance', tab: 'all', page: 1, pageSize: 9 }
const QUOTE_KEY = qk.quote(OWNER, { network: 'ethereum' })

const editions: Edition[] = [
  { id: 'ed_10', kind: '1/10', price: '1.2', originalPrice: null, supply: 10, available: 4 },
  { id: 'ed_open', kind: 'open', price: '0.3', originalPrice: null, supply: null, available: 50 },
]

const nft: Nft = {
  id: ID,
  name: 'Neon Vessel',
  description: '',
  collectionId: 'col_1',
  collectionName: 'Coleção',
  network: 'ethereum',
  rarity: 'rare',
  images: [{ src: '/a.webp', alt: 'a', width: 800, height: 800 }],
  rating: 4,
  reviewsCount: 1,
  tokenId: '1',
  attributes: [],
  editions,
  createdAt: '2026-10-01T00:00:00.000Z',
  trendingScore: 80,
  version: 3,
}

const summary: NftSummary = {
  id: ID,
  name: nft.name,
  collectionName: nft.collectionName,
  network: nft.network,
  rarity: nft.rarity,
  images: nft.images,
  editions,
  version: 3,
  fromPrice: '0.3',
}

function page(items: NftSummary[]): Page<NftSummary> {
  return { items, page: 1, pageSize: 9, total: items.length, totalPages: 1 }
}

function cart(quantity = 2, nftVersion = 3): Cart {
  return {
    id: 'cart_1',
    owner: { type: 'guest', id: 'gst_1' },
    version: 1,
    updatedAt: '2026-10-01T00:00:00.000Z',
    items: [
      {
        id: 'ci_1',
        nftId: ID,
        editionId: 'ed_10',
        editionKind: '1/10',
        name: 'Neon Vessel',
        image: nft.images[0]!,
        network: 'ethereum',
        unitPrice: '1.2',
        available: 4,
        quantity,
        nftVersion,
      },
    ],
  }
}

function ev(version: number, patch: Partial<Record<string, Partial<Edition>>>): NftUpdatedEvent {
  return {
    eventId: `evt_${version}`,
    type: 'nft.updated',
    resource: { type: 'nft', id: ID },
    version,
    occurredAt: '2026-10-16T00:00:00.000Z',
    payload: { editions: editions.map((e) => ({ ...e, ...patch[e.id] })) },
  }
}

function seed(qc: QueryClient, c: Cart = cart()) {
  qc.setQueryData(qk.nfts.detail(ID), nft)
  qc.setQueryData(qk.nfts.list(LIST), page([summary]))
  qc.setQueryData(qk.cart(OWNER), c)
  qc.setQueryData(QUOTE_KEY, { quoteId: 'q1' })
}

describe('applyNftUpdate', () => {
  it('updates detail, lists and cart when version is newer', () => {
    const qc = new QueryClient()
    seed(qc)
    const { changedCartLines } = applyNftUpdate(
      qc,
      ev(4, { ed_10: { price: '1.38' }, ed_open: { price: '0.25' } }),
      { ownerKey: OWNER },
    )

    const detail = qc.getQueryData<Nft>(qk.nfts.detail(ID))!
    expect(detail.version).toBe(4)
    expect(detail.editions[0]!.price).toBe('1.38')

    const list = qc.getQueryData<Page<NftSummary>>(qk.nfts.list(LIST))!
    expect(list.items[0]!.version).toBe(4)
    expect(list.items[0]!.fromPrice).toBe('0.25')
    expect(list.items[0]!.editions[0]!.price).toBe('1.38')

    const item = qc.getQueryData<Cart>(qk.cart(OWNER))!.items[0]!
    expect(item).toMatchObject({ unitPrice: '1.38', available: 4, nftVersion: 4 })

    expect(qc.getQueryState(QUOTE_KEY)?.isInvalidated).toBe(true)
    expect(changedCartLines).toEqual([
      {
        cartItemId: 'ci_1',
        name: 'Neon Vessel (1/10)',
        kind: 'price',
        from: '1.2',
        to: '1.38',
      },
    ])
  })

  it('stale event older than REST data is ignored', () => {
    const qc = new QueryClient()
    qc.setQueryData(qk.nfts.detail(ID), { ...nft, version: 5 })
    qc.setQueryData(qk.nfts.list(LIST), page([{ ...summary, version: 5 }]))
    qc.setQueryData(qk.cart(OWNER), cart(2, 5))
    const { changedCartLines } = applyNftUpdate(qc, ev(4, { ed_10: { price: '0.1' } }), {
      ownerKey: OWNER,
    })
    expect(qc.getQueryData<Nft>(qk.nfts.detail(ID))!.editions[0]!.price).toBe('1.2')
    expect(qc.getQueryData<Page<NftSummary>>(qk.nfts.list(LIST))!.items[0]!.version).toBe(5)
    expect(qc.getQueryData<Cart>(qk.cart(OWNER))!.items[0]!.unitPrice).toBe('1.2')
    expect(changedCartLines).toEqual([])
  })

  it('reports availability only when the cart quantity no longer fits', () => {
    const qc = new QueryClient()
    seed(qc)
    // 4 → 3 com 2 no carrinho: o estoque mudou, mas o item continua cabendo.
    expect(
      applyNftUpdate(qc, ev(4, { ed_10: { available: 3 } }), { ownerKey: OWNER }).changedCartLines,
    ).toEqual([])
    const { changedCartLines } = applyNftUpdate(qc, ev(5, { ed_10: { available: 1 } }), {
      ownerKey: OWNER,
    })
    expect(changedCartLines).toEqual([
      { cartItemId: 'ci_1', name: 'Neon Vessel (1/10)', kind: 'availability', from: '3', to: '1' },
    ])
    expect(qc.getQueryData<Cart>(qk.cart(OWNER))!.items[0]!.available).toBe(1)
  })

  it('leaves other NFTs and the quote alone when the cart does not hold the NFT', () => {
    const qc = new QueryClient()
    const other = { ...cart(), items: [{ ...cart().items[0]!, nftId: 'nft_other' }] }
    seed(qc, other)
    applyNftUpdate(qc, ev(4, { ed_10: { price: '9' } }), { ownerKey: OWNER })
    expect(qc.getQueryData<Cart>(qk.cart(OWNER))!.items[0]!.unitPrice).toBe('1.2')
    expect(qc.getQueryState(QUOTE_KEY)?.isInvalidated).toBe(false)
  })
})

describe('describeCartLineChange', () => {
  const base = { cartItemId: 'ci_1', name: 'Neon Vessel (1/10)' }

  it('describes a price change with both values in ETH', () => {
    expect(describeCartLineChange({ ...base, kind: 'price', from: '1.2', to: '1.38' })).toBe(
      'Preço de Neon Vessel (1/10) mudou de 1.2 ETH para 1.38 ETH',
    )
  })

  it('describes the remaining stock, singular, plural and sold out', () => {
    const stock = (to: string) =>
      describeCartLineChange({ ...base, kind: 'availability', from: '4', to })
    expect(stock('1')).toBe('Estoque de Neon Vessel (1/10) mudou: só resta 1 unidade')
    expect(stock('3')).toBe('Estoque de Neon Vessel (1/10) mudou: só restam 3 unidades')
    expect(stock('0')).toBe('Neon Vessel (1/10) esgotou')
  })
})
