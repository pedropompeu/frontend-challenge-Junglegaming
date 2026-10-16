// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { CreateOrderBody } from '@/contracts'
import {
  bindAttempt,
  clearAttempt,
  getOrCreateAttempt,
  peekAttempt,
} from '@/features/checkout/attempt-store'

const p: CreateOrderBody = {
  quoteId: 'qte_1',
  walletSessionId: 'wss_1',
  buyer: { displayName: 'Ana Souza', email: 'ana@kurio.test' },
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
})
