// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { CartSchema, QuoteSchema } from '@/contracts'
import { getDb, mutate } from '@/mocks/db/store'
import { call, get, login, setupMockApi } from './helpers/mock-api'

setupMockApi()

const NV = 'nft_neon-vessel'
let open: { id: string; available: number }
let rare: { id: string }

beforeEach(() => {
  // Preços controlados para a conta exata: aberta 1.25, 1/50 0.3333.
  mutate((db) => {
    const nft = db.nfts.find((n) => n.id === NV)!
    const o = nft.editions.find((e) => e.kind === 'open')!
    const r = nft.editions.find((e) => e.kind === '1/50')!
    o.price = '1.25'
    o.available = 5
    r.price = '0.3333'
    r.available = 3
    open = { id: o.id, available: 5 }
    rare = { id: r.id }
  })
})

const addItem = (body: object, auth: { token?: string; guestId?: string }) =>
  call('POST', '/api/cart/items', { ...auth, body })

describe('cart handlers', () => {
  it('requires a user or a guest id', async () => {
    expect((await get('/api/cart')).status).toBe(401)
  })

  it('guest cart starts empty and expands items with current NFT data', async () => {
    const empty = await call('GET', '/api/cart', { guestId: 'g1' })
    expect(CartSchema.parse(empty.body)).toMatchObject({ items: [], owner: { type: 'guest', id: 'g1' } })
    const r = await addItem({ nftId: NV, editionId: open.id, quantity: 2 }, { guestId: 'g1' })
    const cart = CartSchema.parse(r.body)
    expect(cart.items[0]).toMatchObject({ unitPrice: '1.25', available: 5, quantity: 2, name: 'Neon Vessel' })
    expect(cart.version).toBeGreaterThan(empty.body.version)
  })

  it('adding the same edition sums quantities', async () => {
    await addItem({ nftId: NV, editionId: open.id, quantity: 2 }, { guestId: 'g1' })
    const r = await addItem({ nftId: NV, editionId: open.id, quantity: 1 }, { guestId: 'g1' })
    expect(r.body.items).toHaveLength(1)
    expect(r.body.items[0].quantity).toBe(3)
  })

  it('rejects quantity beyond availability', async () => {
    const r = await addItem({ nftId: NV, editionId: open.id, quantity: open.available + 1 }, { guestId: 'g1' })
    expect(r.status).toBe(409)
    expect(r.body.error).toMatchObject({ code: 'AVAILABILITY_CONFLICT', details: { available: 5 } })
  })

  it('rejects a sum that exceeds availability', async () => {
    await addItem({ nftId: NV, editionId: open.id, quantity: 4 }, { guestId: 'g1' })
    expect((await addItem({ nftId: NV, editionId: open.id, quantity: 2 }, { guestId: 'g1' })).status).toBe(409)
  })

  it('404 for unknown nft or edition', async () => {
    expect((await addItem({ nftId: 'nope', editionId: open.id, quantity: 1 }, { guestId: 'g1' })).status).toBe(404)
    expect((await addItem({ nftId: NV, editionId: 'nope', quantity: 1 }, { guestId: 'g1' })).status).toBe(404)
  })

  it('patch and delete items, each bumping the version', async () => {
    const a = await addItem({ nftId: NV, editionId: open.id, quantity: 1 }, { guestId: 'g1' })
    const itemId = a.body.items[0].id
    const p = await call('PATCH', `/api/cart/items/${itemId}`, { guestId: 'g1', body: { quantity: 4 } })
    expect(p.body.items[0].quantity).toBe(4)
    expect(p.body.version).toBe(a.body.version + 1)
    expect((await call('PATCH', `/api/cart/items/${itemId}`, { guestId: 'g1', body: { quantity: 6 } })).status).toBe(409)
    expect((await call('PATCH', `/api/cart/items/${itemId}`, { guestId: 'g1', body: { quantity: 0 } })).status).toBe(422)
    const d = await call('DELETE', `/api/cart/items/${itemId}`, { guestId: 'g1' })
    expect(d.body.items).toEqual([])
    expect(d.body.version).toBe(p.body.version + 1)
    expect((await call('DELETE', `/api/cart/items/${itemId}`, { guestId: 'g1' })).status).toBe(404)
  })

  it('carts are isolated between guests and users', async () => {
    const ana = await login('ana@kurio.test')
    await addItem({ nftId: NV, editionId: open.id, quantity: 1 }, { guestId: 'g1' })
    expect((await call('GET', '/api/cart', { guestId: 'g2' })).body.items).toEqual([])
    expect((await get('/api/cart', ana)).body.items).toEqual([])
    // Com token, o carrinho é sempre o do usuário, mesmo com X-Guest-Id.
    expect((await call('GET', '/api/cart', { token: ana, guestId: 'g1' })).body.owner).toEqual({
      type: 'user',
      id: 'usr_ana',
    })
  })

  it('merge keeps guest items capped by stock and deletes the guest cart', async () => {
    const ana = await login('ana@kurio.test')
    await addItem({ nftId: NV, editionId: open.id, quantity: 2 }, { guestId: 'g1' })
    await addItem({ nftId: NV, editionId: rare.id, quantity: 1 }, { guestId: 'g1' })
    await addItem({ nftId: NV, editionId: open.id, quantity: open.available - 1 }, { token: ana })
    const r = await call('POST', '/api/cart/merge', { token: ana, guestId: 'g1' })
    const merged = CartSchema.parse(r.body)
    expect(merged.owner.id).toBe('usr_ana')
    expect(merged.items.find((i) => i.editionId === open.id)!.quantity).toBe(open.available)
    expect(merged.items.find((i) => i.editionId === rare.id)!.quantity).toBe(1)
    expect((await call('GET', '/api/cart', { guestId: 'g1' })).body.items).toEqual([])
  })

  it('merge requires auth', async () => {
    expect((await call('POST', '/api/cart/merge', { guestId: 'g1' })).status).toBe(401)
  })
})

