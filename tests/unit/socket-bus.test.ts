// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { RealtimeEventSchema, type Order, type RealtimeEvent } from '@/contracts'
import { getDb, resetDb } from '@/mocks/db/store'
import { resetRuntime, setScenario } from '@/mocks/scenarios/runtime'
import { emitNftUpdated, emitOrderUpdated } from '@/mocks/socket/bus'
import {
  broadcast,
  closeConnectionsForToken,
  connectionCount,
  dropAll,
  isRefusing,
  registerConnection,
  resetSocketServer,
} from '@/mocks/socket/server'

type Sent = { conn: string; type: string; event: RealtimeEvent }

let sent: Sent[]
let closed: string[]

function fakeConnection(name: string, userId: string | null, token: string | null = null) {
  return registerConnection({
    userId,
    token,
    send: (type, event) => sent.push({ conn: name, type, event }),
    close: () => closed.push(name),
  })
}

const sentTo = (name: string) => sent.filter((s) => s.conn === name)

function orderFor(userId: string): Order {
  return {
    id: `ord_${userId}`,
    userId,
    status: 'pending',
    version: 1,
    lines: [],
    network: 'ethereum',
    subtotal: '0',
    discount: '0',
    networkFee: '0',
    total: '0',
    couponCode: null,
    walletAddress: '0x0000000000000000000000000000000000000000',
    txHash: null,
    failureReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Order
}

beforeEach(async () => {
  localStorage.clear()
  resetRuntime()
  setScenario('default')
  await resetDb('default')
  resetSocketServer()
  sent = []
  closed = []
})

describe('socket bus envelope', () => {
  it('event envelope carries stable id, resource and version', () => {
    const nft = getDb().nfts[0]!
    const e = emitNftUpdated(nft)
    expect(e).toMatchObject({
      type: 'nft.updated',
      resource: { type: 'nft', id: nft.id },
      version: nft.version,
    })
    expect(e.eventId).toMatch(/^evt_/)
    expect(RealtimeEventSchema.parse(e)).toBeTruthy()
    expect(getDb().eventLog.at(-1)?.eventId).toBe(e.eventId)
  })
})

describe('socket server routing', () => {
  it('nft events reach every connection, including anonymous ones', () => {
    fakeConnection('ana', 'usr_ana')
    fakeConnection('anon', null)
    emitNftUpdated(getDb().nfts[0]!)
    expect(sentTo('ana').map((s) => s.type)).toEqual(['nft.updated'])
    expect(sentTo('anon').map((s) => s.type)).toEqual(['nft.updated'])
  })

  it('order events are routed only to owner', () => {
    fakeConnection('ana', 'usr_ana')
    fakeConnection('bruno', 'usr_bruno')
    fakeConnection('anon', null)
    emitOrderUpdated(orderFor('usr_ana'))
    expect(sentTo('ana')).toHaveLength(1)
    expect(sentTo('ana')[0]!.type).toBe('order.updated')
    expect(sentTo('bruno')).toHaveLength(0)
    expect(sentTo('anon')).toHaveLength(0)
  })

  it('broadcast re-sends an existing event with the same eventId without logging it again', () => {
    fakeConnection('ana', 'usr_ana')
    const e = emitNftUpdated(getDb().nfts[0]!)
    const logSize = getDb().eventLog.length
    broadcast(e)
    expect(sentTo('ana').map((s) => s.event.eventId)).toEqual([e.eventId, e.eventId])
    expect(getDb().eventLog).toHaveLength(logSize)
  })

  it('dropAll closes every connection and refuses new ones until holdMs elapses', () => {
    fakeConnection('ana', 'usr_ana')
    fakeConnection('anon', null)
    const t0 = Date.now()
    dropAll({ holdMs: 2000 }, t0)
    expect(closed.sort()).toEqual(['ana', 'anon'])
    expect(connectionCount()).toBe(0)
    expect(isRefusing(t0 + 1999)).toBe(true)
    expect(isRefusing(t0 + 2000)).toBe(false)
  })

  it('logout closes only the connections opened with that token', () => {
    fakeConnection('ana-1', 'usr_ana', 'tok_a')
    fakeConnection('ana-2', 'usr_ana', 'tok_b')
    closeConnectionsForToken('tok_a')
    expect(closed).toEqual(['ana-1'])
    expect(connectionCount()).toBe(1)
  })

  it('a closed connection stops receiving events', () => {
    const id = fakeConnection('ana', 'usr_ana')
    expect(typeof id).toBe('string')
    closeConnectionsForToken(null)
    dropAll({ holdMs: 0 })
    emitNftUpdated(getDb().nfts[0]!)
    expect(sentTo('ana')).toHaveLength(0)
  })
})
