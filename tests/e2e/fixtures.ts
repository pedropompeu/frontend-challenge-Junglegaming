import { test as base, expect, type Page } from '@playwright/test'
import type { RealtimeEvent } from '../../src/contracts'
import type { KurioMocksControl } from '../../src/mocks/control'

export const test = base
export { expect }

type FailNextOpts = Parameters<KurioMocksControl['failNext']>[1]

/** Acesso tipado ao controle do backend simulado (`window.__kurioMocks`) na página. */
export function mocks(page: Page) {
  const ready = () => page.waitForFunction(() => Boolean(window.__kurioMocks))
  return {
    /** Troca o cenário (ou mantém o atual), recria o banco simulado e recarrega a página. */
    async reset(scenario?: Parameters<KurioMocksControl['reset']>[0]) {
      await ready()
      await Promise.all([
        page.waitForEvent('load'),
        page.evaluate((s) => void window.__kurioMocks!.reset(s), scenario),
      ])
    },
    async getScenario() {
      await ready()
      return page.evaluate(() => window.__kurioMocks!.getScenario())
    },
    async failNext(endpoint: Parameters<KurioMocksControl['failNext']>[0], opts?: FailNextOpts) {
      await ready()
      await page.evaluate(([e, o]) => window.__kurioMocks!.failNext(e, o), [
        endpoint,
        opts,
      ] as const)
    },
    async mutateNft(nftId: string, patch: Parameters<KurioMocksControl['mutateNft']>[1]) {
      await ready()
      await page.evaluate(([id, p]) => void window.__kurioMocks!.mutateNft(id, p), [
        nftId,
        patch,
      ] as const)
    },
    async expireSession() {
      await ready()
      await page.evaluate(() => window.__kurioMocks!.expireSession())
    },
    async dropSocket(opts?: { holdMs?: number }) {
      await ready()
      await page.evaluate((o) => window.__kurioMocks!.dropSocket(o), opts)
    },
    async connections() {
      await ready()
      return page.evaluate(() => window.__kurioMocks!.connections())
    },
    async setLatency(v: Parameters<KurioMocksControl['setLatency']>[0]) {
      await ready()
      await page.evaluate((x) => window.__kurioMocks!.setLatency(x), v)
    },
    /** A "extensão" desconecta a carteira: sessões invalidadas no servidor + aviso do provedor. */
    async disconnectWallet() {
      await ready()
      await page.evaluate(() => window.__kurioMocks!.disconnectWallet())
    },
    /** Liquida o pedido no servidor simulado (emite `order.updated` para quem estiver conectado). */
    async settleOrder(orderId: string, status: 'confirmed' | 'declined') {
      await ready()
      await page.evaluate(([id, s]) => window.__kurioMocks!.settleOrder(id, s), [
        orderId,
        status,
      ] as const)
    },
    /** Reenvia um evento já emitido (mesmo `eventId` e versão). */
    async emitDuplicate(eventId: string) {
      await ready()
      await page.evaluate((id) => window.__kurioMocks!.emitDuplicate(id), eventId)
    },
    /** Reenvia o `nft.updated` anterior ao último do NFT (versão velha). */
    async emitStale(nftId: string) {
      await ready()
      await page.evaluate((id) => window.__kurioMocks!.emitStale(id), nftId)
    },
    async events(): Promise<RealtimeEvent[]> {
      await ready()
      return page.evaluate(() => window.__kurioMocks!.events())
    },
    /** Pedidos gravados no banco simulado (a verdade do servidor, não o que a tela mostra). */
    async orders(): Promise<
      Array<{
        id: string
        status: string
        idempotencyKey: string
        txHash: string | null
        explorerUrl: string | null
      }>
    > {
      return page.evaluate(() => {
        const raw = localStorage.getItem('kurio:mockdb:v1')
        return raw ? (JSON.parse(raw) as { orders: [] }).orders : []
      })
    },
  }
}

export const DEMO_PASSWORD = 'Kurio@123'

/** Preenche o formulário de login já aberto (`/entrar`, modal no desktop ou tela cheia no mobile). */
export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

export function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 768
}
