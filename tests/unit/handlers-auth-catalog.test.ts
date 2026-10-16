// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { CollectionSchema, NftSchema, NftSummarySchema, PageSchema, SessionSchema } from '@/contracts'
import { call, get, login, setupMockApi } from './helpers/mock-api'

setupMockApi()

const newUser = {
  username: 'carla_k',
  email: 'carla@kurio.test',
  password: 'Senha1234A',
  confirmPassword: 'Senha1234A',
}

describe('auth handlers', () => {
  it('logs in with demo credentials and returns a valid Session', async () => {
    const r = await call('POST', '/api/auth/login', { body: { email: 'ana@kurio.test', password: 'Kurio@123' } })
    expect(r.status).toBe(200)
    const s = SessionSchema.parse(r.body)
    expect(s.user.id).toBe('usr_ana')
    expect(Date.parse(s.expiresAt) - Date.now()).toBeGreaterThan(110 * 60_000)
  })

  it('rejects wrong password with a generic message', async () => {
    const r = await call('POST', '/api/auth/login', { body: { email: 'ana@kurio.test', password: 'errada' } })
    expect(r.status).toBe(401)
    expect(r.body.error).toMatchObject({ code: 'UNAUTHENTICATED', message: 'E-mail ou senha inválidos' })
  })

  it('accepts e-mail case-insensitively', async () => {
    expect(await login('ANA@kurio.test')).toBeTruthy()
  })

  it('register creates a user and session; the new user can log in', async () => {
    const r = await call('POST', '/api/auth/register', { body: newUser })
    expect(r.status).toBe(201)
    expect(SessionSchema.parse(r.body).user.username).toBe('carla_k')
    expect(await login('carla@kurio.test', 'Senha1234A')).toBeTruthy()
  })

  it('register conflict on existing email', async () => {
    const r = await call('POST', '/api/auth/register', { body: { ...newUser, email: 'ana@kurio.test' } })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('EMAIL_TAKEN')
    expect(r.body.error.fieldErrors.email).toBeDefined()
  })

  it('register conflict on existing username', async () => {
    const r = await call('POST', '/api/auth/register', { body: { ...newUser, username: 'ana_kurio' } })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('USERNAME_TAKEN')
    expect(r.body.error.fieldErrors.username).toBeDefined()
  })

  it('register validates the body with field errors', async () => {
    const r = await call('POST', '/api/auth/register', { body: { ...newUser, confirmPassword: 'outra' } })
    expect(r.status).toBe(422)
    expect(r.body.error.code).toBe('VALIDATION_ERROR')
    expect(r.body.error.fieldErrors.confirmPassword).toBe('As senhas não conferem')
  })

  it('session returns the user, and logout invalidates the token', async () => {
    const token = await login('bruno@kurio.test')
    const s = await get('/api/session', token)
    expect(s.status).toBe(200)
    expect(s.body.user.id).toBe('usr_bruno')
    expect((await call('POST', '/api/auth/logout', { token })).status).toBe(204)
    expect((await get('/api/session', token)).status).toBe(401)
  })

  it('session without token is 401', async () => {
    expect((await get('/api/session')).status).toBe(401)
  })
})

