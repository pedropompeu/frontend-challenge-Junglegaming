import type { Order } from '@/contracts'
import { mulberry32 } from '../db/prng'
import { adjustStock } from '../db/nfts'
import type { OrderRecord } from '../db/schema'
import { getDb, mutate, now } from '../db/store'
import { getScenarioConfig } from '../scenarios/runtime'
import { emitOrderUpdated } from './bus'

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const DECLINE_REASON = 'Pagamento recusado pela carteira'

function hashSeed(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Hash de transação determinístico por pedido (0x + 64 hex). */
export function txHashFor(orderId: string): string {
  const rand = mulberry32(hashSeed(orderId))
  let hex = ''
  while (hex.length < 64) hex += Math.floor(rand() * 0x100000000).toString(16).padStart(8, '0')
  return `0x${hex.slice(0, 64)}`
}

export function toOrder(rec: OrderRecord): Order {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { idempotencyKey, settleAt, scheduledStatus, ...order } = rec
  return order
}

function arm(orderId: string, delayMs: number, status: 'confirmed' | 'declined'): void {
  clearTimeout(timers.get(orderId))
  timers.set(
    orderId,
    setTimeout(() => {
      timers.delete(orderId)
      settleOrder(orderId, status)
    }, Math.max(0, delayMs)),
  )
}

/** Agenda a liquidação conforme o `settle` do cenário ativo ('manual' não agenda). */
export function scheduleSettlement(order: OrderRecord): void {
  const settle = getScenarioConfig().settle
  if (!settle || settle === 'manual' || order.status !== 'pending') return
  const at = now().getTime() + settle.afterMs
  mutate(() => {
    order.settleAt = new Date(at).toISOString()
    order.scheduledStatus = settle.status
  })
  arm(order.id, settle.afterMs, settle.status)
}

/** Reagenda os pedidos pendentes pelo tempo restante (boot após refresh). */
export function resumeSettlements(): void {
  for (const o of getDb().orders) {
    if (o.status !== 'pending' || !o.settleAt || !o.scheduledStatus) continue
    arm(o.id, Date.parse(o.settleAt) - now().getTime(), o.scheduledStatus)
  }
}

export function cancelSettlements(): void {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
}

/** Leva o pedido a um estado terminal. Pedido terminal não muda mais (idempotente). */
export function settleOrder(orderId: string, status: 'confirmed' | 'declined'): void {
  const order = getDb().orders.find((o) => o.id === orderId)
  if (!order || order.status !== 'pending') return
  clearTimeout(timers.get(orderId))
  timers.delete(orderId)

  if (status === 'declined') {
    adjustStock(order.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, delta: l.quantity })))
  }
  mutate((db) => {
    order.status = status
    order.settledAt = now().toISOString()
    order.version += 1
    order.settleAt = null
    order.scheduledStatus = null
    if (status === 'confirmed') {
      order.txHash = txHashFor(order.id)
      order.explorerUrl = `/explorador/tx/${order.txHash}`
      const cart = db.carts[`user:${order.userId}`]
      if (cart) {
        for (const line of order.lines) {
          const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
          if (item) item.quantity -= line.quantity
        }
        cart.items = cart.items.filter((i) => i.quantity > 0)
        cart.version += 1
        cart.updatedAt = now().toISOString()
      }
    } else {
      order.declineReason = DECLINE_REASON
    }
  })
  emitOrderUpdated(toOrder(order))
}
