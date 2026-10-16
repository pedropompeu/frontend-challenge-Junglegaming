import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { RealtimeEvent } from '@/contracts'
import { getDb, now } from '../db/store'
import { getScenarioConfig } from '../scenarios/runtime'
import { subscribe } from './bus'

/** O binding anuncia `pingInterval` de 25s; sem ping o cliente derruba a conexão em ~30s. */
const PING_EVERY_MS = 20_000

export type SocketConnection = {
  userId: string | null
  token: string | null
  send(type: RealtimeEvent['type'], event: RealtimeEvent): void
  close(): void
}

const connections = new Map<string, SocketConnection>()
let seq = 0
let refuseUntil = 0
let unsubscribe: (() => void) | null = null

/** Roteia um evento: `nft.updated` vai a todos; `order.updated`, só às conexões do dono. */
export function broadcast(event: RealtimeEvent): void {
  for (const conn of [...connections.values()]) {
    if (event.type === 'order.updated' && conn.userId !== event.userId) continue
    conn.send(event.type, event)
  }
}

function ensureSubscribed(): void {
  unsubscribe ??= subscribe(broadcast)
}

export function registerConnection(conn: SocketConnection): string {
  ensureSubscribed()
  seq += 1
  const id = `conn_${seq}`
  connections.set(id, conn)
  return id
}

export function unregisterConnection(id: string): void {
  connections.delete(id)
}

export function connectionCount(): number {
  return connections.size
}

function closeWhere(match: (conn: SocketConnection) => boolean): void {
  for (const [id, conn] of [...connections]) {
    if (!match(conn)) continue
    connections.delete(id)
    conn.close()
  }
}

/** Derruba todas as conexões e recusa reconexões por `holdMs` (queda simulada do servidor). */
export function dropAll(opts: { holdMs?: number } = {}, at: number = Date.now()): void {
  refuseUntil = at + (opts.holdMs ?? 0)
  closeWhere(() => true)
}

export function isRefusing(at: number = Date.now()): boolean {
  return at < refuseUntil
}

/** Logout: encerra as conexões abertas com esse token. */
export function closeConnectionsForToken(token: string | null): void {
  if (!token) return
  closeWhere((conn) => conn.token === token)
}

export function resetSocketServer(): void {
  closeWhere(() => true)
  refuseUntil = 0
}

function userIdForToken(token: string | null): string | null {
  if (!token) return null
  const session = getDb().sessions.find((s) => s.token === token)
  if (!session || Date.parse(session.expiresAt) <= now().getTime()) return null
  return session.userId
}

/**
 * Servidor Socket.IO simulado. Só o transporte WebSocket é interceptado (sem long-polling),
 * por isso o cliente precisa conectar com `transports: ['websocket']`.
 *
 * O MSW remove o prefixo `/socket.io/` da URL antes de casar o padrão, então o link aponta
 * para a origem; outros WebSockets dela (ex.: HMR do Vite) seguem direto para o servidor real.
 */
export function createSocketHandler(origin: string) {
  const link = ws.link(origin.replace(/^http/, 'ws'))
  return link.addEventListener('connection', (connection) => {
    const { client } = connection
    if (!client.url.pathname.startsWith('/socket.io/')) {
      connection.server.connect()
      return
    }
    if (getScenarioConfig().offline || isRefusing()) {
      client.close(4503, 'unavailable')
      return
    }
    const token = client.url.searchParams.get('token')
    const io = toSocketIo(connection)
    const ping = setInterval(() => client.send('2'), PING_EVERY_MS)
    const id = registerConnection({
      userId: userIdForToken(token),
      token,
      send: (type, event) => io.client.emit(type, event),
      close: () => {
        clearInterval(ping)
        client.close(4000, 'server disconnect')
      },
    })
    client.addEventListener('close', () => {
      clearInterval(ping)
      unregisterConnection(id)
    })
  })
}
