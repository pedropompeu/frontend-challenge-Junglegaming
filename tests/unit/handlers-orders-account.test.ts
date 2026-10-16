// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OrderSchema,
  ProfileSchema,
  QuoteSchema,
  WalletSchema,
  WalletSessionSchema,
  type RealtimeEvent,
} from '@/contracts'
import { getDb, mutate } from '@/mocks/db/store'
import { setScenario } from '@/mocks/scenarios/runtime'
import { subscribe } from '@/mocks/socket/bus'
import {
  cancelSettlements,
  resumeSettlements,
  scheduleSettlement,
  settleOrder,
} from '@/mocks/socket/settlement'
import { call, get, login, setupMockApi } from './helpers/mock-api'

setupMockApi('payment-confirmed')

const NV = 'nft_neon-vessel'
let editionId: string
let token: string
let events: RealtimeEvent[]
let unsub: () => void

const buyer = { displayName: 'Ana Souza', email: 'ana@kurio.test' }

beforeEach(async () => {
  mutate((db) => {
    const e = db.nfts.find((n) => n.id === NV)!.editions.find((x) => x.kind === 'open')!
    e.price = '0.5'
    e.available = 10
    editionId = e.id
  })
  token = await login('ana@kurio.test')
  events = []
  unsub = subscribe((e) => events.push(e))
})
afterEach(() => {
  unsub()
  cancelSettlements()
  vi.useRealTimers()
})

async function prepare(quantity = 2, network = 'ethereum') {
  await call('POST', '/api/cart/items', { token, body: { nftId: NV, editionId, quantity } })
  const q = await call('POST', '/api/quotes', { token, body: { network } })
  const ws = await call('POST', '/api/wallet-sessions', {
    token,
    body: { walletId: 'wal_ana_primary', provider: 'metamask', network },
  })
  return { quote: QuoteSchema.parse(q.body), session: WalletSessionSchema.parse(ws.body) }
}

const createOrder = (key: string | null, body: object) =>
  call('POST', '/api/orders', { token, body, headers: key ? { 'Idempotency-Key': key } : {} })

const available = () =>
  getDb()
    .nfts.find((n) => n.id === NV)!
    .editions.find((e) => e.id === editionId)!.available

