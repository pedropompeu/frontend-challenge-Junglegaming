import { describe, expect, it } from 'vitest'
import { parseSearch, stringifySearch } from '@/app/search-serializer'
import { catalogSearchSchema } from '@/features/catalog/search-schema'

describe('search serializer', () => {
  it('writes arrays as comma-separated values', () => {
    expect(stringifySearch({ networks: ['polygon', 'ethereum'], page: 2, q: 'neon' })).toBe(
      '?networks=polygon%2Cethereum&page=2&q=neon',
    )
  })

  it('round-trips the catalog search through the URL', () => {
    const search = catalogSearchSchema.parse({
      q: '123',
      networks: ['polygon', 'solana'],
      categories: ['musica', 'arte-3d'],
      priceMin: 0.5,
      page: 3,
    })
    const back = catalogSearchSchema.parse(parseSearch(stringifySearch(search)))
    expect(back).toEqual(search)
  })

  it('keeps a numeric query as text', () => {
    expect(catalogSearchSchema.parse(parseSearch('?q=2026')).q).toBe('2026')
  })
})
