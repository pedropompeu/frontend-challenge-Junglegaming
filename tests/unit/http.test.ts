// @vitest-environment jsdom
import { http as mswHttp, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { FavoritesSchema, NftSummarySchema, PageSchema, SessionInfoSchema } from '@/contracts'
import { mutate } from '@/mocks/db/store'
import { failNext } from '@/mocks/scenarios/runtime'
import { ApiError, isApiError, isRetryable } from '@/shared/lib/api-error'
import { getGuestId, rotateGuestId } from '@/shared/lib/guest'
import { request } from '@/shared/lib/http'
import { qk } from '@/shared/lib/query-keys'
import {
  clearStoredSession,
  getStoredSession,
  onSessionExpired,
  setStoredSession,
} from '@/shared/lib/session-store'
import { login, setupMockApi } from './helpers/mock-api'

const server = setupMockApi('default')

const NftPage = PageSchema(NftSummarySchema)

async function storeSessionFor(email: string) {
  const token = await login(email)
  const userId = email.startsWith('ana') ? 'usr_ana' : 'usr_bruno'
  setStoredSession({ token, userId, expiresAt: new Date(Date.now() + 3_600_000).toISOString() })
  return token
}

describe('http client', () => {
  it('parses a valid response with the given schema', async () => {
    const page = await request(NftPage, { url: '/nfts' })
    expect(page.items.length).toBeGreaterThan(0)
  })

  it('normalizes api error envelope', async () => {
    failNext('GET /nfts', { status: 503, code: 'TRANSIENT' })
    await expect(request(NftPage, { url: '/nfts' })).rejects.toMatchObject({
      status: 503,
      code: 'TRANSIENT',
    })
  })

  it('carries field errors from the envelope', async () => {
    const err = await request(SessionInfoSchema, {
      url: '/auth/register',
      method: 'POST',
      data: {
        username: 'ana',
        email: 'ana@kurio.test',
        password: 'Kurio@123',
        confirmPassword: 'Kurio@123',
      },
    }).catch((e: unknown) => e)
    expect(isApiError(err)).toBe(true)
    expect((err as ApiError).fieldErrors?.email).toBeTruthy()
  })

  it('maps network failures to NETWORK with null status', async () => {
    failNext('GET /nfts', { networkError: true })
    await expect(request(NftPage, { url: '/nfts' })).rejects.toMatchObject({
      status: null,
      code: 'NETWORK',
    })
  })

  it('emits session expired on SESSION_EXPIRED', async () => {
    const token = await storeSessionFor('ana@kurio.test')
    mutate((db) => {
      for (const s of db.sessions)
        if (s.token === token) s.expiresAt = new Date(Date.now() - 1000).toISOString()
    })
    const spy = vi.fn()
    const off = onSessionExpired(spy)
    await expect(request(SessionInfoSchema, { url: '/session' })).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    })
    expect(spy).toHaveBeenCalledOnce()
    off()
  })

  it('emits session expired on UNAUTHENTICATED only when a local session exists', async () => {
    const spy = vi.fn()
    const off = onSessionExpired(spy)
    clearStoredSession()
    await expect(request(SessionInfoSchema, { url: '/session' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(spy).not.toHaveBeenCalled()
    setStoredSession({
      token: 'tok_revoked',
      userId: 'usr_ana',
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    })
    await expect(request(SessionInfoSchema, { url: '/session' })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(spy).toHaveBeenCalledOnce()
    off()
  })

  it('sends the bearer token and the guest id', async () => {
    await storeSessionFor('ana@kurio.test')
    const info = await request(SessionInfoSchema, { url: '/session' })
    expect(info.user.id).toBe('usr_ana')
    let seen: string | null = null
    server.use(
      mswHttp.get('/api/favorites', ({ request: r }) => {
        seen = r.headers.get('X-Guest-Id')
        return HttpResponse.json({ nftIds: [] })
      }),
    )
    await request(FavoritesSchema, { url: '/favorites' })
    expect(seen).toBe(getGuestId())
  })

  it('rejects schema-violating responses', async () => {
    server.use(
      mswHttp.get('/api/nfts', () =>
        HttpResponse.json({
          items: [{ id: 'x', price: 1 }],
          page: 1,
          pageSize: 12,
          total: 1,
          totalPages: 1,
        }),
      ),
    )
    await expect(request(NftPage, { url: '/nfts' })).rejects.toMatchObject({ code: 'UNKNOWN' })
  })
})

describe('error helpers', () => {
  it('flags transient failures as retryable and business errors as final', () => {
    expect(isRetryable(new ApiError({ status: null, code: 'NETWORK', message: '' }))).toBe(true)
    expect(isRetryable(new ApiError({ status: null, code: 'TIMEOUT', message: '' }))).toBe(true)
    expect(isRetryable(new ApiError({ status: 503, code: 'TRANSIENT', message: '' }))).toBe(true)
    expect(isRetryable(new ApiError({ status: 500, code: 'UNKNOWN', message: '' }))).toBe(true)
    expect(
      isRetryable(new ApiError({ status: 409, code: 'AVAILABILITY_CONFLICT', message: '' })),
    ).toBe(false)
    expect(isRetryable(new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: '' }))).toBe(
      false,
    )
    expect(isRetryable(new Error('boom'))).toBe(false)
  })
})

describe('local session and guest id', () => {
  it('round-trips the stored session and survives corrupt storage', () => {
    setStoredSession({ token: 't', userId: 'u', expiresAt: '2030-01-01T00:00:00.000Z' })
    expect(getStoredSession()).toEqual({
      token: 't',
      userId: 'u',
      expiresAt: '2030-01-01T00:00:00.000Z',
    })
    localStorage.setItem('kurio:session', '{not json')
    expect(getStoredSession()).toBeNull()
  })

  it('keeps a stable guest id until rotated', () => {
    const a = getGuestId()
    expect(getGuestId()).toBe(a)
    const b = rotateGuestId()
    expect(b).not.toBe(a)
    expect(getGuestId()).toBe(b)
  })
})

describe('query keys', () => {
  it('scopes every private key under private + owner', () => {
    const req = { network: 'ethereum' as const }
    for (const key of [
      qk.favorites('usr_ana'),
      qk.cart('user:usr_ana'),
      qk.quote('user:usr_ana', req),
      qk.order('usr_ana', 'ord_1'),
      qk.profile('usr_ana'),
      qk.wallets('usr_ana'),
    ]) {
      expect(key.slice(0, 1)).toEqual(['private'])
      expect(String(key[1])).toMatch(/usr_ana/)
    }
    expect(qk.nfts.list({ page: 1 } as never).slice(0, 1)).toEqual(qk.nfts.all)
  })
})

describe('cancellation', () => {
  it('passes aborted requests through untouched', async () => {
    const controller = new AbortController()
    controller.abort()
    const err = await request(NftPage, { url: '/nfts', signal: controller.signal }).catch(
      (e: unknown) => e,
    )
    expect(isApiError(err)).toBe(false)
  })
})