describe('orders', () => {
  it('requires an Idempotency-Key header', async () => {
    const { quote, session } = await prepare()
    const r = await createOrder(null, { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(r.status).toBe(422)
  })

  it('creates a pending order, reserves stock and emits nft.updated', async () => {
    const { quote, session } = await prepare(2)
    const r = await createOrder('k1', { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(r.status).toBe(202)
    const order = OrderSchema.parse(r.body)
    expect(order).toMatchObject({
      status: 'pending',
      total: quote.total,
      userId: 'usr_ana',
      txHash: null,
    })
    expect(order.wallet.address).toBe(session.address)
    expect(available()).toBe(8)
    const upd = events.find((e) => e.type === 'nft.updated' && e.resource.id === NV)
    expect(upd).toBeDefined()
    expect(getDb().eventLog.length).toBeGreaterThan(0)
  })

  it('same idempotency key returns same order', async () => {
    const { quote, session } = await prepare()
    const body = { quoteId: quote.id, walletSessionId: session.id, buyer }
    const a = await createOrder('k1', body)
    const b = await createOrder('k1', body)
    expect(b.status).toBe(200)
    expect(b.body.id).toBe(a.body.id)
    expect(getDb().orders).toHaveLength(1)
    expect(available()).toBe(8)
  })

  it('same key different payload conflicts', async () => {
    const { quote, session } = await prepare()
    const body = { quoteId: quote.id, walletSessionId: session.id, buyer }
    await createOrder('k1', body)
    const r = await createOrder('k1', { ...body, buyer: { ...buyer, note: 'x' } })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('IDEMPOTENCY_CONFLICT')
  })

  it('stale quote after price change carries the new quote', async () => {
    const { quote, session } = await prepare()
    mutate((db) => {
      db.nfts.find((n) => n.id === NV)!.editions.find((e) => e.id === editionId)!.price = '9.99'
    })
    const r = await createOrder('k2', { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('QUOTE_STALE')
    const fresh = QuoteSchema.parse(r.body.error.details.quote)
    expect(fresh.total).not.toBe(quote.total)
    expect(fresh.id).not.toBe(quote.id)
  })

  it('expired quote is stale', async () => {
    const { quote, session } = await prepare()
    mutate((db) => {
      db.quotes.find((q) => q.id === quote.id)!.expiresAt = '2020-01-01T00:00:00.000Z'
    })
    const r = await createOrder('k3', { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(r.body.error.code).toBe('QUOTE_STALE')
  })

  it('stock below the quoted quantity is an availability conflict', async () => {
    const { quote, session } = await prepare(2)
    mutate((db) => {
      db.nfts.find((n) => n.id === NV)!.editions.find((e) => e.id === editionId)!.available = 1
    })
    const r = await createOrder('k4', { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('AVAILABILITY_CONFLICT')
  })

  it('disconnected wallet session is rejected', async () => {
    const { quote, session } = await prepare()
    expect((await call('DELETE', `/api/wallet-sessions/${session.id}`, { token })).status).toBe(204)
    const r = await createOrder('k5', { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('WALLET_REJECTED')
  })

  it('confirmed order removes only purchased quantities and emits order.updated', async () => {
    const { quote, session } = await prepare(2)
    await call('POST', '/api/cart/items', { token, body: { nftId: NV, editionId, quantity: 1 } })
    const r = await createOrder('k6', { quoteId: quote.id, walletSessionId: session.id, buyer })
    settleOrder(r.body.id, 'confirmed')
    const order = OrderSchema.parse((await get(`/api/orders/${r.body.id}`, token)).body)
    expect(order.status).toBe('confirmed')
    expect(order.txHash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(order.explorerUrl).toBe(`/explorador/tx/${order.txHash}`)
    expect(order.settledAt).not.toBeNull()
    expect(order.version).toBe(r.body.version + 1)
    const cart = (await get('/api/cart', token)).body
    expect(cart.items[0].quantity).toBe(1)
    const ev = events.find((e) => e.type === 'order.updated')
    expect(ev).toMatchObject({
      type: 'order.updated',
      userId: 'usr_ana',
      resource: { id: order.id },
    })
    expect((await get(`/api/orders/by-tx/${order.txHash}`, token)).body.id).toBe(order.id)
  })

  it('declined order returns stock', async () => {
    const { quote, session } = await prepare(2)
    const r = await createOrder('k7', { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(available()).toBe(8)
    settleOrder(r.body.id, 'declined')
    expect(available()).toBe(10)
    const order = getDb().orders.find((o) => o.id === r.body.id)!
    expect(order).toMatchObject({
      status: 'declined',
      declineReason: 'Pagamento recusado pela carteira',
      txHash: null,
    })
  })

  it('terminal orders do not change', async () => {
    const { quote, session } = await prepare()
    const r = await createOrder('k8', { quoteId: quote.id, walletSessionId: session.id, buyer })
    settleOrder(r.body.id, 'confirmed')
    const v = getDb().orders[0]!.version
    settleOrder(r.body.id, 'declined')
    expect(getDb().orders[0]!.status).toBe('confirmed')
    expect(getDb().orders[0]!.version).toBe(v)
  })

  it('receipt is a snapshot', async () => {
    const { quote, session } = await prepare()
    const r = await createOrder('k9', { quoteId: quote.id, walletSessionId: session.id, buyer })
    settleOrder(r.body.id, 'confirmed')
    mutate((db) => {
      db.nfts.find((n) => n.id === NV)!.editions.find((e) => e.id === editionId)!.price = '99'
    })
    expect((await get(`/api/orders/${r.body.id}`, token)).body.lines[0].unitPrice).toBe('0.5')
  })

  it('receipt lines keep the token id and artwork seen at purchase', async () => {
    const { quote, session } = await prepare()
    const nft = getDb().nfts.find((n) => n.id === NV)!
    const seen = { tokenId: nft.tokenId, image: { ...nft.images[0]! } }
    expect(quote.lines[0]).toMatchObject(seen)
    const r = await createOrder('k9b', { quoteId: quote.id, walletSessionId: session.id, buyer })
    settleOrder(r.body.id, 'confirmed')
    mutate((db) => {
      const n = db.nfts.find((x) => x.id === NV)!
      n.tokenId = '#9999'
      n.images[0] = { ...n.images[0]!, src: '/assets/nfts/99-800.webp' }
    })
    const order = OrderSchema.parse((await get(`/api/orders/${r.body.id}`, token)).body)
    expect(order.lines[0]).toMatchObject(seen)
  })

  it("another user's order is not found", async () => {
    const { quote, session } = await prepare()
    const r = await createOrder('k10', { quoteId: quote.id, walletSessionId: session.id, buyer })
    const bruno = await login('bruno@kurio.test')
    expect((await get(`/api/orders/${r.body.id}`, bruno)).status).toBe(404)
  })

  it('default scenario confirms after ~3s; pending orders resume after reload', async () => {
    const { quote, session } = await prepare()
    const r = await createOrder('k11', { quoteId: quote.id, walletSessionId: session.id, buyer })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    setScenario('default')
    const order = getDb().orders.find((o) => o.id === r.body.id)!
    scheduleSettlement(order)
    expect(order.scheduledStatus).toBe('confirmed')
    cancelSettlements()
    resumeSettlements()
    vi.advanceTimersByTime(2900)
    expect(getDb().orders[0]!.status).toBe('pending')
    vi.advanceTimersByTime(200)
    expect(getDb().orders[0]!.status).toBe('confirmed')
  })
})

describe('profile', () => {
  it('reads and updates the profile, rejecting a taken username', async () => {
    const p = ProfileSchema.parse((await get('/api/profile', token)).body)
    expect(p.username).toBe('ana_kurio')
    const taken = await call('PATCH', '/api/profile', {
      token,
      body: { ...p, username: 'bruno_lima' },
    })
    expect(taken.status).toBe(409)
    expect(taken.body.error).toMatchObject({
      code: 'USERNAME_TAKEN',
      fieldErrors: { username: expect.any(String) },
    })
    const ok = await call('PATCH', '/api/profile', {
      token,
      body: { ...p, displayName: 'Ana S.', ens: '' },
    })
    expect(ok.body).toMatchObject({ displayName: 'Ana S.', ens: null })
    expect((await get('/api/session', token)).body.user.displayName).toBe('Ana S.')
  })

  it('sets and clears the avatar', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo='
    expect(
      (await call('PUT', '/api/profile/avatar', { token, body: { dataUrl } })).body.avatarUrl,
    ).toBe(dataUrl)
    expect(
      (await call('PUT', '/api/profile/avatar', { token, body: { dataUrl: null } })).body.avatarUrl,
    ).toBeNull()
    expect(
      (
        await call('PUT', '/api/profile/avatar', {
          token,
          body: { dataUrl: 'data:text/html;base64,x' },
        })
      ).status,
    ).toBe(422)
  })

  it('wrong current password', async () => {
    const r = await call('POST', '/api/profile/password', {
      token,
      body: { currentPassword: 'bad', newPassword: 'NovaSenha1', confirmPassword: 'NovaSenha1' },
    })
    expect(r.status).toBe(422)
    expect(r.body.error.fieldErrors.currentPassword).toBeDefined()
  })

  it('changes the password', async () => {
    const r = await call('POST', '/api/profile/password', {
      token,
      body: {
        currentPassword: 'Kurio@123',
        newPassword: 'NovaSenha1',
        confirmPassword: 'NovaSenha1',
      },
    })
    expect(r.status).toBe(204)
    expect(await login('ana@kurio.test', 'NovaSenha1')).toBeTruthy()
  })
})

describe('wallets', () => {
  const wallet = {
    displayName: 'Ana',
    nickname: 'Reserva',
    network: 'polygon',
    profileName: 'ana_kurio',
    address: '0x1111111111111111111111111111111111111111',
    secondaryAddress: '',
    walletType: 'coinbase',
    referralCode: '',
    email: 'ana@kurio.test',
    ensName: '',
  }

  it('lists and upserts wallets by slot', async () => {
    expect(WalletSchema.array().parse((await get('/api/wallets', token)).body)).toHaveLength(1)
    const r = await call('PUT', '/api/wallets/secondary', { token, body: wallet })
    expect(r.status).toBe(200)
    expect(WalletSchema.parse(r.body)).toMatchObject({
      slot: 'secondary',
      secondaryAddress: null,
      ensName: null,
    })
    expect((await get('/api/wallets', token)).body).toHaveLength(2)
  })

  it('secondary address takes a network address or a .eth name, like the checkout', async () => {
    const put = (secondaryAddress: string) =>
      call('PUT', '/api/wallets/secondary', { token, body: { ...wallet, secondaryAddress } })
    const ens = await put('cofre.eth')
    expect(ens.status).toBe(200)
    expect(WalletSchema.parse(ens.body).secondaryAddress).toBe('cofre.eth')
    expect((await put('0x2222222222222222222222222222222222222222')).status).toBe(200)
    const invalid = await put('nao vale')
    expect(invalid.status).toBe(422)
    expect(invalid.body.error.fieldErrors.secondaryAddress).toBe(
      'Use um endereço da rede ou um nome .eth',
    )
  })

  it('validates the address against the network', async () => {
    const r = await call('PUT', '/api/wallets/primary', {
      token,
      body: { ...wallet, network: 'solana' },
    })
    expect(r.status).toBe(422)
    expect(r.body.error.fieldErrors.address).toBeDefined()
  })

  it('unknown slot is 404 and wallet session needs an owned wallet', async () => {
    expect((await call('PUT', '/api/wallets/tertiary', { token, body: wallet })).status).toBe(404)
    const bruno = await login('bruno@kurio.test')
    const r = await call('POST', '/api/wallet-sessions', {
      token: bruno,
      body: { walletId: 'wal_ana_primary', provider: 'metamask', network: 'ethereum' },
    })
    expect(r.status).toBe(404)
  })

  it('wallet-rejected scenario refuses the session', async () => {
    setScenario('wallet-rejected')
    const r = await call('POST', '/api/wallet-sessions', {
      token,
      body: { walletId: 'wal_ana_primary', provider: 'metamask', network: 'ethereum' },
    })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('WALLET_REJECTED')
  })

  it('custom wallet session validates the address and the order snapshots it as "Carteira avulsa"', async () => {
    const custom = (address: string, network = 'polygon') =>
      call('POST', '/api/wallet-sessions', {
        token,
        body: { customWallet: { address, walletType: 'coinbase' }, provider: 'coinbase', network },
      })
    const invalid = await custom('nao-e-endereco')
    expect(invalid.status).toBe(422)
    expect(invalid.body.error.fieldErrors['customWallet.address']).toBeDefined()
    const neither = await call('POST', '/api/wallet-sessions', {
      token,
      body: { provider: 'metamask', network: 'ethereum' },
    })
    expect(neither.status).toBe(422)

    const address = '0x1111111111111111111111111111111111111111'
    const ok = await custom(address)
    expect(ok.status).toBe(201)
    const session = WalletSessionSchema.parse(ok.body)
    expect(session).toMatchObject({ walletId: null, address, provider: 'coinbase' })

    await call('POST', '/api/cart/items', { token, body: { nftId: NV, editionId, quantity: 1 } })
    const q = QuoteSchema.parse(
      (await call('POST', '/api/quotes', { token, body: { network: 'polygon' } })).body,
    )
    const fullBuyer = {
      ...buyer,
      username: 'ana_kurio',
      profileName: 'ana_kurio',
      ensName: 'anasouza',
      referralCode: null,
      secondaryAddress: null,
      note: 'Presente',
    }
    const r = await createOrder('k-custom', {
      quoteId: q.id,
      walletSessionId: session.id,
      buyer: fullBuyer,
    })
    expect(r.status).toBe(202)
    expect(r.body.wallet).toEqual({ label: 'Carteira avulsa', address, provider: 'coinbase' })
    expect(r.body.buyer).toEqual(fullBuyer)
  })
})

describe('checkout mutation scenarios', () => {
  it('price-change-checkout bumps the first cart item 15% once, 1.5s after the first wallet connection', async () => {
    setScenario('price-change-checkout')
    const { quote, session } = await prepare(1)
    await new Promise((r) => setTimeout(r, 1600))
    const upd = events.filter((e) => e.type === 'nft.updated' && e.resource.id === NV)
    expect(upd).toHaveLength(1)
    const edition = getDb()
      .nfts.find((n) => n.id === NV)!
      .editions.find((e) => e.id === editionId)!
    expect(edition.price).toBe('0.575')
    const r = await createOrder('km', { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(r.body.error.code).toBe('QUOTE_STALE')
    // A nova cotação não reagenda a mutação.
    await call('POST', '/api/quotes', { token, body: { network: 'ethereum' } })
    await new Promise((r) => setTimeout(r, 1600))
    expect(events.filter((e) => e.type === 'nft.updated' && e.resource.id === NV)).toHaveLength(1)
  })

  it('sold-out-checkout zeroes the stock and the order hits AVAILABILITY_CONFLICT', async () => {
    setScenario('sold-out-checkout')
    const { quote, session } = await prepare(1)
    await new Promise((r) => setTimeout(r, 1600))
    expect(available()).toBe(0)
    const r = await createOrder('ks', { quoteId: quote.id, walletSessionId: session.id, buyer })
    expect(r.body.error.code).toBe('AVAILABILITY_CONFLICT')
  })
})
