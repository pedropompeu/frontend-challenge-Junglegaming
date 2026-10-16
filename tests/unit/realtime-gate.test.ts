import { describe, expect, it } from 'vitest'
import type { RealtimeEvent } from '@/contracts'
import { createEventGate } from '@/shared/lib/realtime-gate'

function ev(eventId: string, version: number, id = 'nft_a'): RealtimeEvent {
  return {
    eventId,
    type: 'nft.updated',
    resource: { type: 'nft', id },
    version,
    occurredAt: new Date().toISOString(),
    payload: { editions: [] },
  }
}

describe('realtime event gate', () => {
  it('gate drops duplicates and stale versions', () => {
    const g = createEventGate()
    expect(g.accept(ev('e1', 3))).toBe(true)
    expect(g.accept(ev('e1', 3))).toBe(false)
    expect(g.accept(ev('e2', 2))).toBe(false)
    expect(g.accept(ev('e2b', 3))).toBe(false)
    expect(g.accept(ev('e3', 4))).toBe(true)
  })

  it('tracks versions per resource', () => {
    const g = createEventGate()
    expect(g.accept(ev('e1', 5, 'nft_a'))).toBe(true)
    expect(g.accept(ev('e2', 1, 'nft_b'))).toBe(true)
  })

  it('forgets the oldest ids beyond the limit but still honours versions', () => {
    const g = createEventGate(2)
    g.accept(ev('e1', 1, 'nft_a'))
    g.accept(ev('e2', 1, 'nft_b'))
    g.accept(ev('e3', 1, 'nft_c'))
    // e1 saiu do conjunto de ids, mas a versão de nft_a continua barrando o replay.
    expect(g.accept(ev('e1', 1, 'nft_a'))).toBe(false)
  })

  it('reset clears ids and versions', () => {
    const g = createEventGate()
    g.accept(ev('e1', 3))
    g.reset()
    expect(g.accept(ev('e1', 3))).toBe(true)
  })
})
