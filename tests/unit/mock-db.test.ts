// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { NftSchema } from '@/contracts'
import { buildSeed } from '@/mocks/db/seed'
import { getDb, mutate, nextId, resetDb } from '@/mocks/db/store'
import { verifyPassword } from '@/mocks/db/crypto'

describe('mock db', () => {
  beforeEach(() => localStorage.clear())

  it('seeds deterministically', async () => {
    expect(await buildSeed('default')).toEqual(await buildSeed('default'))
  })

  it('has enough fixture variety', async () => {
    const s = await buildSeed('default')
    expect(s.nfts.length).toBeGreaterThanOrEqual(48)
    expect(new Set(s.nfts.map((n) => n.network)).size).toBe(3)
    expect(s.collections.length).toBeGreaterThanOrEqual(6)
    expect(s.users).toHaveLength(2)
    expect(s.nfts.filter((n) => n.editions.some((e) => e.available === 0)).length).toBeGreaterThanOrEqual(3)
    expect(s.nfts.filter((n) => n.editions.some((e) => e.originalPrice)).length).toBeGreaterThanOrEqual(2)
    expect(s.nfts.some((n) => n.editions.length < 3)).toBe(true)
    for (const n of s.nfts) NftSchema.parse(n)
  })

  it('makes the 1/10 edition the most expensive', async () => {
    const s = await buildSeed('default')
    for (const n of s.nfts) {
      const rare = n.editions.find((e) => e.kind === '1/10')
      if (!rare) continue
      for (const e of n.editions) expect(Number(rare.price)).toBeGreaterThanOrEqual(Number(e.price))
    }
  })

  it('includes Neon Vessel with all three editions', async () => {
    const s = await buildSeed('default')
    const nv = s.nfts.find((n) => n.id === 'nft_neon-vessel')
    expect(nv?.name).toBe('Neon Vessel')
    expect(nv?.editions.map((e) => e.kind)).toEqual(['1/10', '1/50', 'open'])
  })

  it('never stores plaintext passwords', async () => {
    const s = await buildSeed('default')
    expect(JSON.stringify(s)).not.toContain('Kurio@123')
    expect(await verifyPassword('Kurio@123', s.users[0]!)).toBe(true)
    expect(await verifyPassword('errada', s.users[0]!)).toBe(false)
  })

  it('persists mutations and restores on reset', async () => {
    await resetDb('default')
    mutate((db) => {
      db.nfts[0]!.name = 'X'
    })
    expect(JSON.parse(localStorage.getItem('kurio:mockdb:v1')!).nfts[0].name).toBe('X')
    await resetDb('default')
    expect(getDb().nfts[0]!.name).not.toBe('X')
  })

  it('generates sequential ids that survive persistence', async () => {
    await resetDb('default')
    const a = nextId('ord')
    const b = nextId('ord')
    expect(a).not.toBe(b)
    expect(JSON.parse(localStorage.getItem('kurio:mockdb:v1')!).seq).toBe(getDb().seq)
  })

  it('empty-catalog has no nfts', async () => {
    expect((await buildSeed('empty-catalog')).nfts).toHaveLength(0)
  })
})
