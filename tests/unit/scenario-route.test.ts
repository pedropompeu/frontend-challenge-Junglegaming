// @vitest-environment jsdom
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getDb, mutate, resetDb } from '@/mocks/db/store'
import { apiError, json, route } from '@/mocks/route'
import { SCENARIOS } from '@/mocks/scenarios/scenarios'
import {
  failNext,
  getScenario,
  resetRuntime,
  sampleLatency,
  setLatencyOverride,
  setScenario,
} from '@/mocks/scenarios/runtime'

const url = (p: string) => `${location.origin}/api${p}`

const server = setupServer(
  route('GET /nfts', () => json({ ok: true })),
  route('GET /me', ({ userId }) => (userId ? json({ userId }) : apiError(401, 'UNAUTHENTICATED', 'Faça login'))),
  route('GET /teapot', () => apiError(418 as number, 'TRANSIENT', 'x', { details: { a: 1 } })),
  route('POST /orders', () => json({ id: 'ord_1' }, 201)),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())
beforeEach(async () => {
  localStorage.clear()
  history.replaceState(null, '', '/')
  resetRuntime()
  setScenario('default')
  setLatencyOverride(0)
  await resetDb('default')
})

describe('scenario catalog', () => {
  it('declares the 16 canonical scenarios', () => {
    expect(Object.keys(SCENARIOS)).toHaveLength(16)
    expect(SCENARIOS.default.settle).toEqual({ status: 'confirmed', afterMs: 3000 })
    expect(SCENARIOS['payment-confirmed'].settle).toBe('manual')
    expect(SCENARIOS['payment-declined'].settle).toEqual({ status: 'declined', afterMs: 3000 })
    expect(SCENARIOS['wallet-rejected'].overrides?.['POST /wallet-sessions']).toEqual({
      status: 409,
      code: 'WALLET_REJECTED',
    })
    expect(SCENARIOS['order-timeout'].overrides?.['POST /orders']).toBe('hang-first')
  })
})

describe('runtime', () => {
  it('getScenario reads query param and persists', () => {
    resetRuntime()
    history.replaceState(null, '', '/?scenario=slow')
    expect(getScenario()).toBe('slow')
    expect(localStorage.getItem('kurio:mock-scenario')).toBe('slow')
  })

  it('ignores unknown scenario names and falls back to storage/default', () => {
    resetRuntime()
    history.replaceState(null, '', '/?scenario=nope')
    expect(getScenario()).toBe('default')
  })

  it('samples latency within the scenario range, deterministically for jitter', () => {
    setLatencyOverride(null)
    setScenario('slow')
    expect(sampleLatency()).toBe(2500)
    setScenario('jitter')
    const a = Array.from({ length: 20 }, sampleLatency)
    setScenario('jitter')
    const b = Array.from({ length: 20 }, sampleLatency)
    expect(a).toEqual(b)
    expect(Math.min(...a)).toBeGreaterThanOrEqual(50)
    expect(Math.max(...a)).toBeLessThanOrEqual(1500)
    expect(new Set(a).size).toBeGreaterThan(5)
  })
})

describe('route middleware', () => {
  it('offline returns network error', async () => {
    setScenario('offline')
    setLatencyOverride(0)
    await expect(fetch(url('/nfts'))).rejects.toThrow()
  })

  it('failNext applies N times then recovers', async () => {
    failNext('GET /nfts', { status: 503, code: 'TRANSIENT', times: 1 })
    const r1 = await fetch(url('/nfts'))
    expect(r1.status).toBe(503)
    expect((await r1.json()).error.code).toBe('TRANSIENT')
    expect((await fetch(url('/nfts'))).status).toBe(200)
  })

  it('failNext with networkError rejects', async () => {
    failNext('GET /nfts', { networkError: true })
    await expect(fetch(url('/nfts'))).rejects.toThrow()
    expect((await fetch(url('/nfts'))).status).toBe(200)
  })

  it('server-errors fails the first two GETs of each endpoint, then recovers', async () => {
    setScenario('server-errors')
    setLatencyOverride(0)
    expect((await fetch(url('/nfts'))).status).toBe(503)
    expect((await fetch(url('/nfts'))).status).toBe(503)
    expect((await fetch(url('/nfts'))).status).toBe(200)
    expect((await fetch(url('/orders'), { method: 'POST' })).status).toBe(201)
  })

  it('scenario error override answers with the envelope', async () => {
    setScenario('wallet-rejected')
    setLatencyOverride(0)
    server.use(route('POST /wallet-sessions', () => json({}, 201)))
    const r = await fetch(url('/wallet-sessions'), { method: 'POST' })
    expect(r.status).toBe(409)
    expect((await r.json()).error.code).toBe('WALLET_REJECTED')
  })

  it('hang-first runs the resolver once but never answers, then answers normally', async () => {
    setScenario('order-timeout')
    setLatencyOverride(0)
    let calls = 0
    server.use(route('POST /orders', () => (calls++, json({ id: 'ord_1' }, 201))))
    const first = fetch(url('/orders'), { method: 'POST', signal: AbortSignal.timeout(150) })
    await expect(first).rejects.toThrow()
    expect(calls).toBe(1)
    const second = await fetch(url('/orders'), { method: 'POST' })
    expect(second.status).toBe(201)
    expect(calls).toBe(2)
  })

  it('resolves the user from a valid bearer token', async () => {
    mutate((db) => {
      db.sessions.push({ token: 'tok_ok', userId: 'usr_ana', expiresAt: '2999-01-01T00:00:00.000Z' })
    })
    const r = await fetch(url('/me'), { headers: { Authorization: 'Bearer tok_ok' } })
    expect(await r.json()).toEqual({ userId: 'usr_ana' })
    expect(getDb().sessions).toHaveLength(1)
  })

  it('expired session yields SESSION_EXPIRED', async () => {
    mutate((db) => {
      db.sessions.push({ token: 'tok_old', userId: 'usr_ana', expiresAt: '2020-01-01T00:00:00.000Z' })
    })
    const r = await fetch(url('/me'), { headers: { Authorization: 'Bearer tok_old' } })
    expect(r.status).toBe(401)
    const body = await r.json()
    expect(body.error.code).toBe('SESSION_EXPIRED')
  })

  it('unknown token yields UNAUTHENTICATED', async () => {
    const r = await fetch(url('/me'), { headers: { Authorization: 'Bearer nope' } })
    expect(r.status).toBe(401)
    expect((await r.json()).error.code).toBe('UNAUTHENTICATED')
  })

  it('apiError carries extra fields in the envelope', async () => {
    const body = await (await fetch(url('/teapot'))).json()
    expect(body).toEqual({ error: { code: 'TRANSIENT', message: 'x', details: { a: 1 } } })
  })
})
