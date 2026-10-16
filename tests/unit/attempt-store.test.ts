// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { CreateOrderBody, Quote } from '@/contracts'
import {
  bindAttempt,
  clearAttempt,
  getOrCreateAttempt,
  peekAttempt,
  resumableAttempt,
} from '@/features/checkout/attempt-store'

const p: CreateOrderBody = {
  quoteId: 'qte_1',
  walletSessionId: 'wss_1',
  buyer: { displayName: 'Ana Souza', email: 'ana@kurio.test' },
}

const quote: Quote = {
  id: 'qte_1',
  cartVersion: 3,
  network: 'ethereum',
  lines: [
    {
      cartItemId: 'cit_1',
      nftId: 'nft_neon-vessel',
      editionId: 'ed_1',
      name: 'Neon Vessel',
      editionKind: '1/10',
      quantity: 1,
      unitPrice: '0.5',
      lineTotal: '0.5',
    },
  ],
  subtotal: '0.5',
  discount: '0',
  coupon: null,
  networkFee: '0.002',
  total: '0.502',
  createdAt: '2026-10-16T12:00:00.000Z',
  expiresAt: '2026-10-16T12:10:00.000Z',
}

describe('attempt-store', () => {
  beforeEach(() => sessionStorage.clear())

  it('reuses key for same quote and payload', () => {
    const a = getOrCreateAttempt('u', 'q1', p)
    expect(getOrCreateAttempt('u', 'q1', p).idempotencyKey).toBe(a.idempotencyKey)
  })

  it('new key when quote changes', () => {
    const a = getOrCreateAttempt('u', 'q1', p)
    expect(getOrCreateAttempt('u', 'q2', p).idempotencyKey).not.toBe(a.idempotencyKey)
  })

  it('new key when the payload changes', () => {
    const a = getOrCreateAttempt('u', 'q1', p)
    const b = getOrCreateAttempt('u', 'q1', { ...p, buyer: { ...p.buyer, note: 'Presente' } })
    expect(b.idempotencyKey).not.toBe(a.idempotencyKey)
    expect(b.payloadHash).not.toBe(a.payloadHash)
  })

  it('payload hash ignores key order', () => {
    const a = getOrCreateAttempt('u', 'q1', p)
    const reordered: CreateOrderBody = {
      buyer: { email: 'ana@kurio.test', displayName: 'Ana Souza' },
      walletSessionId: 'wss_1',
      quoteId: 'qte_1',
    }
    expect(getOrCreateAttempt('u', 'q1', reordered).idempotencyKey).toBe(a.idempotencyKey)
  })

  it('persists the attempt in sessionStorage per user (survives a reload)', () => {
    const a = getOrCreateAttempt('u', 'q1', p)
    expect(sessionStorage.getItem('kurio:checkout-attempt:u')).toContain(a.idempotencyKey)
    expect(peekAttempt('u')?.idempotencyKey).toBe(a.idempotencyKey)
    expect(getOrCreateAttempt('other', 'q1', p).idempotencyKey).not.toBe(a.idempotencyKey)
  })

  it('clearAttempt forgets the key', () => {
    const a = getOrCreateAttempt('u', 'q1', p)
    clearAttempt('u')
    expect(peekAttempt('u')).toBeNull()
    expect(getOrCreateAttempt('u', 'q1', p).idempotencyKey).not.toBe(a.idempotencyKey)
  })

  it('bindAttempt records the order answered for the key without changing it', () => {
    const a = getOrCreateAttempt('u', 'q1', p)
    bindAttempt('u', 'ord_1')
    expect(peekAttempt('u')).toMatchObject({ idempotencyKey: a.idempotencyKey, orderId: 'ord_1' })
    expect(getOrCreateAttempt('u', 'q1', p).idempotencyKey).toBe(a.idempotencyKey)
  })

  it('persists the body and the sent quote before the POST, so a reload can resend them', () => {
    const a = getOrCreateAttempt('u', 'qte_1', p, quote)
    expect(resumableAttempt('u')).toEqual({ idempotencyKey: a.idempotencyKey, body: p, quote })
  })

  it('an answered attempt is no longer resumable', () => {
    getOrCreateAttempt('u', 'qte_1', p, quote)
    bindAttempt('u', 'ord_1')
    expect(resumableAttempt('u')).toBeNull()
  })

  it('an attempt stored without body is not resumable', () => {
    sessionStorage.setItem(
      'kurio:checkout-attempt:u',
      JSON.stringify({ idempotencyKey: 'k', quoteId: 'qte_1', payloadHash: 'h' }),
    )
    expect(peekAttempt('u')?.idempotencyKey).toBe('k')
    expect(resumableAttempt('u')).toBeNull()
  })
})
