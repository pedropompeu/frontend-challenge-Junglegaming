import type { Page } from '@playwright/test'
import type { Cart, EditionKind } from '../../../src/contracts'
import { EDITION_LABELS } from '../../../src/features/nft/editions'
import type { ScenarioName } from '../../../src/mocks/scenarios/names'
import { expect, login, mocks } from '../fixtures'

export { login, mocks }

/** Abre `path` já no cenário pedido: o backend simulado lê `?scenario=` ao subir. */
export async function gotoScenario(page: Page, path: string, scenario: ScenarioName) {
  const url = new URL(path, 'http://kurio.local')
  url.searchParams.set('scenario', scenario)
  await page.goto(`${url.pathname}${url.search}${url.hash}`)
}

/**
 * Detalhe → edição → quantidade → "Adicionar ao carrinho", esperando o 200 do servidor.
 * Sem `editionKind`, fica a edição que o detalhe seleciona sozinho.
 */
export async function addToCart(
  page: Page,
  nftId: string,
  editionKind?: EditionKind,
  qty = 1,
): Promise<Cart> {
  await page.goto(`/nft/${nftId}`)
  if (editionKind) {
    const edition = page
      .getByRole('group', { name: 'Edição:' })
      .getByRole('button', { name: EDITION_LABELS[editionKind], exact: true })
    await edition.click()
    await expect(edition).toHaveAttribute('aria-pressed', 'true')
  }
  for (let i = 1; i < qty; i += 1) {
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  }
  const added = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/cart/items'),
  )
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  const res = await added
  expect(res.status()).toBe(200)
  await expect(page.getByText(/adicionado ao carrinho/i).first()).toBeVisible()
  return (await res.json()) as Cart
}

/** Espera o Socket.IO simulado ter ao menos uma conexão aberta (indicador "ao vivo"). */
export async function waitForLive(page: Page) {
  await expect.poll(async () => (await mocks(page).connections()).length).toBeGreaterThan(0)
}
