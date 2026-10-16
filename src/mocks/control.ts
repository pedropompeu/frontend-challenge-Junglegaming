import type { ApiErrorCode, NftUpdatedEvent, RealtimeEvent } from '@/contracts'
import { emitWalletProviderEvent } from '@/shared/lib/wallet-provider'
import { recentEvents } from './db/events-log'
import { mutateNft, type NftPatch } from './db/nfts'
import { getDb, mutate, now, resetDb } from './db/store'
import { disconnectAllWalletSessions } from './handlers/wallet-sessions'
import type { ScenarioName } from './scenarios/names'
import type { EndpointId } from './scenarios/scenarios'
import { failNext, getScenario, setLatencyOverride, setScenario } from './scenarios/runtime'
import { cancelSettlements, settleOrder } from './socket/settlement'
import { broadcast, dropAll, listConnections, resetSocketServer } from './socket/server'

export interface KurioMocksControl {
  reset(scenario?: ScenarioName): Promise<void>
  getScenario(): ScenarioName
  setLatency(v: number | { min: number; max: number } | null): void
  failNext(
    endpoint: EndpointId,
    opts?: { status?: number; code?: ApiErrorCode; times?: number; networkError?: boolean },
  ): void
  mutateNft(nftId: string, patch: NftPatch): NftUpdatedEvent
  settleOrder(orderId: string, status: 'confirmed' | 'declined'): void
  expireSession(): void
  dropSocket(opts?: { holdMs?: number }): void
  connections(): Array<{ userId: string | null }>
  emitDuplicate(eventId: string): void
  emitStale(nftId: string): void
  disconnectWallet(): void
  events(): RealtimeEvent[]
}

declare global {
  interface Window {
    __kurioMocks?: KurioMocksControl
  }
}

/** Reenvia um evento já emitido pelo servidor Socket.IO simulado (mesmo `eventId` e versão). */
function resend(event: RealtimeEvent | undefined, what: string): void {
  if (!event) throw new Error(`Nenhum evento encontrado para ${what}`)
  broadcast(event)
}

export function createControl(): KurioMocksControl {
  return {
    async reset(scenario) {
      const name = scenario ?? getScenario()
      cancelSettlements()
      resetSocketServer()
      setScenario(name)
      await resetDb(name)
      // `?scenario=` na URL venceria o cenário recém-escolhido na recarga.
      const url = new URL(location.href)
      url.searchParams.delete('scenario')
      history.replaceState(history.state, '', url)
      location.reload()
    },
    getScenario,
    setLatency: setLatencyOverride,
    failNext: (endpoint, opts) => failNext(endpoint, opts),
    mutateNft,
    settleOrder,
    expireSession() {
      const past = new Date(now().getTime() - 1000).toISOString()
      mutate((db) => {
        for (const s of db.sessions) s.expiresAt = past
      })
    },
    dropSocket: (opts) => dropAll(opts),
    connections: listConnections,
    emitDuplicate(eventId) {
      resend(
        getDb().eventLog.find((e) => e.eventId === eventId),
        `eventId ${eventId}`,
      )
    },
    emitStale(nftId) {
      const updates = getDb().eventLog.filter(
        (e) => e.type === 'nft.updated' && e.resource.id === nftId,
      )
      resend(updates.at(-2), `nft.updated anterior de ${nftId}`)
    },
    disconnectWallet() {
      // A extensão desconecta: o servidor invalida as sessões e a página recebe o aviso do provedor.
      disconnectAllWalletSessions()
      emitWalletProviderEvent({ type: 'disconnect' })
    },
    events: () => recentEvents(200),
  }
}

export function installControl(): void {
  window.__kurioMocks = createControl()
}
