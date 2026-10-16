// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Order, OrderUpdatedEvent } from '@/contracts'
import { bindAttempt, getOrCreateAttempt, peekAttempt } from '@/features/checkout/attempt-store'
import { loadDraft, saveDraftNow } from '@/features/checkout/draft-store'
import { loadPendingOrder, savePendingOrder } from '@/features/orders/pending-order'
import { applyOrderUpdate } from '@/features/realtime/apply-order-update'
import { qk } from '@/shared/lib/query-keys'

const USER = 'usr_ana'

const order: Order = {
  id: 'ord_1',
  userId: USER,
  status: 'pending',
  quoteId: 'qte_1',
  lines: [],
  subtotal: '1.2',
  discount: '0',
  coupon: null,
  networkFee: '0.012',
  total: '1.212',
  network: 'ethereum',
  wallet: { label: 'Carteira principal', address: '0xabc', provider: 'metamask' },
  buyer: { displayName: 'Ana Souza', email: 'ana@kurio.test' },
  txHash: null,
  explorerUrl: null,
  declineReason: null,
  createdAt: '2026-10-16T12:00:00.000Z',
  settledAt: null,
  version: 1,
}

function event(next: Partial<Order>, userId = USER): OrderUpdatedEvent {
  const payload = { ...order, ...next, userId }
  return {
    eventId: `evt_${payload.version}_${payload.status}`,
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: payload.version,
    userId,
    occurredAt: '2026-10-16T12:00:03.000Z',
    payload: { order: payload },
  }
}

const cached = (qc: QueryClient) => qc.getQueryData<Order>(qk.order(USER, order.id))

describe('applyOrderUpdate', () => {
  let qc: QueryClient
  beforeEach(() => {
    qc = new QueryClient()
    qc.setQueryData(qk.order(USER, order.id), order)
    localStorage.clear()
    sessionStorage.clear()
  })

  it('ignores order events of another user', () => {
    const applied = applyOrderUpdate(qc, event({ status: 'confirmed', version: 2 }, 'usr_bruno'), {
      userId: USER,
    })
    expect(applied).toBe(false)
    expect(cached(qc)?.status).toBe('pending')
  })

  it('never regresses terminal status', () => {
    applyOrderUpdate(qc, event({ status: 'confirmed', version: 2 }), { userId: USER })
    expect(cached(qc)?.status).toBe('confirmed')
    // Mesmo com versão maior, um terminal não volta nem troca de terminal.
    applyOrderUpdate(qc, event({ status: 'pending', version: 3 }), { userId: USER })
    applyOrderUpdate(qc, event({ status: 'declined', version: 4 }), { userId: USER })
    expect(cached(qc)?.status).toBe('confirmed')
  })

  it('ignores old versions', () => {
    qc.setQueryData(qk.order(USER, order.id), { ...order, version: 5 })
    applyOrderUpdate(qc, event({ status: 'confirmed', version: 4 }), { userId: USER })
    expect(cached(qc)?.status).toBe('pending')
  })

  it('on confirmed clears attempt, draft and pending order', () => {
    getOrCreateAttempt(USER, 'qte_1', {
      quoteId: 'qte_1',
      walletSessionId: 'wss_1',
      buyer: order.buyer,
    })
    bindAttempt(USER, order.id)
    saveDraftNow(USER, { note: 'x' })
    savePendingOrder(USER, order.id)
    applyOrderUpdate(qc, event({ status: 'confirmed', version: 2 }), { userId: USER })
    expect(peekAttempt(USER)).toBeNull()
    expect(loadDraft(USER)).toBeNull()
    expect(loadPendingOrder(USER)).toBeNull()
  })

  it('on declined keeps the draft but clears attempt and pending order', () => {
    getOrCreateAttempt(USER, 'qte_1', {
      quoteId: 'qte_1',
      walletSessionId: 'wss_1',
      buyer: order.buyer,
    })
    bindAttempt(USER, order.id)
    saveDraftNow(USER, { note: 'x' })
    savePendingOrder(USER, order.id)
    applyOrderUpdate(qc, event({ status: 'declined', version: 2 }), { userId: USER })
    expect(cached(qc)?.status).toBe('declined')
    expect(peekAttempt(USER)).toBeNull()
    expect(loadDraft(USER)).not.toBeNull()
    expect(loadPendingOrder(USER)).toBeNull()
  })

  it('keeps an unanswered attempt so the retry reuses the same key', () => {
    // Timeout: o pedido foi criado e liquidou, mas a resposta nunca chegou ao cliente.
    const attempt = getOrCreateAttempt(USER, 'qte_1', {
      quoteId: 'qte_1',
      walletSessionId: 'wss_1',
      buyer: order.buyer,
    })
    applyOrderUpdate(qc, event({ status: 'confirmed', version: 2 }), { userId: USER })
    expect(peekAttempt(USER)?.idempotencyKey).toBe(attempt.idempotencyKey)
  })

  it('keeps the attempt of another order', () => {
    getOrCreateAttempt(USER, 'qte_1', {
      quoteId: 'qte_1',
      walletSessionId: 'wss_1',
      buyer: order.buyer,
    })
    bindAttempt(USER, 'ord_other')
    applyOrderUpdate(qc, event({ status: 'declined', version: 2 }), { userId: USER })
    expect(peekAttempt(USER)?.orderId).toBe('ord_other')
  })
})
