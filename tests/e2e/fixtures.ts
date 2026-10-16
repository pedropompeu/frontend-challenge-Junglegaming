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
    async expireSession() {
      await ready()
      await page.evaluate(() => window.__kurioMocks!.expireSession())
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
