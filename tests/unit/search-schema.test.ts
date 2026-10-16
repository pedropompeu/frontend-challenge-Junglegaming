import { describe, expect, it } from 'vitest'
import { catalogSearchSchema, toListParams } from '@/features/catalog/search-schema'

describe('catalogSearchSchema', () => {
  it('normalizes garbage params', () => {
    expect(
      catalogSearchSchema.parse({ sort: 'foo', page: '-2', networks: ['mars'] }),
    ).toMatchObject({ sort: 'relevance', page: 1 })
  })

  it('swaps inverted price range', () => {
    expect(catalogSearchSchema.parse({ priceMin: 5, priceMax: 1 })).toMatchObject({
      priceMin: 1,
      priceMax: 5,
    })
  })

  it('applies defaults to an empty search', () => {
    expect(catalogSearchSchema.parse({})).toEqual({
      collections: [],
      networks: [],
      sort: 'relevance',
      tab: 'all',
      page: 1,
    })
  })

  it('keeps only valid networks and trims an overlong query', () => {
    const s = catalogSearchSchema.parse({
      networks: ['polygon', 'mars'],
      q: `  ${'a'.repeat(90)} `,
    })
    expect(s.networks).toEqual(['polygon'])
    expect(s.q).toHaveLength(80)
  })

  it('accepts a single string as a one-item list and coerces numeric strings', () => {
    expect(
      catalogSearchSchema.parse({ collections: 'col_neon-primatas', page: '3', priceMin: '0.5' }),
    ).toMatchObject({ collections: ['col_neon-primatas'], page: 3, priceMin: 0.5 })
  })

  it('drops an empty query and a negative price', () => {
    const s = catalogSearchSchema.parse({ q: '   ', priceMin: -1 })
    expect(s.q).toBeUndefined()
    expect(s.priceMin).toBeUndefined()
  })
})

describe('toListParams', () => {
  it('builds API params with a fixed page size of 9 and omits empty lists', () => {
    expect(toListParams(catalogSearchSchema.parse({ networks: ['solana'], page: 2 }))).toEqual({
      networks: ['solana'],
      sort: 'relevance',
      tab: 'all',
      page: 2,
      pageSize: 9,
    })
  })
})
