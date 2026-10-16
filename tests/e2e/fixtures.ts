import { test as base, expect, type Page } from '@playwright/test'
import type { KurioMocksControl } from '../../src/mocks/control'

export const test = base
export { expect }

type FailNextOpts = Parameters<KurioMocksControl['failNext']>[1]

/** Acesso tipado ao controle do backend simulado (`window.__kurioMocks`) na página. */
export function mocks(page: Page) {
  const ready = () => page.waitForFunction(() => Boolean(window.__kurioMocks))
  return {
    async failNext(endpoint: Parameters<KurioMocksControl['failNext']>[0], opts?: FailNextOpts) {
      await ready()
      await page.evaluate(([e, o]) => window.__kurioMocks!.failNext(e, o), [
        endpoint,
        opts,
      ] as const)
    },
  }
}

export function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1440) < 768
}