describe('catalog handlers', () => {
  const PageOfSummaries = PageSchema(NftSummarySchema)

  it('lists a valid page with fromPrice = cheapest edition', async () => {
    const r = await get('/api/nfts?page=1&pageSize=12')
    const page = PageOfSummaries.parse(r.body)
    expect(page.items).toHaveLength(12)
    expect(page.total).toBeGreaterThanOrEqual(48)
    for (const n of page.items) {
      const min = Math.min(...n.editions.map((e) => +e.price))
      expect(+n.fromPrice).toBe(min)
    }
  })

  it('filters combine and paginate', async () => {
    const r = await get('/api/nfts?networks=polygon&priceMax=1&sort=price-asc&page=1&pageSize=9')
    const items = PageOfSummaries.parse(r.body).items
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((n) => n.network === 'polygon' && +n.fromPrice <= 1)).toBe(true)
    const prices = items.map((n) => +n.fromPrice)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('searches by name or collection, accent- and case-insensitive', async () => {
    const r = await get('/api/nfts?q=ATELIE&page=1&pageSize=48')
    expect(r.body.items.length).toBeGreaterThan(0)
    expect(r.body.items.every((n: { collectionName: string }) => n.collectionName === 'Ateliê Noturno')).toBe(true)
    const byName = await get('/api/nfts?q=neon%20vessel&page=1&pageSize=48')
    expect(byName.body.items[0].id).toBe('nft_neon-vessel')
  })

  it('filters by collections CSV and tab', async () => {
    const r = await get('/api/nfts?collections=col_clube-do-jazz,col_selva-dourada&page=1&pageSize=48')
    const ids = new Set(r.body.items.map((n: { collectionName: string }) => n.collectionName))
    expect([...ids].sort()).toEqual(['Clube do Jazz', 'Selva Dourada'])
    const fresh = await get('/api/nfts?tab=new&page=1&pageSize=48')
    expect(fresh.body.total).toBeGreaterThan(0)
    expect(fresh.body.total).toBeLessThan(r.body.total + 48)
  })

  it('page beyond totalPages returns empty items with the real totalPages', async () => {
    const r = await get('/api/nfts?page=99&pageSize=12')
    expect(r.body.items).toEqual([])
    expect(r.body.totalPages).toBe(Math.ceil(r.body.total / 12))
  })

  it('rejects invalid params with 422', async () => {
    expect((await get('/api/nfts?pageSize=500')).status).toBe(422)
  })

  it('detail returns the full NFT', async () => {
    const r = await get('/api/nfts/nft_neon-vessel')
    expect(NftSchema.parse(r.body).name).toBe('Neon Vessel')
  })

  it('detail 404 for unknown id', async () => {
    const r = await get('/api/nfts/nope')
    expect(r.status).toBe(404)
    expect(r.body.error.code).toBe('NOT_FOUND')
  })

  it('collections carry global counts', async () => {
    const r = await get('/api/collections')
    const cols = CollectionSchema.array().parse(r.body)
    expect(cols.length).toBeGreaterThanOrEqual(6)
    expect(cols.reduce((s, c) => s + c.count, 0)).toBeGreaterThanOrEqual(48)
  })
})

describe('favorites handlers', () => {
  it('requires auth', async () => {
    expect((await get('/api/favorites')).status).toBe(401)
  })

  it('favorites are isolated per user', async () => {
    const ana = await login('ana@kurio.test')
    const bruno = await login('bruno@kurio.test')
    const put = await call('PUT', '/api/favorites/nft_neon-vessel', { token: ana })
    expect(put.body.nftIds).toContain('nft_neon-vessel')
    expect((await get('/api/favorites', bruno)).body.nftIds).not.toContain('nft_neon-vessel')
  })

  it('put is idempotent and delete removes', async () => {
    const ana = await login('ana@kurio.test')
    await call('PUT', '/api/favorites/nft_neon-vessel', { token: ana })
    const twice = await call('PUT', '/api/favorites/nft_neon-vessel', { token: ana })
    expect(twice.body.nftIds.filter((id: string) => id === 'nft_neon-vessel')).toHaveLength(1)
    const del = await call('DELETE', '/api/favorites/nft_neon-vessel', { token: ana })
    expect(del.body.nftIds).not.toContain('nft_neon-vessel')
  })

  it('404 for unknown NFT', async () => {
    const ana = await login('ana@kurio.test')
    expect((await call('PUT', '/api/favorites/nope', { token: ana })).status).toBe(404)
  })
})

describe('signup-conflict scenario', () => {
  it('is covered by the scenario override', async () => {
    const { setScenario } = await import('@/mocks/scenarios/runtime')
    setScenario('signup-conflict')
    const r = await call('POST', '/api/auth/register', { body: newUser })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('EMAIL_TAKEN')
  })
})