describe('quote handlers', () => {
  let token: string
  beforeEach(async () => {
    token = await login('bruno@kurio.test')
  })
  const quoteRaw = (body: object) => call('POST', '/api/quotes', { token, body })
  const quote = async (body: object) => QuoteSchema.parse((await quoteRaw(body)).body)
  const fill = async () => {
    await addItem({ nftId: NV, editionId: open.id, quantity: 2 }, { token })
    await addItem({ nftId: NV, editionId: rare.id, quantity: 1 }, { token })
  }

  it('quote math is exact', async () => {
    await fill()
    const q = await quote({ couponCode: 'KURIO10', network: 'ethereum' })
    expect(q.subtotal).toBe('2.8333')
    expect(q.discount).toBe('0.28333')
    expect(q.networkFee).toBe('0.012')
    expect(q.total).toBe('2.56197')
    expect(q.coupon).toEqual({ code: 'KURIO10', percentOff: 10 })
    expect(q.lines.map((l) => l.lineTotal)).toEqual(['2.5', '0.3333'])
    expect(Date.parse(q.expiresAt) - Date.parse(q.createdAt)).toBe(5 * 60_000)
    expect(getDb().quotes.some((x) => x.id === q.id && x.ownerKey === 'user:usr_bruno')).toBe(true)
  })

  it('network only changes the fee; coupon is optional and case-insensitive', async () => {
    await fill()
    const poly = await quote({ network: 'polygon' })
    expect(poly).toMatchObject({ networkFee: '0.002', discount: '0', total: '2.8353', coupon: null })
    expect((await quote({ network: 'solana', couponCode: 'kurio10' })).networkFee).toBe('0.001')
  })

  it('expired and invalid coupons', async () => {
    await fill()
    const expired = await quoteRaw({ couponCode: 'LAUNCH20', network: 'ethereum' })
    expect(expired.status).toBe(422)
    expect(expired.body.error.code).toBe('COUPON_EXPIRED')
    expect(expired.body.error.fieldErrors.couponCode).toBeDefined()
    expect((await quoteRaw({ couponCode: 'NOPE', network: 'ethereum' })).body.error.code).toBe('COUPON_INVALID')
  })

  it('empty cart is a validation error', async () => {
    const r = await quoteRaw({ network: 'ethereum' })
    expect(r.status).toBe(422)
    expect(r.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('stock dropped below the cart quantity yields AVAILABILITY_CONFLICT', async () => {
    await fill()
    mutate((db) => {
      db.nfts.find((n) => n.id === NV)!.editions.find((e) => e.id === open.id)!.available = 1
    })
    const r = await quoteRaw({ network: 'ethereum' })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('AVAILABILITY_CONFLICT')
    expect(r.body.error.details).toMatchObject({ editionId: open.id, available: 1 })
  })
})
