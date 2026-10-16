import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, RealtimeEvent } from '@/contracts'
import { appendEvent } from '../db/events-log'
import { nextId, now } from '../db/store'

type Listener = (event: RealtimeEvent) => void

const listeners = new Set<Listener>()

/** Barramento interno do backend simulado: o servidor Socket.IO (T8) assina e repassa aos clientes. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function publish(event: RealtimeEvent): void {
  appendEvent(event)
  for (const fn of [...listeners]) fn(event)
}

export function emitNftUpdated(nft: Nft): NftUpdatedEvent {
  const event: NftUpdatedEvent = {
    eventId: nextId('evt'),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: now().toISOString(),
    payload: { editions: structuredClone(nft.editions) },
  }
  publish(event)
  return event
}

export function emitOrderUpdated(order: Order): OrderUpdatedEvent {
  const event: OrderUpdatedEvent = {
    eventId: nextId('evt'),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    userId: order.userId,
    occurredAt: now().toISOString(),
    payload: { order: structuredClone(order) },
  }
  publish(event)
  return event
}
