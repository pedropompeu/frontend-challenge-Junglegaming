import { describe, expect, it } from 'vitest'
import type { Edition } from '@/contracts'
import { selectEdition } from '@/features/nft/editions'

const ed = (id: string, available: number): Edition => ({
  id,
  kind: 'open',
  price: '1',
  originalPrice: null,
  supply: null,
  available,
})

describe('selectEdition', () => {
  const editions = [ed('a', 0), ed('b', 3), ed('c', 5)]

  it('uses the edition from the URL when it exists', () => {
    expect(selectEdition(editions, 'c').id).toBe('c')
  })

  it('keeps a sold-out edition from the URL so the CTA can say it is unavailable', () => {
    expect(selectEdition(editions, 'a').id).toBe('a')
  })

  it('defaults to the first edition with stock when the URL has none or an unknown id', () => {
    expect(selectEdition(editions, undefined).id).toBe('b')
    expect(selectEdition(editions, 'nope').id).toBe('b')
  })

  it('falls back to the first edition when everything is sold out', () => {
    expect(selectEdition([ed('x', 0), ed('y', 0)], undefined).id).toBe('x')
  })
})
