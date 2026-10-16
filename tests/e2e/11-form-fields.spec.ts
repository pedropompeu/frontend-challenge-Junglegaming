import type { Page } from '@playwright/test'
import { openCheckout } from './checkout-helpers'
import { expect, test } from './fixtures'

/** Todo campo precisa de `id` ou `name`: sem eles o navegador não preenche nem associa rótulos. */
async function expectNamedFields(page: Page) {
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea')]
      .filter((el) => !el.id && !(el as HTMLInputElement).name)
      .map((el) => el.outerHTML.slice(0, 120)),
  )
  expect(unnamed).toEqual([])
}

test('public pages have no unnamed form fields', async ({ page }) => {
  for (const path of ['/', '/entrar', '/cadastro', '/nft/nft_neon-vessel', '/carrinho']) {
    await page.goto(path)
    // No desktop o acesso abre num modal e o `main` fica inerte atrás dele: basta estar montado.
    await expect(page.locator('main')).toBeAttached()
    await page.waitForLoadState('networkidle')
    await expectNamedFields(page)
  }
})

test('checkout, profile and wallets have no unnamed form fields', async ({ page }) => {
  await openCheckout(page)
  await expectNamedFields(page)
  await page.goto('/perfil')
  await expect(page.getByRole('main').getByLabel('Nome de exibição', { exact: true })).toHaveValue(
    'Ana Souza',
  )
  await expectNamedFields(page)
  await page.goto('/perfil/carteiras')
  await expect(page.getByRole('main').getByLabel('Apelido da carteira').first()).toBeVisible()
  await expectNamedFields(page)
})

test('robots.txt allows crawling', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toMatch(/text\/plain/)
  expect(await res.text()).toMatch(/^User-agent: \*$/m)
})
